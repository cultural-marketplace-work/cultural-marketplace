alter table chat_messages
  add column if not exists reply_to_message_id bigint
    references chat_messages(id) on delete set null;

create index if not exists idx_chat_messages_reply
  on chat_messages(reply_to_message_id);
