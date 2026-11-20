alter table artisans
  add column if not exists application_submitted boolean not null default true;
