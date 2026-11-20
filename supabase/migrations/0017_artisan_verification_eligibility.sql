alter table public.artisans
  add column if not exists id_expiry_date date,
  add column if not exists id_expiry_checked boolean not null default false;
