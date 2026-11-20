begin;

do $$
declare
  seq record;
  max_id bigint;
begin
  for seq in
    select table_schema, table_name, column_name,
           pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) as sequence_name
    from information_schema.columns
    where table_schema = 'public'
      and (is_identity = 'YES' or column_default like 'nextval(%')
  loop
    if seq.sequence_name is null then
      continue;
    end if;

    execute format('select coalesce(max(%I), 0) from %I.%I',
      seq.column_name, seq.table_schema, seq.table_name)
      into max_id;

    perform setval(seq.sequence_name, greatest(max_id, 1), max_id > 0);
  end loop;
end $$;

commit;
