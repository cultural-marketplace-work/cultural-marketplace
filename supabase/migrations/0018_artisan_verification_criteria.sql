alter table public.artisan_verification_results
  add column if not exists verification_criteria jsonb not null default '[]'::jsonb,
  add column if not exists verification_decision text not null default 'manual_review'
    check (verification_decision in ('auto_approved', 'manual_review')),
  add column if not exists proof_of_craft_media_type text;
