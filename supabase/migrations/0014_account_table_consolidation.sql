begin;

do $$
declare
  has_conflict boolean;
begin
  if exists (
    select 1 from users group by lower(email) having count(*) > 1
  ) then
    raise exception 'Cannot consolidate accounts: users contains case-insensitive duplicate emails.';
  end if;

  if exists (
    select 1 from artisans group by lower(email) having count(*) > 1
  ) then
    raise exception 'Cannot consolidate accounts: artisans contains case-insensitive duplicate emails.';
  end if;

  if exists (
    select 1 from users u
    join artisans a on lower(a.email) = lower(u.email)
    where u.role <> 'artisan'
  ) then
    raise exception 'Cannot consolidate accounts: a customer/admin email is also used by an artisan.';
  end if;

  if to_regclass('public.customers') is not null then
    execute $q$
      select exists (
        select 1 from customers group by lower(email) having count(*) > 1
      ) or exists (
        select 1 from customers c join users u on lower(u.email) = lower(c.email)
        where u.role <> 'customer'
      )
    $q$ into has_conflict;
    if has_conflict then
      raise exception 'Cannot consolidate accounts: customer emails conflict with another account.';
    end if;
    if to_regclass('public.admins') is not null then
      execute 'select exists (select 1 from customers c join admins a on lower(a.email) = lower(c.email))'
        into has_conflict;
      if has_conflict then
        raise exception 'Cannot consolidate accounts: customer and admin emails overlap.';
      end if;
    end if;
  end if;

  if to_regclass('public.admins') is not null then
    execute $q$
      select exists (
        select 1 from admins group by lower(email) having count(*) > 1
      ) or exists (
        select 1 from admins a join users u on lower(u.email) = lower(a.email)
        where u.role <> 'admin'
      )
    $q$ into has_conflict;
    if has_conflict then
      raise exception 'Cannot consolidate accounts: admin emails conflict with another account.';
    end if;
  end if;

  if to_regclass('public.admins') is not null and to_regclass('public.customers') is not null then
    execute 'select exists (select 1 from customers c join admins a on lower(a.email) = lower(c.email))'
      into has_conflict;
    if has_conflict then
      raise exception 'Cannot consolidate accounts: customer and admin emails overlap.';
    end if;
  end if;
end $$;

alter table public.users add column if not exists username varchar(100);

do $$
begin
  perform setval(pg_get_serial_sequence('public.users', 'id'),
    greatest(coalesce((select max(id) from users), 0) + 1, 1), false);

  if to_regclass('public.customers') is not null then
    execute $q$
      update users u set
        name = coalesce(nullif(u.name, ''), c.name),
        location = coalesce(u.location, c.location),
        phone = coalesce(u.phone, c.phone),
        profile_picture = coalesce(u.profile_picture, c.profile_picture),
        bio = coalesce(u.bio, c.bio)
      from customers c
      where lower(u.email) = lower(c.email) and u.role = 'customer'
    $q$;

    execute $q$
      insert into users
        (name, email, password, role, location, phone, profile_picture, bio, created_at, updated_at, reg_date, is_verified)
      select c.name, c.email, c.password, 'customer', c.location, c.phone, c.profile_picture, c.bio,
        c.created_at, c.updated_at, c.created_at, true
      from customers c
      where not exists (select 1 from users u where lower(u.email) = lower(c.email))
    $q$;
  end if;

  if to_regclass('public.admins') is not null then
    execute $q$
      update users u set
        username = coalesce(u.username, a.username),
        name = coalesce(nullif(u.name, ''), a.name),
        profile_picture = coalesce(u.profile_picture, a.profile_picture)
      from admins a
      where lower(u.email) = lower(a.email) and u.role = 'admin'
    $q$;

    execute $q$
      insert into users
        (username, name, email, password, role, profile_picture, created_at, updated_at, is_verified)
      select a.username, a.name, a.email, a.password, 'admin', a.profile_picture, a.created_at, a.updated_at, true
      from admins a
      where not exists (select 1 from users u where lower(u.email) = lower(a.email))
    $q$;
  end if;
end $$;

alter table public.notifications add column if not exists artisan_id bigint
  references public.artisans(id) on delete cascade;
alter table public.notifications alter column user_id drop not null;

do $$
begin
  perform setval(pg_get_serial_sequence('public.artisans', 'id'),
    greatest(coalesce((select max(id) from artisans), 0) + 1, 1), false);

  insert into artisans
    (name, email, password, location, phone, profile_picture, bio, verification_status,
     application_submitted, account_deleted_at, created_at, updated_at, reg_date)
  select u.name, u.email, u.password, u.location, u.phone, u.profile_picture, u.bio,
    case when u.account_deleted_at is null then 'pending' else 'suspended' end,
    false, u.account_deleted_at, u.created_at, u.updated_at, u.reg_date
  from users u
  where u.role = 'artisan'
    and not exists (select 1 from artisans a where lower(a.email) = lower(u.email));

  update artisans a set
    name = u.name,
    password = u.password,
    phone = coalesce(a.phone, u.phone),
    location = coalesce(a.location, u.location),
    profile_picture = coalesce(a.profile_picture, u.profile_picture),
    bio = coalesce(a.bio, u.bio),
    account_deleted_at = coalesce(a.account_deleted_at, u.account_deleted_at)
  from users u
  where u.role = 'artisan' and lower(a.email) = lower(u.email);

  update notifications n
  set artisan_id = a.id, user_id = null
  from artisans a
  where n.user_role = 'artisan' and n.user_id = a.id;

  update notifications n
  set artisan_id = a.id, user_id = null
  from users u
  join artisans a on lower(a.email) = lower(u.email)
  where n.user_role = 'artisan' and n.user_id = u.id
    and u.role = 'artisan' and n.artisan_id is null;

  if exists (select 1 from notifications where user_role = 'artisan' and artisan_id is null) then
    raise exception 'Cannot consolidate accounts: artisan notifications could not be mapped.';
  end if;

  if exists (
    select 1 from notifications n join users u on u.id = n.user_id
    where u.role = 'artisan' and n.user_role <> 'artisan'
  ) then
    raise exception 'Cannot consolidate accounts: non-artisan notifications reference artisan accounts.';
  end if;

  if exists (
    select 1 from users u where u.role = 'artisan'
      and not exists (select 1 from artisans a where lower(a.email) = lower(u.email))
  ) then
    raise exception 'Cannot consolidate accounts: an artisan account was not migrated.';
  end if;
end $$;

delete from users where role = 'artisan';

alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('customer', 'admin'));
create unique index if not exists users_email_lower_idx on public.users (lower(email));
create unique index if not exists artisans_email_lower_idx on public.artisans (lower(email));
create unique index if not exists users_username_unique_idx on public.users (username) where username is not null;
create index if not exists idx_notif_artisan on public.notifications (artisan_id, user_role, is_read);

drop table if exists public.customers;
drop table if exists public.admins;

commit;
