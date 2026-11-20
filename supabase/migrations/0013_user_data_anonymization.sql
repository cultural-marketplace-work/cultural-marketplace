alter table users
  add column if not exists account_deleted_at timestamptz;

alter table artisans
  add column if not exists account_deleted_at timestamptz;
