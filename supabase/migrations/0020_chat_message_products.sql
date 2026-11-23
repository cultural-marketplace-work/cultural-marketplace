alter table chat_messages
  add column if not exists product_id bigint references products(id) on delete set null;

create index if not exists idx_chat_messages_product
  on chat_messages(product_id);

-- Keep one conversation between each customer and artisan across products.
-- Existing duplicate conversation rows are merged while preserving their messages.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'chat_conversations'
      and con.contype = 'u'
  loop
    execute format('alter table public.chat_conversations drop constraint %I', constraint_record.conname);
  end loop;

  with ranked as (
    select id,
      row_number() over (
        partition by customer_id, artisan_id
        order by created_at asc, id asc
      ) as conversation_rank
    from chat_conversations
  ),
  keepers as (
    select id, customer_id, artisan_id
    from chat_conversations
    where id in (select id from ranked where conversation_rank = 1)
  )
  update chat_messages m
  set product_id = coalesce(m.product_id, c.product_id)
  from chat_conversations c
  where m.conversation_id = c.id
    and c.product_id is not null;

  with ranked as (
    select id,
      first_value(id) over (
        partition by customer_id, artisan_id
        order by created_at asc, id asc
      ) as keeper_id
    from chat_conversations
  )
  update chat_messages m
  set conversation_id = r.keeper_id
  from ranked r
  where m.conversation_id = r.id
    and r.keeper_id <> r.id;

  delete from chat_conversations c
  where exists (
    select 1
    from chat_conversations keeper
    where keeper.customer_id = c.customer_id
      and keeper.artisan_id = c.artisan_id
      and keeper.id < c.id
  );
end
$$;

alter table chat_conversations
  add constraint chat_conversations_customer_artisan_key
  unique (customer_id, artisan_id);
