do $$
begin
  if exists (
    select 1
    from public.users u
    join public.artisans a
      on lower(btrim(u.email)) = lower(btrim(a.email))
  ) then
    raise exception 'Cannot enforce global email uniqueness: an email is already shared by a user and an artisan.';
  end if;
end
$$;

create or replace function public.enforce_global_account_email()
returns trigger
language plpgsql
as $$
declare
  normalized_email text := lower(btrim(new.email));
begin
  if normalized_email is null or normalized_email = '' then
    raise exception using errcode = '23514', message = 'Email address cannot be blank.';
  end if;

  new.email := normalized_email;
  perform pg_advisory_xact_lock(hashtext('account-email:' || normalized_email));

  if tg_table_name = 'users' then
    if exists (
      select 1 from public.artisans where lower(btrim(email)) = normalized_email
    ) then
      raise exception using
        errcode = '23505',
        constraint = 'accounts_email_global_unique',
        message = 'Email address is already associated with another account.';
    end if;
  elsif exists (
    select 1 from public.users where lower(btrim(email)) = normalized_email
  ) then
    raise exception using
      errcode = '23505',
      constraint = 'accounts_email_global_unique',
      message = 'Email address is already associated with another account.';
  end if;

  return new;
end;
$$;

create trigger users_global_email_unique
before insert or update of email on public.users
for each row execute function public.enforce_global_account_email();

create trigger artisans_global_email_unique
before insert or update of email on public.artisans
for each row execute function public.enforce_global_account_email();
