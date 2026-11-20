create table if not exists artisan_verification_results (
  artisan_id bigint primary key references artisans(id) on delete cascade,
  face_matched boolean,
  face_confidence double precision,
  duplicate_face_match boolean,
  liveness_status text not null,
  liveness_challenges jsonb not null default '[]'::jsonb,
  liveness_verified_at timestamptz,
  registration_notes text,
  created_at timestamptz not null default now()
);

alter table artisan_verification_results enable row level security;
alter table face_embeddings enable row level security;
alter table face_verification_logs enable row level security;

revoke all on table artisan_verification_results from anon, authenticated;
revoke all on table face_embeddings from anon, authenticated;
revoke all on table face_verification_logs from anon, authenticated;

revoke all on table artisans from anon, authenticated;
grant select (id, name, business_name, craft_type, location, bio, profile_picture, verification_status)
  on table artisans to anon, authenticated;
