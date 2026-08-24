-- Suivi Pédagogique - Département Informatique
-- Migration initiale : comptes, planification, séances, programmes, absences et mur.

create extension if not exists pgcrypto;

-- -----------------------------
-- Types
-- -----------------------------
create type public.app_role as enum (
  'admin',
  'pedagogical_lead',
  'teacher',
  'management_viewer'
);

create type public.session_status as enum (
  'planned',
  'in_progress',
  'done',
  'partial',
  'missed',
  'postponed',
  'cancelled_school'
);

create type public.lesson_progress_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

create type public.absence_type as enum (
  'unjustified',
  'justified',
  'medical',
  'mission',
  'leave',
  'school_activity',
  'other'
);

create type public.post_category as enum (
  'announcement',
  'resource',
  'question',
  'pedagogy',
  'meeting',
  'information'
);

-- -----------------------------
-- Utilisateurs / enseignants
-- -----------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role public.app_role not null default 'teacher',
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null references public.profiles(id) on delete cascade,
  employee_code text unique,
  specialty text,
  phone text,
  created_at timestamptz not null default now()
);

-- -----------------------------
-- Référentiel scolaire
-- -----------------------------
create table public.school_years (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  constraint school_year_dates_check check (ends_on >= starts_on)
);

create unique index one_active_school_year
  on public.school_years (is_active)
  where is_active;

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  sequence_no integer not null default 1,
  constraint period_dates_check check (ends_on >= starts_on),
  unique (school_year_id, name)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  name text not null,
  level text,
  active boolean not null default true,
  unique (school_year_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text unique not null,
  active boolean not null default true
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  planned_weekly_minutes integer not null default 0 check (planned_weekly_minutes >= 0),
  unique (school_year_id, teacher_id, class_id, subject_id)
);

-- Fermetures officielles : jours fériés, examens, suspension de cours, etc.
create table public.school_closures (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text not null,
  constraint closure_dates_check check (ends_on >= starts_on)
);

-- -----------------------------
-- Emplois du temps
-- weekday : 1=lundi ... 7=dimanche (ISO)
-- -----------------------------
create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  effective_from date,
  effective_to date,
  room text,
  active boolean not null default true,
  constraint timetable_time_check check (end_time > start_time),
  constraint timetable_effective_dates_check check (
    effective_to is null or effective_from is null or effective_to >= effective_from
  )
);

-- -----------------------------
-- Programmes / leçons
-- -----------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  unique (school_year_id, class_id, subject_id)
);

create table public.program_chapters (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  title text not null,
  sequence_no integer not null,
  unique (program_id, sequence_no)
);

create table public.program_lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.program_chapters(id) on delete cascade,
  title text not null,
  sequence_no integer not null,
  expected_date date,
  planned_minutes integer check (planned_minutes is null or planned_minutes >= 0),
  unique (chapter_id, sequence_no)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  lesson_id uuid not null references public.program_lessons(id) on delete cascade,
  status public.lesson_progress_status not null default 'not_started',
  started_on date,
  completed_on date,
  notes text,
  updated_at timestamptz not null default now(),
  unique (assignment_id, lesson_id)
);

-- -----------------------------
-- Séances prévues / réalisées
-- -----------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  timetable_slot_id uuid references public.timetable_slots(id) on delete set null,
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  scheduled_date date not null,
  planned_start time not null,
  planned_end time not null,
  planned_lesson_id uuid references public.program_lessons(id) on delete set null,
  actual_start time,
  actual_end time,
  actual_lesson_id uuid references public.program_lessons(id) on delete set null,
  status public.session_status not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_planned_time_check check (planned_end > planned_start),
  constraint session_actual_time_check check (
    actual_end is null or actual_start is null or actual_end > actual_start
  ),
  unique (timetable_slot_id, scheduled_date)
);

create index sessions_assignment_date_idx on public.sessions (assignment_id, scheduled_date);
create index sessions_date_status_idx on public.sessions (scheduled_date, status);

-- -----------------------------
-- Absences
-- -----------------------------
create table public.absences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  absence_date date not null,
  type public.absence_type not null default 'other',
  reason text,
  justified boolean not null default false,
  document_path text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index absences_teacher_date_idx on public.absences (teacher_id, absence_date);

-- -----------------------------
-- Mur pédagogique
-- -----------------------------
create table public.wall_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category public.post_category not null default 'information',
  content text not null check (length(trim(content)) > 0),
  pinned boolean not null default false,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wall_posts_created_at_idx on public.wall_posts (created_at desc);

create table public.wall_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.wall_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wall_comments_post_idx on public.wall_comments (post_id, created_at);

-- -----------------------------
-- Helpers sécurité
-- -----------------------------
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid()) and active = true;
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'pedagogical_lead'), false);
$$;

create or replace function public.can_view_all()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'pedagogical_lead', 'management_viewer'), false);
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.can_view_all() to authenticated;

-- -----------------------------
-- Création automatique du profil Auth
-- -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'teacher'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------
-- Mise à jour automatique updated_at
-- -----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger lesson_progress_set_updated_at before update on public.lesson_progress
for each row execute procedure public.set_updated_at();

create trigger sessions_set_updated_at before update on public.sessions
for each row execute procedure public.set_updated_at();

create trigger wall_posts_set_updated_at before update on public.wall_posts
for each row execute procedure public.set_updated_at();

create trigger wall_comments_set_updated_at before update on public.wall_comments
for each row execute procedure public.set_updated_at();

-- -----------------------------
-- Génération automatique des séances depuis l'emploi du temps
-- -----------------------------
create or replace function public.generate_sessions(p_from date, p_to date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if not public.is_manager() then
    raise exception 'Permission denied';
  end if;

  if p_to < p_from then
    raise exception 'Invalid date range';
  end if;

  insert into public.sessions (
    timetable_slot_id,
    assignment_id,
    scheduled_date,
    planned_start,
    planned_end,
    status
  )
  select
    ts.id,
    ts.assignment_id,
    d::date,
    ts.start_time,
    ts.end_time,
    'planned'::public.session_status
  from generate_series(p_from, p_to, interval '1 day') as d
  join public.timetable_slots ts
    on ts.active = true
   and extract(isodow from d)::smallint = ts.weekday
   and (ts.effective_from is null or d::date >= ts.effective_from)
   and (ts.effective_to is null or d::date <= ts.effective_to)
  join public.teacher_assignments ta on ta.id = ts.assignment_id
  where not exists (
    select 1
    from public.school_closures sc
    where sc.school_year_id = ta.school_year_id
      and d::date between sc.starts_on and sc.ends_on
  )
  on conflict (timetable_slot_id, scheduled_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.generate_sessions(date, date) to authenticated;

-- -----------------------------
-- Row Level Security
-- -----------------------------
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.school_years enable row level security;
alter table public.periods enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.school_closures enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.programs enable row level security;
alter table public.program_chapters enable row level security;
alter table public.program_lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.sessions enable row level security;
alter table public.absences enable row level security;
alter table public.wall_posts enable row level security;
alter table public.wall_comments enable row level security;

-- Aucune table métier n'est publique sans authentification.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- Lecture des profils et du référentiel pour les membres connectés.
grant select on public.profiles, public.teachers, public.school_years, public.periods,
  public.classes, public.subjects, public.teacher_assignments, public.school_closures,
  public.timetable_slots, public.programs, public.program_chapters, public.program_lessons
  to authenticated;

create policy profiles_read_members on public.profiles
for select to authenticated
using (active = true or (select auth.uid()) = id or public.is_manager());

-- Politiques de lecture commune du référentiel.
create policy teachers_read_members on public.teachers for select to authenticated using (true);
create policy school_years_read_members on public.school_years for select to authenticated using (true);
create policy periods_read_members on public.periods for select to authenticated using (true);
create policy classes_read_members on public.classes for select to authenticated using (true);
create policy subjects_read_members on public.subjects for select to authenticated using (true);
create policy assignments_read_members on public.teacher_assignments for select to authenticated using (true);
create policy closures_read_members on public.school_closures for select to authenticated using (true);
create policy timetable_read_members on public.timetable_slots for select to authenticated using (true);
create policy programs_read_members on public.programs for select to authenticated using (true);
create policy chapters_read_members on public.program_chapters for select to authenticated using (true);
create policy lessons_read_members on public.program_lessons for select to authenticated using (true);

-- Les responsables pédagogiques administrent le référentiel.
grant insert, update, delete on public.teachers, public.school_years, public.periods,
  public.classes, public.subjects, public.teacher_assignments, public.school_closures,
  public.timetable_slots, public.programs, public.program_chapters, public.program_lessons
  to authenticated;

create policy teachers_manage on public.teachers for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy school_years_manage on public.school_years for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy periods_manage on public.periods for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy classes_manage on public.classes for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy subjects_manage on public.subjects for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy assignments_manage on public.teacher_assignments for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy closures_manage on public.school_closures for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy timetable_manage on public.timetable_slots for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy programs_manage on public.programs for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy chapters_manage on public.program_chapters for all to authenticated
using (public.is_manager()) with check (public.is_manager());
create policy lessons_manage on public.program_lessons for all to authenticated
using (public.is_manager()) with check (public.is_manager());

-- Progression : enseignant concerné ou responsable.
grant select, insert, update on public.lesson_progress to authenticated;

create policy lesson_progress_read on public.lesson_progress
for select to authenticated
using (
  public.can_view_all()
  or exists (
    select 1 from public.teacher_assignments ta
    join public.teachers t on t.id = ta.teacher_id
    where ta.id = lesson_progress.assignment_id
      and t.profile_id = (select auth.uid())
  )
);

create policy lesson_progress_insert on public.lesson_progress
for insert to authenticated
with check (
  public.is_manager()
  or exists (
    select 1 from public.teacher_assignments ta
    join public.teachers t on t.id = ta.teacher_id
    where ta.id = lesson_progress.assignment_id
      and t.profile_id = (select auth.uid())
  )
);

create policy lesson_progress_update on public.lesson_progress
for update to authenticated
using (
  public.is_manager()
  or exists (
    select 1 from public.teacher_assignments ta
    join public.teachers t on t.id = ta.teacher_id
    where ta.id = lesson_progress.assignment_id
      and t.profile_id = (select auth.uid())
  )
)
with check (
  public.is_manager()
  or exists (
    select 1 from public.teacher_assignments ta
    join public.teachers t on t.id = ta.teacher_id
    where ta.id = lesson_progress.assignment_id
      and t.profile_id = (select auth.uid())
  )
);

-- Séances : la direction/animateur voit tout, l'enseignant voit les siennes.
grant select, insert, delete on public.sessions to authenticated;
grant update (actual_start, actual_end, actual_lesson_id, status, notes) on public.sessions to authenticated;

create policy sessions_read on public.sessions
for select to authenticated
using (
  public.can_view_all()
  or exists (
    select 1 from public.teacher_assignments ta
    join public.teachers t on t.id = ta.teacher_id
    where ta.id = sessions.assignment_id
      and t.profile_id = (select auth.uid())
  )
);

create policy sessions_insert_manager on public.sessions
for insert to authenticated
with check (public.is_manager());

create policy sessions_delete_manager on public.sessions
for delete to authenticated
using (public.is_manager());

create policy sessions_update on public.sessions
for update to authenticated
using (
  public.is_manager()
  or exists (
    select 1 from public.teacher_assignments ta
    join public.teachers t on t.id = ta.teacher_id
    where ta.id = sessions.assignment_id
      and t.profile_id = (select auth.uid())
  )
)
with check (
  public.is_manager()
  or exists (
    select 1 from public.teacher_assignments ta
    join public.teachers t on t.id = ta.teacher_id
    where ta.id = sessions.assignment_id
      and t.profile_id = (select auth.uid())
  )
);

-- Absences : enseignant = les siennes ; responsables/direction = tout.
grant select, insert, update, delete on public.absences to authenticated;

create policy absences_read on public.absences
for select to authenticated
using (
  public.can_view_all()
  or exists (
    select 1 from public.teachers t
    where t.id = absences.teacher_id
      and t.profile_id = (select auth.uid())
  )
);

create policy absences_manage on public.absences
for all to authenticated
using (public.is_manager())
with check (public.is_manager());

-- Mur pédagogique : tous lisent ; chacun publie et édite ses messages ; responsables modèrent.
grant select, insert, update, delete on public.wall_posts, public.wall_comments to authenticated;

create policy wall_posts_read on public.wall_posts
for select to authenticated using (true);

create policy wall_posts_insert on public.wall_posts
for insert to authenticated
with check ((select auth.uid()) = author_id);

create policy wall_posts_update on public.wall_posts
for update to authenticated
using ((select auth.uid()) = author_id or public.is_manager())
with check ((select auth.uid()) = author_id or public.is_manager());

create policy wall_posts_delete on public.wall_posts
for delete to authenticated
using ((select auth.uid()) = author_id or public.is_manager());

create policy wall_comments_read on public.wall_comments
for select to authenticated using (true);

create policy wall_comments_insert on public.wall_comments
for insert to authenticated
with check ((select auth.uid()) = author_id);

create policy wall_comments_update on public.wall_comments
for update to authenticated
using ((select auth.uid()) = author_id or public.is_manager())
with check ((select auth.uid()) = author_id or public.is_manager());

create policy wall_comments_delete on public.wall_comments
for delete to authenticated
using ((select auth.uid()) = author_id or public.is_manager());

-- -----------------------------
-- Vues d'indicateurs (RLS respectée via security_invoker)
-- -----------------------------
create view public.v_session_minutes
with (security_invoker = true)
as
select
  s.id,
  s.assignment_id,
  s.scheduled_date,
  s.status,
  greatest(0, extract(epoch from (s.planned_end - s.planned_start)) / 60)::integer as planned_minutes,
  case
    when s.actual_start is not null and s.actual_end is not null
      then greatest(0, extract(epoch from (s.actual_end - s.actual_start)) / 60)::integer
    else 0
  end as actual_minutes
from public.sessions s;

grant select on public.v_session_minutes to authenticated;

create view public.v_teacher_performance
with (security_invoker = true)
as
select
  t.id as teacher_id,
  p.full_name,
  ta.school_year_id,
  count(s.id) as sessions_planned,
  count(s.id) filter (where s.status in ('done', 'partial')) as sessions_taught,
  coalesce(sum(vsm.planned_minutes), 0)::bigint as minutes_planned,
  coalesce(sum(vsm.actual_minutes), 0)::bigint as minutes_taught,
  case
    when coalesce(sum(vsm.planned_minutes), 0) = 0 then 0
    else round(100.0 * sum(vsm.actual_minutes) / nullif(sum(vsm.planned_minutes), 0), 1)
  end as hourly_coverage_pct,
  case
    when count(s.id) = 0 then 0
    else round(100.0 * count(s.id) filter (where s.status in ('done', 'partial')) / count(s.id), 1)
  end as attendance_pct
from public.teachers t
join public.profiles p on p.id = t.profile_id
join public.teacher_assignments ta on ta.teacher_id = t.id
left join public.sessions s on s.assignment_id = ta.id
left join public.v_session_minutes vsm on vsm.id = s.id
group by t.id, p.full_name, ta.school_year_id;

grant select on public.v_teacher_performance to authenticated;

-- Exemple de promotion du premier compte en administrateur, à exécuter manuellement :
-- update public.profiles set role = 'admin' where email = 'votre-email@lycee.cm';
