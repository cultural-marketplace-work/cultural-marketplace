alter table artisans
  add column if not exists indigenous_affiliation text,
  add column if not exists affiliation_document_path text;
