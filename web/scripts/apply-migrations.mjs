// Applies Supabase migrations + seed to the DATABASE_URL project.
// Usage (from web/):  node --env-file=.env.local scripts/apply-migrations.mjs
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL env var required'); process.exit(1); }

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 20 });

const files = [
  '../supabase/migrations/0001_schema.sql',
  'scripts/migrations_local/0002_reviews_reports.sql',
  'scripts/migrations_local/0003_face_verification.sql',
  '../supabase/migrations/0004_shipments.sql',
  '../supabase/migrations/0005_nfc_write.sql',
  '../supabase/migrations/0006_image_moderation.sql',
  '../supabase/migrations/0007_chat_updated_at.sql',
  '../supabase/migrations/0009_artisan_affiliation.sql',
  '../supabase/migrations/0010_artisan_id_type.sql',
  '../supabase/migrations/0011_artisan_liveness_results.sql',
  '../supabase/migrations/0012_artisan_account_registration.sql',
  '../supabase/migrations/0013_user_data_anonymization.sql',
  '../supabase/migrations/0014_account_table_consolidation.sql',
  '../supabase/migrations/0015_sync_identity_sequences.sql',
  '../supabase/migrations/0019_artisan_language_preferences.sql',
  '../supabase/migrations/0021_chat_message_replies.sql',
  '../supabase/migrations/0022_tutorial_details.sql',
];

let failed = false;
for (const f of files) {
  const sqlText = readFileSync(f, 'utf8');
  try {
    await sql.unsafe(sqlText);
    console.log(`ok: ${f}`);
  } catch (e) {
    failed = true;
    console.error(`FAILED: ${f}: ${e.message}`);
  }
}
await sql.end();
process.exit(failed ? 1 : 0);
