-- V1 completion: contrôle de cohérence, indicateurs et vues de lecture.
-- À exécuter après 001_initial_schema.sql et 002_setup_hardening.sql.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

grant execute on function public.is_admin() to authenticated;

-- L'administrateur peut gérer les rôles et l'activation des profils.
grant update (full_name, role, active) on public.profiles to authenticated;

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Vérifie qu'une leçon appartient bien au programme de l'affectation.
create or replace function public.lesson_matches_assignment(p_assignment_id uuid, p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_assignments ta
    join public.programs pr
      on pr.school_year_id = ta.school_year_id
     and pr.class_id = ta.class_id
     and pr.subject_id = ta.subject_id
    join public.program_chapters pc on pc.program_id = pr.id
    join public.program_lessons pl on pl.chapter_id = pc.id
    where ta.id = p_assignment_id
      and pl.id = p_lesson_id
  );
$$;

grant execute on function public.lesson_matches_assignment(uuid, uuid) to authenticated;

create or replace function public.validate_lesson_progress_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.lesson_matches_assignment(new.assignment_id, new.lesson_id) then
    raise exception 'Lesson does not belong to assignment program';
  end if;
  return new;
end;
$$;

drop trigger if exists lesson_progress_validate_assignment on public.lesson_progress;
create trigger lesson_progress_validate_assignment
before insert or update on public.lesson_progress
for each row execute procedure public.validate_lesson_progress_assignment();

create or replace function public.validate_session_lessons()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.planned_lesson_id is not null
     and not public.lesson_matches_assignment(new.assignment_id, new.planned_lesson_id) then
    raise exception 'Planned lesson does not belong to assignment program';
  end if;

  if new.actual_lesson_id is not null
     and not public.lesson_matches_assignment(new.assignment_id, new.actual_lesson_id) then
    raise exception 'Actual lesson does not belong to assignment program';
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_validate_lessons on public.sessions;
create trigger sessions_validate_lessons
before insert or update on public.sessions
for each row execute procedure public.validate_session_lessons();

-- Détails des séances : la vue respecte la RLS de sessions grâce à security_invoker.
create or replace view public.v_session_details
with (security_invoker = true)
as
select
  s.id,
  s.assignment_id,
  s.scheduled_date,
  s.planned_start,
  s.planned_end,
  s.actual_start,
  s.actual_end,
  s.status,
  s.notes,
  s.planned_lesson_id,
  s.actual_lesson_id,
  ta.school_year_id,
  ta.teacher_id,
  ta.class_id,
  ta.subject_id,
  p.full_name as teacher_name,
  c.name as class_name,
  sub.name as subject_name,
  sub.code as subject_code,
  greatest(0, extract(epoch from (s.planned_end - s.planned_start)) / 60)::integer as planned_minutes,
  case when s.actual_start is not null and s.actual_end is not null
    then greatest(0, extract(epoch from (s.actual_end - s.actual_start)) / 60)::integer
    else 0 end as actual_minutes
from public.sessions s
join public.teacher_assignments ta on ta.id = s.assignment_id
join public.teachers t on t.id = ta.teacher_id
join public.profiles p on p.id = t.profile_id
join public.classes c on c.id = ta.class_id
join public.subjects sub on sub.id = ta.subject_id;

grant select on public.v_session_details to authenticated;

-- Couverture du programme par affectation.
create or replace view public.v_assignment_program_coverage
with (security_invoker = true)
as
select
  ta.id as assignment_id,
  ta.school_year_id,
  ta.teacher_id,
  ta.class_id,
  ta.subject_id,
  count(pl.id)::integer as lessons_total,
  count(pl.id) filter (where lp.status = 'completed')::integer as lessons_completed,
  count(pl.id) filter (where lp.status = 'in_progress')::integer as lessons_in_progress,
  case
    when count(pl.id) = 0 then 0::numeric
    else round(100.0 * count(pl.id) filter (where lp.status = 'completed') / count(pl.id), 1)
  end as program_coverage_pct
from public.teacher_assignments ta
join public.programs pr
  on pr.school_year_id = ta.school_year_id
 and pr.class_id = ta.class_id
 and pr.subject_id = ta.subject_id
join public.program_chapters pc on pc.program_id = pr.id
join public.program_lessons pl on pl.chapter_id = pc.id
left join public.lesson_progress lp
  on lp.assignment_id = ta.id
 and lp.lesson_id = pl.id
group by ta.id, ta.school_year_id, ta.teacher_id, ta.class_id, ta.subject_id;

grant select on public.v_assignment_program_coverage to authenticated;

-- Corrige les indicateurs globaux : les séances annulées par l'établissement
-- et reportées ne comptent pas dans l'assiduité ni dans le volume attendu.
create or replace view public.v_teacher_performance
with (security_invoker = true)
as
select
  t.id as teacher_id,
  p.full_name,
  ta.school_year_id,
  count(s.id) filter (where s.status not in ('cancelled_school', 'postponed')) as sessions_planned,
  count(s.id) filter (where s.status in ('done', 'partial')) as sessions_taught,
  coalesce(sum(case when s.status not in ('cancelled_school', 'postponed') then vsm.planned_minutes else 0 end), 0)::bigint as minutes_planned,
  coalesce(sum(vsm.actual_minutes), 0)::bigint as minutes_taught,
  case
    when coalesce(sum(case when s.status not in ('cancelled_school', 'postponed') then vsm.planned_minutes else 0 end), 0) = 0 then 0
    else round(
      100.0 * coalesce(sum(vsm.actual_minutes), 0)
      / nullif(sum(case when s.status not in ('cancelled_school', 'postponed') then vsm.planned_minutes else 0 end), 0), 1
    )
  end as hourly_coverage_pct,
  case
    when count(s.id) filter (where s.status not in ('cancelled_school', 'postponed')) = 0 then 0
    else round(
      100.0 * count(s.id) filter (where s.status in ('done', 'partial'))
      / nullif(count(s.id) filter (where s.status not in ('cancelled_school', 'postponed')), 0), 1
    )
  end as attendance_pct
from public.teachers t
join public.profiles p on p.id = t.profile_id
join public.teacher_assignments ta on ta.teacher_id = t.id
left join public.sessions s on s.assignment_id = ta.id
left join public.v_session_minutes vsm on vsm.id = s.id
group by t.id, p.full_name, ta.school_year_id;

grant select on public.v_teacher_performance to authenticated;

-- Index complémentaires pour la V1.
create index if not exists lesson_progress_assignment_status_idx
  on public.lesson_progress (assignment_id, status);
create index if not exists program_lessons_expected_date_idx
  on public.program_lessons (expected_date);
create index if not exists wall_comments_created_at_idx
  on public.wall_comments (created_at desc);

-- Sécurise les champs réservés aux responsables.
create or replace function public.guard_manager_only_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'wall_posts' then
    if new.pinned is distinct from old.pinned and not public.is_manager() then
      raise exception 'Only managers can pin publications';
    end if;
  elsif tg_table_name = 'sessions' then
    if new.status = 'cancelled_school' and new.status is distinct from old.status and not public.is_manager() then
      raise exception 'Only managers can mark a school cancellation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists wall_posts_guard_manager_fields on public.wall_posts;
create trigger wall_posts_guard_manager_fields
before update on public.wall_posts
for each row execute procedure public.guard_manager_only_changes();

drop trigger if exists sessions_guard_manager_fields on public.sessions;
create trigger sessions_guard_manager_fields
before update on public.sessions
for each row execute procedure public.guard_manager_only_changes();

-- Leçons attendues par affectation, utile aux rapports par période.
create or replace view public.v_assignment_program_lessons
with (security_invoker = true)
as
select
  ta.id as assignment_id,
  ta.teacher_id,
  ta.school_year_id,
  ta.class_id,
  ta.subject_id,
  pl.id as lesson_id,
  pl.title as lesson_title,
  pl.expected_date,
  pl.planned_minutes
from public.teacher_assignments ta
join public.programs pr
  on pr.school_year_id = ta.school_year_id
 and pr.class_id = ta.class_id
 and pr.subject_id = ta.subject_id
join public.program_chapters pc on pc.program_id = pr.id
join public.program_lessons pl on pl.chapter_id = pc.id;

grant select on public.v_assignment_program_lessons to authenticated;

create or replace function public.validate_lesson_expected_date()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  y_start date;
  y_end date;
begin
  if new.expected_date is null then return new; end if;
  select sy.starts_on, sy.ends_on into y_start, y_end
  from public.program_chapters pc
  join public.programs pr on pr.id = pc.program_id
  join public.school_years sy on sy.id = pr.school_year_id
  where pc.id = new.chapter_id;
  if y_start is null or new.expected_date < y_start or new.expected_date > y_end then
    raise exception 'Lesson expected date must be within the school year';
  end if;
  return new;
end;
$$;

drop trigger if exists program_lessons_validate_expected_date on public.program_lessons;
create trigger program_lessons_validate_expected_date
before insert or update on public.program_lessons
for each row execute procedure public.validate_lesson_expected_date();
