import { VALID_ARTISAN_ID_TYPES } from './validArtisanIdTypes';

export interface OcrApplicantFields {
  id_number: string | null;
  full_name: string | null;
  dob: string | null;
  address: string | null;
  id_expiry_date: string | null;
  id_expiry_label_found: boolean;
  ocr_readable: boolean;
  detected_id_type: string | null;
}

export interface OcrFields extends OcrApplicantFields {
  raw_text: string;
}

const ID_PATTERNS = [
  /\b(\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4})\b/,
  /\b([A-Z]\d{2}[- ]\d{2}[- ]\d{6})\b/i,
  /\b(\d{4}[- ]\d{7}[- ]\d{1})\b/,
  /\b([A-Z]{0,2}\d{2,4}[- ]\d{2,4}[- ]\d{4,8})\b/i,
  /\b(?:PCN|CRN|UMID|PHILSYS\s+CARD(?:\s+(?:NO|NUMBER))?|LICENSE(?:\s+(?:NO|NUMBER))?)\s*[:.#-]*\s*([A-Z0-9-]{8,24})\b/i,
  /\bID\s*(?:NO|NUMBER)?[:.\s#]*([A-Z0-9-]{6,20})\b/i,
];

const FIELD_LABEL = /^(?:FULL NAME|NAME|PANGALAN|LAST NAME|SURNAME|APELYIDO|FIRST NAME|GIVEN NAME|MIDDLE NAME|PRESENT ADDRESS|RESIDENTIAL ADDRESS|PERMANENT ADDRESS|ADDRESS|TIRAHAN|DOB|DATE OF BIRTH|BIRTHDATE|BIRTH DATE|KAPANGANAKAN|SEX|GENDER|NATIONALITY|ID NUMBER|ID NO|DATE OF (?:EXPIRATION|EXPIRY)|EXPIRATION DATE|EXPIRY DATE|VALID (?:UNTIL|THROUGH|THRU)|EXPIRES|EXPIRATION|EXPIRY)\b/i;

function readLabeledValue(lines: string[], label: RegExp): string | null {
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(label);
    if (!match) continue;

    const inline = lines[i].slice(match[0].length).replace(/^[\s:#-]+/, '').trim();
    const value = inline || (lines[i + 1] && !FIELD_LABEL.test(lines[i + 1]) ? lines[i + 1] : '');
    if (value) return value.replace(/\s+/g, ' ').trim();
  }
  return null;
}

function validIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function normalizeDate(text: string): string | null {
  const iso = text.match(/\b((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)\d{2})\b/);
  if (dmy) return validIsoDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  const monthNames = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
  const textual = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})[,]?\s+((?:19|20)\d{2})\b|\b([A-Za-z]{3,9})\s+(\d{1,2})[,]?\s+((?:19|20)\d{2})\b/);
  if (!textual) return null;

  const day = Number(textual[1] ?? textual[5]);
  const monthText = (textual[2] ?? textual[4]).slice(0, 3).toLowerCase();
  const year = Number(textual[3] ?? textual[6]);
  const month = monthNames.indexOf(monthText) + 1;
  return month ? validIsoDate(year, month, day) : null;
}

function normalizeExpiryDate(text: string): string | null {
  const iso = text.match(/\b((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numeric = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.]((?:19|20)\d{2})\b/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = Number(numeric[3]);
    if (first > 12) return validIsoDate(year, second, first);
    if (second > 12) return validIsoDate(year, first, second);
    return validIsoDate(year, second, first);
  }

  return normalizeDate(text);
}

function extractExpiryDate(lines: string[]): { date: string | null; labelFound: boolean } {
  const label = /\b(?:DATE\s+OF\s+(?:EXPIRATION|EXPIRY)|EXPIRATION\s+DATE|EXPIRY\s+DATE|VALID\s+(?:UNTIL|THROUGH|THRU)|EXPIRES|EXPIRATION|EXPIRY)\b/i;
  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(label);
    if (!match || match.index == null) continue;

    const inline = lines[index].slice(match.index + match[0].length);
    const nextLine = lines[index + 1];
    const date = normalizeExpiryDate(inline) ??
      (nextLine && !FIELD_LABEL.test(nextLine) ? normalizeExpiryDate(nextLine) : null);
    return { date, labelFound: true };
  }
  return { date: null, labelFound: false };
}

function cleanValue(value: string | null, maxLength: number): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').replace(/^[\s,;:#-]+|[\s,;:#-]+$/g, '').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function detectIdType(rawText: string): string | null {
  const patterns: Array<[string, RegExp]> = [
    [VALID_ARTISAN_ID_TYPES[0], /\b(?:PHILSYS|PHILIPPINE IDENTIFICATION (?:SYSTEM|CARD)|NATIONAL ID|PCN)\b/i],
    [VALID_ARTISAN_ID_TYPES[1], /\b(?:DRIVER'?S LICENSE|DRIVING LICENSE|LTO)\b/i],
    [VALID_ARTISAN_ID_TYPES[2], /\b(?:UMID|UNIFIED MULTI[- ]PURPOSE ID)\b/i],
    [VALID_ARTISAN_ID_TYPES[3], /\b(?:POSTAL ID|PHILPOST)\b/i],
  ];
  const matches = patterns.filter(([, pattern]) => pattern.test(rawText));
  return matches.length === 1 ? matches[0][0] : null;
}

export function extractOcrFields(rawText: string): OcrFields {
  const raw = rawText.replace(/\r/g, '\n').trim();
  const lines = raw.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

  const idNumber = ID_PATTERNS.map((pattern) => raw.match(pattern)?.[1]).find(Boolean) ?? null;

  let fullName = readLabeledValue(lines, /^(?:FULL\s+NAME|NAME|PANGALAN)\b/i);
  if (!fullName) {
    const first = readLabeledValue(lines, /^(?:FIRST\s+NAME|GIVEN\s+NAME)\b/i);
    const middle = readLabeledValue(lines, /^MIDDLE\s+NAME\b/i);
    const last = readLabeledValue(lines, /^(?:LAST\s+NAME|SURNAME|APELYIDO)\b/i);
    if (first && last) fullName = [first, middle, last].filter(Boolean).join(' ');
  }
  if (!fullName) {
    const nameLine = lines.find((line) => /^[A-Z][A-Z'’.-]+(?:\s+[A-Z][A-Z'’.-]+)*,\s*[A-Z][A-Z'’ .-]+$/.test(line));
    const commaName = nameLine?.match(/^([^,]+),\s*(.+)$/);
    if (commaName) fullName = `${commaName[2]} ${commaName[1]}`;
  }

  const labeledDob = readLabeledValue(lines, /^(?:DOB|DATE\s+OF\s+BIRTH|BIRTH\s*DATE|BIRTHDATE|KAPANGANAKAN)\b/i);
  const dob = normalizeDate(labeledDob ?? raw);

  const address = readLabeledValue(lines, /^(?:PRESENT\s+ADDRESS|RESIDENTIAL\s+ADDRESS|PERMANENT\s+ADDRESS|ADDRESS|TIRAHAN)\b/i)
    ?? lines.find((line) => /(?:purok|sitio|barangay|brgy|municipality|province|agusan)/i.test(line))
    ?? null;
  const expiry = extractExpiryDate(lines);
  const ocrReadable = raw.replace(/[^A-Z0-9]/gi, '').length >= 5;

  return {
    raw_text: raw.slice(0, 10000),
    id_number: cleanValue(idNumber, 40),
    full_name: cleanValue(fullName, 100),
    dob,
    address: cleanValue(address, 200),
    id_expiry_date: expiry.date,
    id_expiry_label_found: expiry.labelFound,
    ocr_readable: ocrReadable,
    detected_id_type: detectIdType(raw),
  };
}
