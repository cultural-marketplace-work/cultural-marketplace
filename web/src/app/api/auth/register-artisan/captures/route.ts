import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  appendArtisanRegistrationNote,
  createArtisan,
  getArtisanByEmail,
  hasDuplicateArtisanIdNumber,
  logActivity,
  pushNotification,
} from '@/lib/db';

import { getSession } from '@/lib/auth';
import { openPending } from '@/lib/pendingToken';
import type { OcrApplicantFields } from '@/lib/ocrFields';
import { faceEmbeddingEncryptionConfigured, listFaceEmbeddings, saveFaceEmbedding } from '@/lib/faceEmbeddings';
import { logFaceAttempt } from '@/lib/faceLogs';
import { uploadFile } from '@/lib/storage';
import { compareHumanFaces, faceAssetsBaseUrl, findDuplicateHumanEmbedding } from '@/lib/humanFaceVerification';
import { evaluateVerificationRules, verificationDecision } from '@/lib/verificationRules';

// In-memory pending-artisan handoff shared with ../route.ts.s
declare global {
  // eslint-disable-next-line no-var
  var __pendingArtisans: Map<string, { data: Record<string, string>; expires: number }> | undefined;
}

export const maxDuration = 60;

function readOcrFields(value: unknown): OcrApplicantFields | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const fields = value as Record<string, unknown>;
  const read = (key: 'full_name' | 'id_number' | 'dob' | 'address' | 'id_expiry_date' | 'detected_id_type', maxLength: number) => {
    const field = fields[key];
    return typeof field === 'string' && field.trim() ? field.trim().slice(0, maxLength) : null;
  };
  const result = {
    full_name: read('full_name', 100),
    id_number: read('id_number', 40),
    dob: read('dob', 10),
    address: read('address', 200),
    id_expiry_date: read('id_expiry_date', 10),
    id_expiry_label_found: fields.id_expiry_label_found === true,
    ocr_readable: fields.ocr_readable === true,
    detected_id_type: read('detected_id_type', 80),
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

function parseOcrData(value: FormDataEntryValue | null): { front?: OcrApplicantFields; back?: OcrApplicantFields } {
  if (typeof value !== 'string' || value.length > 20000) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) return {};
    throw error;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const data = parsed as Record<string, unknown>;
  const front = readOcrFields(data.front);
  const back = readOcrFields(data.back);
  return { ...(front ? { front } : {}), ...(back ? { back } : {}) };
}

const REQUIRED_LIVENESS_CHALLENGES = ['blink_twice', 'turn_both_sides'] as const;

function readFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

async function isReadableImage(file: File | null, buffer: ArrayBuffer | null): Promise<boolean> {
  if (!file || !file.type.startsWith('image/') || !buffer) return false;
  try {
    const metadata = await sharp(Buffer.from(buffer), { limitInputPixels: 20_000_000 }).metadata();
    return Boolean(metadata.width && metadata.height);
  } catch {
    return false;
  }
}

function contentHash(buffer: ArrayBuffer | null): string | null {
  return buffer ? createHash('sha256').update(Buffer.from(buffer)).digest('hex') : null;
}

function storageErrorDetails(error: unknown): { message: string; cause?: string; code?: string } {
  const rootMessage = error instanceof Error ? error.message : 'Unknown storage error';
  let current: unknown = error;
  let deepestMessage: string | undefined;
  let deepestCode: string | undefined;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const item = current as Record<string, unknown>;
    if (typeof item.message === 'string') deepestMessage = item.message;
    if (typeof item.code === 'string') deepestCode = item.code;
    current = item.originalError ?? item.cause;
  }
  return {
    message: rootMessage,
    ...(deepestMessage && deepestMessage !== rootMessage ? { cause: deepestMessage } : {}),
    ...(deepestCode ? { code: deepestCode } : {}),
  };
}

function isDuplicateIdConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    'code' in error && error.code === '23505' &&
    'constraint' in error && error.constraint === 'artisans_id_number_key';
}

async function safeLogFaceAttempt(entry: Parameters<typeof logFaceAttempt>[0]): Promise<void> {
  try {
    await logFaceAttempt(entry);
  } catch (error) {
    console.error('[artisan-verification] face audit log failed:', error instanceof Error ? error.message : error);
  }
}

function parseLivenessResult(value: FormDataEntryValue | null, expectedOrder: string[]): {
  status: 'passed' | 'manual_review';
  challengeOrder: string[];
  completed: string[];
} {
  if (typeof value !== 'string' || value.length > 2000) {
    return { status: 'manual_review', challengeOrder: [], completed: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) return { status: 'manual_review', challengeOrder: [], completed: [] };
    throw error;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { status: 'manual_review', challengeOrder: [], completed: [] };
  }
  const data = parsed as Record<string, unknown>;
  const readChallenges = (item: unknown) =>
    Array.isArray(item) &&
    item.every((challenge) =>
      typeof challenge === 'string' &&
      REQUIRED_LIVENESS_CHALLENGES.includes(challenge as typeof REQUIRED_LIVENESS_CHALLENGES[number]))
      ? item as string[]
      : [];
  const challengeOrder = readChallenges(data.challenge_order);
  const completed = readChallenges(data.challenges_completed);
  const completeSet = challengeOrder.length === REQUIRED_LIVENESS_CHALLENGES.length &&
    REQUIRED_LIVENESS_CHALLENGES.every((challenge) => challengeOrder.includes(challenge)) &&
    expectedOrder.length === REQUIRED_LIVENESS_CHALLENGES.length &&
    challengeOrder.every((challenge, index) => challenge === expectedOrder[index]) &&
    completed.length === challengeOrder.length &&
    challengeOrder.every((challenge, index) => completed[index] === challenge);
  return {
    status: data.status === 'passed' && completeSet ? 'passed' : 'manual_review',
    challengeOrder,
    completed,
  };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const token = String(form.get('token') ?? '');
    const d = openPending(token);
    if (!d) {
      return NextResponse.json({ status: 'error', message: 'Verification session expired. Please continue again from your artisan account.' }, { status: 410 });
    }
    const session = await getSession();
    if (!session || session.role !== 'artisan' || session.email.toLowerCase() !== (d.email ?? '').toLowerCase()) {
      return NextResponse.json({ status: 'error', message: 'Sign in to the artisan account that started this verification.' }, { status: 401 });
    }
    const existingArtisan = await getArtisanByEmail(session.email);
    if (!existingArtisan || existingArtisan.id !== session.id) {
      return NextResponse.json({ status: 'error', message: 'Your artisan profile could not be found.' }, { status: 404 });
    }

    const idType = (d.id_type ?? '').trim();
    const idFront = readFile(form.get('id_front'));
    const idBack = readFile(form.get('id_back'));
    const selfie = readFile(form.get('selfie'));
    const proofUpload = readFile(form.get('proof_of_craft'));
    const proofCraft = proofUpload &&
      (proofUpload.type.startsWith('image/') || proofUpload.type.startsWith('video/'))
      ? proofUpload
      : null;
    const sample1 = readFile(form.get('product_sample_1'));
    const sample2 = readFile(form.get('product_sample_2'));
    const affiliationProof = readFile(form.get('affiliation_proof'));
    const indigenousAffiliation = String(form.get('indigenous_affiliation') ?? d.indigenous_affiliation ?? '').trim();
    const craftType = String(form.get('craft_type') ?? d.craft_type ?? '').trim();
    const businessName = String(form.get('business_name') ?? d.business_name ?? '').trim();
    if (!proofCraft) {
      return NextResponse.json({ status: 'error', message: 'Upload a production photo or video for Proof of Craft Production.' }, { status: 400 });
    }
    if (!sample1 || !sample2) {
      return NextResponse.json({ status: 'error', message: 'Upload both required product samples.' }, { status: 400 });
    }
    if (!sample1.type.startsWith('image/') || !sample2.type.startsWith('image/')) {
      return NextResponse.json({ status: 'error', message: 'Both product samples must be photos.' }, { status: 400 });
    }
    if (indigenousAffiliation.length > 200 || craftType.length > 100 || businessName.length > 100) {
      return NextResponse.json({ status: 'error', message: 'Affiliation or craft details exceed the allowed length.' }, { status: 400 });
    }
    const uploadedFiles = [idFront, idBack, selfie, affiliationProof, proofCraft, sample1, sample2]
      .filter((file): file is File => Boolean(file));
    if (uploadedFiles.some((file) => file.size > 8 * 1024 * 1024)) {
      return NextResponse.json({ status: 'error', message: 'Each uploaded file must be under 8 MB.' }, { status: 413 });
    }

    const notes: string[] = [];
    const faceAssetsUrl = faceAssetsBaseUrl(req.url);
    const expectedChallengeOrder = (d.liveness_challenge_order ?? '').split(',');
    const liveness = parseLivenessResult(form.get('liveness_result'), expectedChallengeOrder);
    await safeLogFaceAttempt({
      email: d.email,
      result: liveness.status === 'passed' ? 'liveness_passed' : 'liveness_failed',
      detail: {
        step: 'liveness',
        status: liveness.status,
        source: 'browser_face_landmarker',
        challenge_order: liveness.challengeOrder,
        completed: liveness.completed,
      },
    });
    if (liveness.status !== 'passed') {
      notes.push('Active liveness challenges were not completed; admin must review the selfie manually.');
    }

    const [idFrontBuf, idBackBuf, selfieBuf, affiliationBuf, proofBuf, s1Buf, s2Buf] = await Promise.all([
      idFront?.arrayBuffer() ?? null,
      idBack?.arrayBuffer() ?? null,
      selfie?.arrayBuffer() ?? null,
      affiliationProof?.arrayBuffer() ?? null,
      proofCraft?.arrayBuffer() ?? null,
      sample1?.arrayBuffer() ?? null,
      sample2?.arrayBuffer() ?? null,
    ]);

    const preOcr = parseOcrData(form.get('ocr_data'));
    const ocrSides = [preOcr.front, preOcr.back].filter(
      (side): side is OcrApplicantFields => Boolean(side),
    );
    const expiryDates = [...new Set(ocrSides.map((side) => side.id_expiry_date).filter((date): date is string => Boolean(date)))];
    const expiryLabelFound = ocrSides.some((side) => side.id_expiry_label_found);
    const noExpiryDisplayed = ocrSides.length === 2 &&
      ocrSides.every((side) => side.ocr_readable) &&
      !expiryLabelFound;
    const idExpiryDate = expiryDates.length === 1 ? expiryDates[0] : null;
    const idExpiryChecked = expiryDates.length === 1 || (expiryDates.length === 0 && noExpiryDisplayed);
    if (expiryDates.length > 1) {
      notes.push('OCR found conflicting ID expiration dates; an admin must review the document.');
    }

    let verify: Awaited<ReturnType<typeof compareHumanFaces>> | { status: 'error'; message: string };
    if (idFrontBuf && selfieBuf) {
      try {
        verify = await compareHumanFaces(idFrontBuf, selfieBuf, faceAssetsUrl);
      } catch (cause) {
        verify = { status: 'error', message: cause instanceof Error ? cause.message : 'Unknown Human.js error.' };
      }
    } else {
      verify = { status: 'error', message: 'ID front or selfie was not submitted.' };
    }

    let faceMatch: boolean | null = null;
    let selfieEmbedding: number[] | null = null;
    let faceConfidence: number | null = null;
    if (verify.status === 'ok') {
      faceMatch = verify.match;
      faceConfidence = verify.similarity;
      if (verify.match) selfieEmbedding = verify.selfie_embedding;
      if (!verify.match) {
        await safeLogFaceAttempt({ email: d.email, result: 'no_match', distance: verify.distance, confidence: verify.similarity, detail: { step: 'verify', model: 'human.js' } });
        notes.push(`Human.js face match score ${Math.round(verify.similarity * 100)}% — submitted for manual admin review.`);
      } else {
        await safeLogFaceAttempt({ email: d.email, result: 'match', distance: verify.distance, confidence: verify.similarity, detail: { step: 'verify', model: 'human.js' } });
      }
    } else if (verify.status === 'error') {
      await safeLogFaceAttempt({ email: d.email, result: 'error', detail: { step: 'verify', message: verify.message } });
      notes.push('Human.js face check could not complete; admin review is required.');
    } else if (verify.status === 'no_face') {
      await safeLogFaceAttempt({ email: d.email, result: 'error', detail: { step: 'verify', message: verify.message } });
      notes.push(`Human.js could not verify the ID/selfie (${verify.message}) — submitted for manual admin review.`);
    }

    let duplicateOf: number | null = null;
    let duplicateFaceMatch: boolean | null = null;
    if (selfieEmbedding) {
      if (!faceEmbeddingEncryptionConfigured()) {
        await safeLogFaceAttempt({
          email: d.email,
          result: 'error',
          detail: { step: 'duplicate', message: 'No biometric-template encryption secret is configured.' },
        });
        notes.push('Secure duplicate-face check was unavailable; admin must review the selfie manually.');
        selfieEmbedding = null;
      } else try {
        const stored = await listFaceEmbeddings();
        const duplicate = await findDuplicateHumanEmbedding(
          selfieEmbedding,
          stored,
          existingArtisan.id,
          faceAssetsUrl,
        );
        duplicateFaceMatch = Boolean(duplicate);
        if (duplicate) {
          duplicateOf = duplicate.artisanId;
          await safeLogFaceAttempt({ email: d.email, artisanId: duplicateOf, result: 'duplicate', confidence: duplicate.similarity, detail: { step: 'duplicate', model: 'human.js' } });
          notes.push('A possible duplicate face was found; admin review is required.');
        } else {
          await safeLogFaceAttempt({
            email: d.email,
            result: 'not_duplicate',
            detail: { step: 'duplicate', model: 'human.js' },
          });
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Unknown biometric template error.';
        await safeLogFaceAttempt({ email: d.email, result: 'error', detail: { step: 'duplicate', message } });
        notes.push('Secure duplicate-face check was unavailable; admin must review the selfie manually.');
      }
    } else {
      await safeLogFaceAttempt({
        email: d.email,
        result: verify.status === 'error' ? 'error' : 'skipped',
        detail: { step: 'duplicate', reason: 'human_face_embedding_unavailable' },
      });
    }

    const normalizedIdNumber = (preOcr.front?.id_number ?? preOcr.back?.id_number ?? d.id_number ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    let duplicateId: boolean | null = null;
    if (normalizedIdNumber) {
      try {
        duplicateId = await hasDuplicateArtisanIdNumber(normalizedIdNumber, existingArtisan.id);
      } catch (error) {
        console.error('[artisan-verification] duplicate ID check failed:', error instanceof Error ? error.message : error);
        notes.push('Duplicate ID check could not be completed; admin review is required.');
      }
    }

    const [idFrontReadable, idBackReadable, proofReadable, sample1Readable, sample2Readable] = await Promise.all([
      isReadableImage(idFront, idFrontBuf),
      isReadableImage(idBack, idBackBuf),
      proofCraft?.type.startsWith('image/') ? isReadableImage(proofCraft, proofBuf) : Promise.resolve(false),
      isReadableImage(sample1, s1Buf),
      isReadableImage(sample2, s2Buf),
    ]);

    let idFrontPath: string | null = null;
    let idBackPath: string | null = null;
    let selfiePath: string | null = null;
    let affiliationPath: string | null = null;
    let proofPath: string | null = null;
    let s1Path: string | null = null;
    let s2Path: string | null = null;
    const safeEmail = (d.email ?? 'applicant').replace(/[^a-z0-9]/gi, '_');
    const uploadOne = async (file: File | null, buffer: ArrayBuffer | null, name: string): Promise<string | null> => {
      if (!file || !buffer) return null;
      try {
        const result = await uploadFile(
          'verification-docs',
          `${safeEmail}/${Date.now()}-${name}`,
          buffer,
          file.type || 'application/octet-stream',
        );
        return result.path;
      } catch (error) {
        console.error(`[artisan-verification] ${name} upload failed:`, storageErrorDetails(error));
        notes.push(`${name} could not be stored; admin review is required.`);
        return null;
      }
    };
    [idFrontPath, idBackPath, selfiePath, affiliationPath, proofPath, s1Path, s2Path] = await Promise.all([
      uploadOne(idFront, idFrontBuf, 'id-front'),
      uploadOne(idBack, idBackBuf, 'id-back'),
      uploadOne(selfie, selfieBuf, 'selfie'),
      uploadOne(affiliationProof, affiliationBuf, 'affiliation-proof'),
      uploadOne(proofCraft, proofBuf, 'proof-of-craft'),
      uploadOne(sample1, s1Buf, 'product-sample-1'),
      uploadOne(sample2, s2Buf, 'product-sample-2'),
    ]);
    if (!proofPath) {
      return NextResponse.json({
        status: 'error',
        message: 'Proof of Craft Production could not be uploaded to Supabase Storage. Please submit again.',
      }, { status: 500 });
    }
    if (!s1Path || !s2Path) {
      return NextResponse.json({
        status: 'error',
        message: 'The product sample photos could not be uploaded to Supabase Storage. Please submit again.',
      }, { status: 500 });
    }

    const detectedTypes = [...new Set(
      [preOcr.front?.detected_id_type, preOcr.back?.detected_id_type].filter((value): value is string => Boolean(value)),
    )];
    const detectedIdType = detectedTypes.length === 1 ? detectedTypes[0] : null;
    const idDocumentsReadable = Boolean(
      idFrontPath && idBackPath &&
      idFrontReadable && idBackReadable &&
      preOcr.front?.ocr_readable && preOcr.back?.ocr_readable,
    );
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const idExpiryStatus = idExpiryDate
      ? idExpiryDate < today ? 'expired' as const : 'valid' as const
      : idExpiryChecked ? 'valid' as const : 'unknown' as const;
    const sampleHashes = [contentHash(s1Buf), contentHash(s2Buf)];
    const productSamplesStatus = Boolean(
      s1Path && s2Path && sample1Readable && sample2Readable &&
      sampleHashes[0] && sampleHashes[1] && sampleHashes[0] !== sampleHashes[1],
    ) ? 'pass' as const : 'fail' as const;
    const proofOfCraftStatus = Boolean(
      proofPath && proofCraft && (
        (proofCraft.type.startsWith('image/') && proofReadable) ||
        (proofCraft.type.startsWith('video/') && Boolean(proofBuf && proofBuf.byteLength > 0))
      ),
    ) ? 'pass' as const : 'review' as const;
    const extractedDob = preOcr.front?.dob ?? preOcr.back?.dob ?? null;
    const selectedIdNumber = preOcr.front?.id_number ?? preOcr.back?.id_number ?? d.id_number ?? '';
    let verificationCriteria = evaluateVerificationRules({
      idType,
      detectedIdType,
      idDocumentsReadable,
      idExpiryStatus,
      ocrFront: preOcr.front,
      ocrBack: preOcr.back,
      accountName: d.name,
      enteredIdNumber: d.id_number,
      duplicateId,
      livenessPassed: liveness.status === 'passed',
      faceMatched: faceMatch,
      duplicateFaceMatch,
      dob: extractedDob ?? d.dob,
      dobFromOcr: Boolean(extractedDob),
      idAddress: d.location?.trim() || preOcr.front?.address || preOcr.back?.address || null,
      proofOfCraftStatus,
      productSamplesStatus,
      craftType,
      businessName,
      indigenousAffiliation,
    });
    let decision = verificationDecision(verificationCriteria);
    let verificationStatus: 'approved' | 'pending' = decision === 'auto_approved' ? 'approved' : 'pending';
    const makeRegistrationNotes = () => {
      const reviewReasons = verificationCriteria
        .filter((criterion) => criterion.status !== 'pass')
        .map((criterion) => `${criterion.id}: ${criterion.detail}`);
      return [...notes, ...reviewReasons].join(' ') || null;
    };
    let registrationNotes = makeRegistrationNotes();
    const createApplication = (idNumber: string) => createArtisan({
      name: d.name ?? '',
      email: d.email ?? '',
      password: '',
      phone: d.phone ?? '',
      location: (d.location ?? preOcr.front?.address ?? preOcr.back?.address ?? '').trim(),
      craft_type: craftType,
      business_name: businessName,
      id_number: idNumber,
      dob: extractedDob ?? d.dob,
      id_expiry_date: idExpiryDate,
      id_expiry_checked: idExpiryChecked,
      id_type: idType,
      indigenous_affiliation: indigenousAffiliation,
      affiliation_document_path: affiliationPath,
      id_document_path: idFrontPath,
      id_document_back_path: idBackPath,
      proof_of_craft_path: proofPath,
      product_sample_1_path: s1Path,
      product_sample_2_path: s2Path,
      selfie_path: selfiePath,
      face_matched: faceMatch,
      face_confidence: faceConfidence,
      duplicate_face_match: duplicateFaceMatch,
      liveness_status: liveness.status,
      liveness_challenges: liveness.completed,
      liveness_verified_at: liveness.status === 'passed' ? new Date().toISOString() : null,
      registration_notes: registrationNotes,
      verification_criteria: verificationCriteria,
      verification_decision: decision,
      verification_status: verificationStatus,
      proof_of_craft_media_type: proofPath ? proofCraft?.type ?? null : null,
    });

    let artisanId: number;
    try {
      artisanId = await createApplication(duplicateId === false ? selectedIdNumber : '');
    } catch (error) {
      if (!isDuplicateIdConflict(error) || duplicateId !== false) throw error;
      duplicateId = true;
      verificationCriteria = verificationCriteria.map((criterion) => criterion.id === '5'
        ? {
          ...criterion,
          status: 'fail',
          detail: 'ID number was registered concurrently by another artisan account',
        }
        : criterion);
      decision = 'manual_review';
      verificationStatus = 'pending';
      registrationNotes = makeRegistrationNotes();
      artisanId = await createApplication('');
    }

    if (selfieEmbedding && duplicateFaceMatch === false) {
      try {
        await saveFaceEmbedding(artisanId, selfieEmbedding);
      } catch (cause) {
        await safeLogFaceAttempt({ email: d.email, artisanId, result: 'error', detail: { step: 'store_embedding' } });
        try {
          await appendArtisanRegistrationNote(artisanId, 'Encrypted face template could not be stored; duplicate checks require manual review.');
        } catch (error) {
          console.error('[artisan-verification] failed to record embedding storage warning:', error instanceof Error ? error.message : error);
        }
      }
    }

    try {
      await logActivity({
        userId: artisanId,
        role: 'artisan',
        userName: d.name ?? '',
        action: 'registration',
        description: `New artisan submitted verification: ${d.name} (${d.email}) - Decision: ${decision}${faceMatch ? ' - face verified' : ''}`,
      });
    } catch (error) {
      console.error('[artisan-verification] activity log failed:', error instanceof Error ? error.message : error);
    }
    if (decision === 'auto_approved') {
      try {
        await pushNotification({
          userId: artisanId,
          role: 'artisan',
          type: 'verification_update',
          message: 'Your artisan account passed all verification criteria and is now approved.',
        });
      } catch (error) {
        console.error('[artisan-verification] approval notification failed:', error instanceof Error ? error.message : error);
      }
    }

    return NextResponse.json({
      status: 'success',
      message: decision === 'auto_approved'
        ? 'All verification criteria passed. Your artisan account is now verified.'
        : 'Your application was submitted for manual admin review.',
      requires_approval: decision !== 'auto_approved',
      verification_decision: decision,
      verification_status: verificationStatus,
      face_verified: faceMatch === true,
      duplicate_of: duplicateOf,
      criteria: verificationCriteria,
    });
  } catch (e) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? e.code : undefined;
    const constraint = typeof e === 'object' && e !== null && 'constraint' in e ? e.constraint : undefined;
    if (code === '23505' && constraint === 'artisans_id_number_key') {
      return NextResponse.json(
        { status: 'error', message: 'The ID number is already in use. Your application could not be saved; contact support for manual review.' },
        { status: 500 }
      );
    }
    console.error('Artisan registration failed:', e);
    return NextResponse.json({ status: 'error', message: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
