import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const sourceDirectory = join(projectDirectory, 'src');
const language = 'ceb';
const modelName = 'Xenova/nllb-200-distilled-600M';
const dryRun = process.argv.includes('--dry-run');

if (!dryRun && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured. Add it to web/.env.local before running this script.');
}

const sourceTexts = new Set([
  'Overview',
  'Artisan Dashboard',
  'Statistics',
  'Traditional Crafting',
  'Creations',
  'Add New Craft',
  'Workshops & Experiences',
  'Orders & Delivery',
  'Orders',
  'Shipments (J&T)',
  'Workshop Bookings',
  'Community',
  'Messages',
  'Reviews',
  'Notifications',
  'Identity',
  'Profile',
  'Verify as an artisan',
  'Browse the Marketplace',
  'Storefront',
  'Master Artisan',
  'Customer',
  'List and manage creations',
  'Receive and fulfill orders',
  'Host workshops and experiences',
  'English — Default',
  'Bisaya (Cebuano)',
  'Default',
  'For users comfortable using English',
  'For Cebuano-speaking artisans and buyers',
]);

function collectTypeScriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectTypeScriptFiles(path));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(path);
  }
  return files;
}

function collectTranslationCalls(node, texts) {
  if (
    ts.isCallExpression(node)
    && ts.isIdentifier(node.expression)
    && node.expression.text === 't'
    && node.arguments.length > 0
    && (ts.isStringLiteralLike(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))
  ) {
    texts.add(node.arguments[0].text.trim());
  }
  ts.forEachChild(node, (child) => collectTranslationCalls(child, texts));
}

const files = [
  ...collectTypeScriptFiles(join(sourceDirectory, 'app', 'artisan')),
  join(sourceDirectory, 'components', 'ArtisanRegistrationForm.tsx'),
  join(sourceDirectory, 'components', 'PortalSidebar.tsx'),
];
for (const path of files) {
  const source = readFileSync(path, 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  collectTranslationCalls(file, sourceTexts);
}

const translations = [...sourceTexts].filter(Boolean).sort((a, b) => a.localeCompare(b));
console.log(`Translating ${translations.length} artisan UI strings with ${modelName}...`);

async function translateAndStore() {
  const [{ env, pipeline }, { default: postgres }] = await Promise.all([
    import('@xenova/transformers'),
    import('postgres'),
  ]);
  env.cacheDir = process.env.NLLB_CACHE_DIR || join(process.env.USERPROFILE || process.env.HOME, '.cache', 'culturalmarketplace-nllb');
  env.allowRemoteModels = true;

  const translator = await pipeline('translation', modelName);
  const translatedRows = [];
  const batchSize = 8;
  for (let offset = 0; offset < translations.length; offset += batchSize) {
    const batch = translations.slice(offset, offset + batchSize);
    const result = await translator(batch, { src_lang: 'eng_Latn', tgt_lang: 'ceb_Latn' });
    if (!Array.isArray(result) || result.length !== batch.length) {
      throw new Error(`Unexpected translation output for strings ${offset + 1}-${offset + batch.length}.`);
    }
    for (let index = 0; index < batch.length; index += 1) {
      const translatedText = result[index]?.translation_text;
      if (typeof translatedText !== 'string' || translatedText.trim().length === 0) {
        throw new Error(`NLLB returned an empty translation for: ${batch[index]}`);
      }
      translatedRows.push({
        source_text: batch[index],
        language_code: language,
        translated_text: translatedText.trim(),
      });
    }
    console.log(`Translated ${Math.min(offset + batch.length, translations.length)} of ${translations.length}.`);
  }

  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 20 });
  try {
    await sql.begin(async (transaction) => {
      await transaction`
        insert into public.artisan_ui_translations ${transaction(translatedRows)}
        on conflict (source_text, language_code)
        do update set translated_text = excluded.translated_text, updated_at = now()
      `;
    });
  } finally {
    await sql.end();
  }

  console.log(`Stored ${translatedRows.length} Cebuano translations in artisan_ui_translations.`);
}

if (!dryRun) await translateAndStore();
