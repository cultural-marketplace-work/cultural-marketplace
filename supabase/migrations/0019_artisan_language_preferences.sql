alter table public.artisans
  add column if not exists preferred_language text not null default 'en';

alter table public.pending_registrations
  add column if not exists preferred_language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artisans_preferred_language_check'
      and conrelid = 'public.artisans'::regclass
  ) then
    alter table public.artisans
      add constraint artisans_preferred_language_check
      check (preferred_language in ('en', 'ceb'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pending_registrations_preferred_language_check'
      and conrelid = 'public.pending_registrations'::regclass
  ) then
    alter table public.pending_registrations
      add constraint pending_registrations_preferred_language_check
      check (preferred_language in ('en', 'ceb'));
  end if;
end $$;

create table if not exists public.artisan_ui_translations (
  source_text text not null,
  language_code text not null check (language_code in ('en', 'ceb')),
  translated_text text not null,
  updated_at timestamptz not null default now(),
  primary key (source_text, language_code)
);

alter table public.artisan_ui_translations enable row level security;
