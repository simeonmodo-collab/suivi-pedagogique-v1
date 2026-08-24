-- Renforcement du paramétrage scolaire.
-- À exécuter après 001_initial_schema.sql.

-- Une période ne peut avoir qu'un seul ordre dans une année scolaire.
create unique index if not exists periods_year_sequence_unique
  on public.periods (school_year_id, sequence_no);

-- Validation : une période doit rester dans les bornes de son année scolaire.
create or replace function public.validate_period_within_school_year()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  y_start date;
  y_end date;
begin
  select starts_on, ends_on into y_start, y_end
  from public.school_years
  where id = new.school_year_id;

  if y_start is null then
    raise exception 'School year not found';
  end if;

  if new.starts_on < y_start or new.ends_on > y_end then
    raise exception 'Period must be within school year dates';
  end if;

  return new;
end;
$$;

drop trigger if exists periods_validate_school_year on public.periods;
create trigger periods_validate_school_year
before insert or update on public.periods
for each row execute procedure public.validate_period_within_school_year();

-- Même contrôle pour les fermetures officielles.
create or replace function public.validate_closure_within_school_year()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  y_start date;
  y_end date;
begin
  select starts_on, ends_on into y_start, y_end
  from public.school_years
  where id = new.school_year_id;

  if y_start is null then
    raise exception 'School year not found';
  end if;

  if new.starts_on < y_start or new.ends_on > y_end then
    raise exception 'Closure must be within school year dates';
  end if;

  return new;
end;
$$;

drop trigger if exists school_closures_validate_year on public.school_closures;
create trigger school_closures_validate_year
before insert or update on public.school_closures
for each row execute procedure public.validate_closure_within_school_year();
