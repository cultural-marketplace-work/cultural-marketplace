import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getBookedSeatsCount, getSettings } from '@/lib/db';
import type { Product } from '@/lib/types';
import TutorialDetailsForm from './TutorialDetailsForm';
import type { TutorialAddressOption } from './TutorialSessionFields';

function parseCsvRow(row: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error('The venue address data contains an invalid CSV row.');
  cells.push(cell);
  return cells;
}

function parseAddressOptions(csv: string): TutorialAddressOption[] {
  const rows = csv.trim().split(/\r?\n/).map(parseCsvRow);
  const headers = rows[0] ?? [];
  const indexes = {
    code: headers.indexOf('psgc_code'),
    name: headers.indexOf('name'),
    level: headers.indexOf('level'),
    parent: headers.indexOf('parent_psgc_code'),
  };
  if (Object.values(indexes).some((index) => index < 0)) {
    throw new Error('The venue address data is missing required columns.');
  }

  return rows.slice(1).map((cells) => {
    const level = cells[indexes.level]?.trim();
    if (!['Prov', 'City', 'Mun', 'Bgy'].includes(level)) {
      throw new Error('The venue address data contains an unsupported location level.');
    }
    const code = cells[indexes.code]?.trim();
    const name = cells[indexes.name]?.trim();
    if (!code || !name) throw new Error('The venue address data contains an incomplete location.');
    return {
      code,
      name,
      level: level as TutorialAddressOption['level'],
      parentCode: cells[indexes.parent]?.trim() || null,
    };
  });
}

export default async function TutorialDetailsEditor({
  product,
  returnTo = '/artisan/products',
}: {
  product: Product;
  returnTo?: string;
}) {
  const [settings, addressCsv, bookedParticipantsBySession] = await Promise.all([
    getSettings(),
    readFile(join(process.cwd(), 'public', 'data', 'agusan_del_sur_all.csv'), 'utf8'),
    Promise.all((product.tutorial_dates ?? []).map((session) => getBookedSeatsCount(product.id, session))),
  ]);
  const addressOptions = parseAddressOptions(addressCsv);
  const commissionRate = Number(settings.commission_rate);
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
    throw new Error('The platform commission rate is not configured correctly.');
  }

  return (
    <TutorialDetailsForm
      productId={product.id}
      commissionRate={commissionRate}
      initialDetails={product.tutorial_details}
      initialTitle={product.tutorial_title}
      initialDescription={product.tutorial_description}
      initialPrice={product.tutorial_price}
      initialCapacity={product.tutorial_capacity}
      initialImage={product.tutorial_gallery?.[0] ?? null}
      initialLat={product.tutorial_lat}
      initialLng={product.tutorial_lng}
      initialLearningOutcomes={product.tutorial_learnings}
      initialTutorialDates={product.tutorial_dates ?? []}
      bookedParticipantsBySession={bookedParticipantsBySession}
      addressOptions={addressOptions}
      returnTo={returnTo}
    />
  );
}
