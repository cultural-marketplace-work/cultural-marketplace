import { VALID_ARTISAN_ID_TYPES } from './validArtisanIdTypes';
import type { OcrApplicantFields } from './ocrFields';

export type CriterionStatus = 'pass' | 'fail' | 'review';
export type VerificationDecision = 'auto_approved' | 'manual_review';
export const VERIFICATION_CRITERIA_COUNT = 14;

export interface RuleResult {
  id: string;
  label: string;
  status: CriterionStatus;
  detail: string;
}

export interface VerificationEvidence {
  idType?: string | null;
  detectedIdType?: string | null;
  idDocumentsReadable?: boolean | null;
  idExpiryStatus?: 'valid' | 'expired' | 'unknown';
  ocrFront?: Partial<OcrApplicantFields> | null;
  ocrBack?: Partial<OcrApplicantFields> | null;
  accountName?: string | null;
  enteredIdNumber?: string | null;
  duplicateId?: boolean | null;
  livenessPassed?: boolean | null;
  faceMatched?: boolean | null;
  duplicateFaceMatch?: boolean | null;
  dob?: string | null;
  dobFromOcr?: boolean;
  idAddress?: string | null;
  proofOfCraftStatus?: 'pass' | 'review';
  productSamplesStatus?: 'pass' | 'fail';
  craftType?: string | null;
  businessName?: string | null;
  indigenousAffiliation?: string | null;
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed;
}

function todayInManila(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return new Date(Date.UTC(year, month - 1, day));
}

function ageOnDate(dateOfBirth: Date, today: Date): number {
  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  if (
    today.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (today.getUTCMonth() === dateOfBirth.getUTCMonth() && today.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function normalizedName(value?: string | null): string {
  return value?.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
}

function normalizedId(value?: string | null): string {
  return value?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
}

function extractedFields(evidence: VerificationEvidence): {
  name: string | null;
  idNumber: string | null;
  dob: string | null;
  address: string | null;
} {
  const fields = [evidence.ocrFront, evidence.ocrBack];
  const read = (key: 'full_name' | 'id_number' | 'dob' | 'address') =>
    fields.map((side) => side?.[key]).find((value): value is string => Boolean(value?.trim())) ?? null;
  return {
    name: read('full_name'),
    idNumber: read('id_number'),
    dob: read('dob'),
    address: read('address'),
  };
}

export function evaluateVerificationRules(evidence: VerificationEvidence): RuleResult[] {
  const extracted = extractedFields(evidence);
  const selectedIdType = evidence.idType?.trim() ?? '';
  const acceptedIdType = VALID_ARTISAN_ID_TYPES.some((type) => type === selectedIdType);
  const detectedIdType = evidence.detectedIdType?.trim() ?? '';
  const dob = evidence.dobFromOcr ? parseDateOnly(extracted.dob) : null;
  const age = dob ? ageOnDate(dob, todayInManila()) : null;
  const missingRequiredInformation = [
    ['name', evidence.accountName?.trim() || extracted.name],
    ['birthdate', evidence.dob?.trim() || extracted.dob],
    ['address', evidence.idAddress?.trim() || extracted.address],
    ['ID number', evidence.enteredIdNumber?.trim() || extracted.idNumber],
  ].filter(([, value]) => !value);
  const nameMismatch = Boolean(
    extracted.name && evidence.accountName &&
    normalizedName(extracted.name) !== normalizedName(evidence.accountName),
  );
  const idNumberMismatch = Boolean(
    extracted.idNumber && evidence.enteredIdNumber &&
    normalizedId(extracted.idNumber) !== normalizedId(evidence.enteredIdNumber),
  );

  return [
    {
      id: '1',
      label: 'Accepted ID type',
      status: acceptedIdType ? 'pass' : 'fail',
      detail: acceptedIdType ? `${selectedIdType} is supported` : 'Selected ID type is missing or unsupported',
    },
    {
      id: '2',
      label: 'ID type matching',
      status: 'pass',
      detail: detectedIdType
        ? `Automatically passed; OCR identifies ${detectedIdType}`
        : 'Automatically passed; OCR identification is not required',
    },
    {
      id: '3',
      label: 'ID document validation',
      status: evidence.idExpiryStatus === 'valid' && evidence.idDocumentsReadable
        ? 'pass'
        : 'review',
      detail: evidence.idExpiryStatus === 'expired'
        ? 'ID is expired; admin review required'
        : evidence.idExpiryStatus === 'valid' && evidence.idDocumentsReadable
          ? 'ID is not expired, or no expiry date is indicated'
          : evidence.idExpiryStatus !== 'valid'
            ? 'ID expiry could not be confirmed; admin review required'
            : 'ID readability could not be confirmed; admin review required',
    },
    {
      id: '4',
      label: 'Required ID information',
      status: missingRequiredInformation.length || nameMismatch || idNumberMismatch ? 'review' : 'pass',
      detail: missingRequiredInformation.length
        ? `Missing: ${missingRequiredInformation.map(([label]) => label).join(', ')}`
        : nameMismatch || idNumberMismatch
          ? 'Entered name or ID number differs from the ID information'
          : 'All required information is filled',
    },
    {
      id: '5',
      label: 'Duplicate ID check',
      status: evidence.duplicateId === true ? 'fail' : evidence.duplicateId === false ? 'pass' : 'review',
      detail: evidence.duplicateId === true
        ? 'ID number is already associated with another artisan account'
        : evidence.duplicateId === false
          ? 'No matching ID number found'
          : 'ID number could not be checked',
    },
    {
      id: '6',
      label: 'Face liveness',
      status: evidence.livenessPassed === true ? 'pass' : evidence.livenessPassed === false ? 'fail' : 'review',
      detail: evidence.livenessPassed === true
        ? 'Randomized liveness challenges passed'
        : evidence.livenessPassed === false
          ? 'Liveness challenges were not completed'
          : 'Liveness could not be verified',
    },
    {
      id: '7',
      label: 'Face-to-ID matching',
      status: evidence.faceMatched === true ? 'pass' : evidence.faceMatched === false ? 'fail' : 'review',
      detail: evidence.faceMatched === true
        ? 'Selfie matches the ID portrait within the configured threshold'
        : evidence.faceMatched === false
          ? 'Selfie did not match the ID portrait'
          : 'Face comparison could not be completed',
    },
    {
      id: '8',
      label: 'Duplicate face detection',
      status: evidence.duplicateFaceMatch === false ? 'pass' : 'review',
      detail: evidence.duplicateFaceMatch === false
        ? 'No duplicate face was found'
        : evidence.duplicateFaceMatch === true
          ? 'A possible duplicate face was found; admin review required'
          : 'Duplicate face check could not be completed',
    },
    {
      id: '9',
      label: 'Age requirement',
      status: age == null ? 'review' : age >= 18 ? 'pass' : 'fail',
      detail: age == null ? 'OCR birthdate is missing or invalid' :
        age >= 18 ? `${age} years old` : 'Applicant is under 18',
    },
    {
      id: '10',
      label: 'Residency requirement',
      status: extracted.address?.toLowerCase().includes('agusan del sur') ? 'pass' : 'review',
      detail: extracted.address?.toLowerCase().includes('agusan del sur')
        ? 'ID address contains Agusan del Sur'
        : 'Agusan del Sur residency could not be confirmed from the ID',
    },
    {
      id: '11',
      label: 'Proof of craft',
      status: evidence.proofOfCraftStatus === 'pass' ? 'pass' : 'review',
      detail: evidence.proofOfCraftStatus === 'pass'
        ? 'Craft evidence uploaded and readable'
        : 'Craft evidence is missing or needs a manual readability check',
    },
    {
      id: '12',
      label: 'Distinct product samples',
      status: evidence.productSamplesStatus === 'pass' ? 'pass' : 'fail',
      detail: evidence.productSamplesStatus === 'pass'
        ? 'At least two readable, non-identical product samples uploaded'
        : 'Two distinct readable product samples were not provided',
    },
    {
      id: '13',
      label: 'Business information',
      status: evidence.businessName?.trim() && evidence.craftType?.trim() ? 'pass' : 'fail',
      detail: evidence.businessName?.trim() && evidence.craftType?.trim()
        ? 'Business name and craft specialization completed'
        : 'Business name and craft specialization are both required',
    },
    {
      id: '14',
      label: 'Indigenous affiliation declaration',
      status: evidence.indigenousAffiliation?.trim() ? 'pass' : 'review',
      detail: evidence.indigenousAffiliation?.trim()
        ? 'Community affiliation declared'
        : 'No community affiliation declared; admin review required',
    },
  ];
}

export function verificationDecision(rules: RuleResult[]): VerificationDecision {
  return rules.length === VERIFICATION_CRITERIA_COUNT && rules.every((rule) => rule.status === 'pass')
    ? 'auto_approved'
    : 'manual_review';
}

export function rulesSummary(rules: RuleResult[]): { canApprove: boolean; text: string } {
  const fails = rules.filter((rule) => rule.status === 'fail').length;
  const reviews = rules.filter((rule) => rule.status === 'review').length +
    Math.max(0, VERIFICATION_CRITERIA_COUNT - rules.length);
  const canApprove = rules.length === VERIFICATION_CRITERIA_COUNT && fails === 0 && reviews === 0;
  return {
    canApprove,
    text: canApprove
      ? 'All criteria passed — system approved'
      : `Manual review required: ${fails} failed and ${reviews} need review`,
  };
}

export function rulesSnapshot(rules: RuleResult[]): string {
  const mark = { pass: '✓', review: '?', fail: '✗' } as const;
  return rules.map((rule) => `${rule.id}${mark[rule.status]}`).join(' ');
}
