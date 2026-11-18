import { NextResponse } from 'next/server';
import {
  appendArtisanRegistrationNote,
  createArtisan,
  getArtisanByEmail,
  logActivity,
  findUserByEmail,
  hashPassword,
} from '@/lib/db';

import { openPending } from '@/lib/pendingToken';
import type { OcrApplicantFields } from '@/lib/ocrFields';
import { VALID_ARTISAN_ID_TYPES } from '@/lib/validArtisanIdTypes';
import { verifyFace, checkDuplicateFace } from '@/lib/faceVerify';
import { faceEmbeddingEncryptionConfigured, listFaceEmbeddings, saveFaceEmbedding } from '@/lib/faceEmbeddings';
import { logFaceAttempt } from '@/lib/faceLogs';
import { uploadFile } from '@/lib/storage';

// In-memory pending-artisan handoff shared with ../route.ts.s
declare global {
  // eslint-disable-next-line no-var
  var __pendingArtisans: Map<string, { data: Record<string, string>; expires: number }> | undefined;
}

export const maxDuration = 60;

function readOcrFields(value: unknown): OcrApplicantFields | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const fields = value as Record<string, unknown>;
  const read = (key: keyof OcrApplicantFields, maxLength: number) => {
    const field = fields[key];
    return typeof field === 'string' && field.trim() ? field.trim().slice(0, maxLength) : null;
  };
  const result = {
    full_name: read('full_name', 100),
    id_number: read('id_number', 40),
    dob: read('dob', 10),
    address: read('address', 200),
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
  return NextResponse.json({ status: 'error', message: 'Registration session expired. Please start again.' }, { status: 410 });
}
// A token can be reused until it expires, so refuse if this email already registered.
if (await findUserByEmail(d.email ?? '')) {
  return NextResponse.json({ status: 'error', message: 'This email is already registered.' }, { status: 409 });
}

    const idType = (d.id_type ?? '').trim();
    if (!VALID_ARTISAN_ID_TYPES.some((acceptedType) => acceptedType === idType)) {
      return NextResponse.json({ status: 'error', message: 'Select an accepted ID type before submitting.' }, { status: 400 });
    }
    if (!(d.location ?? '').trim()) {
      return NextResponse.json({ status: 'error', message: 'The address shown on your ID is required.' }, { status: 400 });
    }

    const idFrontValue = form.get('id_front');
    const idBackValue = form.get('id_back');
    if (
      !(idFrontValue instanceof File) || idFrontValue.size === 0 || !idFrontValue.type.startsWith('image/') ||
      !(idBackValue instanceof File) || idBackValue.size === 0 || !idBackValue.type.startsWith('image/')
    ) {
      return NextResponse.json({ status: 'error', message: 'Upload image files of both sides of your selected ID.' }, { status: 400 });
    }
    const idFront = idFrontValue;
    const idBack = idBackValue;
    const selfie = form.get('selfie') as File | null;
    // Deterministic verification rules R4-R6: proof of craft production and at
    // least two product samples are REQUIRED — registration is refused without them.
    const proofCraft = form.get('proof_of_craft') as File | null;
    const sample1 = form.get('product_sample_1') as File | null;
    const sample2 = form.get('product_sample_2') as File | null;
    const affiliationProof = form.get('affiliation_proof') as File | null;
    const indigenousAffiliation = String(form.get('indigenous_affiliation') ?? d.indigenous_affiliation ?? '').trim();
    const craftType = String(form.get('craft_type') ?? d.craft_type ?? '').trim();
    const businessName = String(form.get('business_name') ?? d.business_name ?? '').trim();
    if (!selfie) {
      return NextResponse.json({ status: 'error', message: 'A live selfie is required.' }, { status: 400 });
    }
    if (!proofCraft || !sample1 || !sample2) {
      return NextResponse.json({ status: 'error', message: 'Proof of craft production and two product samples are required for verification.' }, { status: 400 });
    }
    if (!indigenousAffiliation || !affiliationProof || !craftType) {
      return NextResponse.json({ status: 'error', message: 'Indigenous affiliation, affiliation evidence, and craft specialization are required.' }, { status: 400 });
    }
    if (indigenousAffiliation.length > 200 || craftType.length > 100 || businessName.length > 100) {
      return NextResponse.json({ status: 'error', message: 'Affiliation or craft details exceed the allowed length.' }, { status: 400 });
    }
    for (const f of [idFront, idBack, selfie, affiliationProof, proofCraft, sample1, sample2]) {
      if (f.size > 8 * 1024 * 1024) return NextResponse.json({ status: 'error', message: 'Each image must be under 8 MB.' }, { status: 400 });
    }

    const notes: string[] = [];
    const warnings: string[] = [];
    const expectedChallengeOrder = (d.liveness_challenge_order ?? '').split(',');
    const liveness = parseLivenessResult(form.get('liveness_result'), expectedChallengeOrder);
    await logFaceAttempt({
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
      warnings.push('Active liveness was not verified. An admin will review the application.');
    }

    const [idFrontBuf, idBackBuf, selfieBuf, affiliationBuf, proofBuf, s1Buf, s2Buf] = await Promise.all([
      idFront.arrayBuffer(), idBack.arrayBuffer(), selfie.arrayBuffer(),
      affiliationProof.arrayBuffer(), proofCraft.arrayBuffer(), sample1.arrayBuffer(), sample2.arrayBuffer(),
    ]);

    const preOcr = parseOcrData(form.get('ocr_data'));
    if (preOcr.front || preOcr.back) {
      notes.push('Applicant details were extracted by on-device OCR; results are advisory and require admin review.');
    }

    const verify = await verifyFace(idFrontBuf, selfieBuf);
    if (preOcr.front?.id_number) {
      const found = preOcr.front.id_number.replace(/[\s-]/g, '').toUpperCase();
      const given = (d.id_number ?? '').replace(/[\s-]/g, '').toUpperCase();
      if (given && found !== given) {
        notes.push('On-device OCR read an ID number that differs from the applicant-entered number.');
      }
    }

    // ---- Face verification (result from the parallel block above) ----
    let faceMatch: boolean | null = null;
    let selfieEmbedding: number[] | null = null;
    let faceConfidence: number | null = null;
    if (verify.status === 'ok') {
      faceMatch = verify.data.match;
      faceConfidence = verify.data.confidence;
      selfieEmbedding = verify.data.selfie_embedding;
      if (!verify.data.match) {
        await logFaceAttempt({ email: d.email, result: 'no_match', distance: verify.data.distance, confidence: verify.data.confidence, detail: { step: 'verify' } });
        notes.push(`Face auto-match score ${Math.round(verify.data.confidence * 100)}% (distance ${verify.data.distance}) — submitted for manual admin review.`);
        warnings.push('Automatic face check did not reach the confidence threshold; an admin will review your photos manually.');
      } else {
        await logFaceAttempt({ email: d.email, result: 'match', distance: verify.data.distance, confidence: verify.data.confidence, detail: { step: 'verify' } });
      }
    } else if (verify.status === 'error') {
      await logFaceAttempt({ email: d.email, result: 'error', detail: { step: 'verify', message: verify.message } });
      notes.push(`Face check issue (${verify.message}) — submitted for manual admin review.`);
      warnings.push('Automatic face check could not complete; an admin will verify your documents manually.');
    } else {
      notes.push('Face service not configured — submitted for manual admin review.');
    }

    // ---- 3. Duplicate-face check against existing artisans ----
    let duplicateOf: number | null = null;
    let duplicateFaceMatch: boolean | null = null;
    if (selfieEmbedding) {
      if (!faceEmbeddingEncryptionConfigured()) {
        await logFaceAttempt({
          email: d.email,
          result: 'error',
          detail: { step: 'duplicate', message: 'No biometric-template encryption secret is configured.' },
        });
        notes.push('Secure duplicate-face check was unavailable; admin must review the selfie manually.');
        warnings.push('Secure duplicate-face check could not complete. An admin will review the application.');
        selfieEmbedding = null;
      } else try {
        const stored = await listFaceEmbeddings();
        const dup = await checkDuplicateFace(selfieBuf, stored);
        if (dup.status === 'ok') {
          duplicateFaceMatch = dup.data.is_duplicate;
          if (dup.data.is_duplicate) {
            duplicateOf = dup.data.matched_artisan_id;
            await logFaceAttempt({ email: d.email, artisanId: duplicateOf, result: 'duplicate', distance: dup.data.distance, detail: { step: 'duplicate' } });
            return NextResponse.json({ status: 'error', message: 'This face is already registered to another artisan account.' }, { status: 409 });
          }
          await logFaceAttempt({ email: d.email, result: 'not_duplicate', distance: dup.data.distance, detail: { step: 'duplicate' } });
        } else {
          await logFaceAttempt({
            email: d.email,
            result: dup.status,
            detail: { step: 'duplicate', ...(dup.status === 'error' ? { message: dup.message } : {}) },
          });
          notes.push('Duplicate-face check was unavailable; admin must review the selfie manually.');
          warnings.push('Duplicate-face check could not complete. An admin will review the application.');
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Unknown biometric template error.';
        await logFaceAttempt({ email: d.email, result: 'error', detail: { step: 'duplicate', message } });
        notes.push('Secure duplicate-face check was unavailable; admin must review the selfie manually.');
        warnings.push('Secure duplicate-face check could not complete. An admin will review the application.');
      }
    } else {
      await logFaceAttempt({
        email: d.email,
        result: verify.status === 'skipped' ? 'skipped' : 'error',
        detail: { step: 'duplicate', reason: 'face_embedding_unavailable' },
      });
      notes.push('Duplicate-face check was skipped; admin must review the selfie manually.');
      warnings.push('Duplicate-face check was skipped. An admin will review the application.');
    }

    // ---- 4. Store verification documents (skipped without Storage keys) ----
    let idFrontPath: string | null = null;
    let idBackPath: string | null = null;
    let selfiePath: string | null = null;
    let affiliationPath: string | null = null;
    let proofPath: string | null = null;
    let s1Path: string | null = null;
    let s2Path: string | null = null;
    const safeEmail = (d.email ?? 'applicant').replace(/[^a-z0-9]/gi, '_');
    try {
      const up = async (f: File, buf: ArrayBuffer, name: string) => {
        const r = await uploadFile('verification-docs', `${safeEmail}/${Date.now()}-${name}`, buf, f.type || 'image/jpeg');
        return r.path;
      };
      [idFrontPath, idBackPath, selfiePath, affiliationPath, proofPath, s1Path, s2Path] = await Promise.all([
        up(idFront, idFrontBuf, 'id-front'),
        up(idBack, idBackBuf, 'id-back'),
        up(selfie, selfieBuf, 'selfie'),
        up(affiliationProof, affiliationBuf, 'affiliation-proof'),
        up(proofCraft, proofBuf, 'proof-of-craft'),
        up(sample1, s1Buf, 'product-sample-1'),
        up(sample2, s2Buf, 'product-sample-2'),
      ]);
      if (!idFrontPath) notes.push('File storage not configured - documents not retained; admin will request them separately.');
    } catch (e) {
      notes.push('Document upload failed; an admin may contact you for re-submission.');
      if (e instanceof Error) notes.push(`(${e.message})`);
    }
    // Hash the password before saving the artisan account.
const passwordHash = await hashPassword(d.password ?? '');

    // ---- 5. Create the pending artisan ----
    // ---- 5. Create the pending artisan ----
const artisanId = await createArtisan({
  name: d.name ?? '',
  email: d.email ?? '',
  password: passwordHash,
  phone: d.phone ?? '',
  location: d.location ?? '',
  craft_type: craftType,
  business_name: businessName,
  id_number: d.id_number ?? '',
  dob: d.dob,
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
  registration_notes: notes.join(' ') || null,
});

if (selfieEmbedding) {
  try {
    await saveFaceEmbedding(artisanId, selfieEmbedding);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unknown biometric template storage error.';
    await logFaceAttempt({ email: d.email, artisanId, result: 'error', detail: { step: 'store_embedding', message } });
    await appendArtisanRegistrationNote(artisanId, 'Encrypted face template could not be stored; duplicate checks require manual review.');
  }
}

await logActivity({
  userId: artisanId,
  role: 'artisan',
  userName: d.name ?? '',
  action: 'registration',
  description: `New artisan registered: ${d.name} (${d.email}) - Status: pending${faceMatch ? ' - face verified' : ''}`,
});
    
    return NextResponse.json({
      status: 'success',
      message: 'Registration submitted! Your account is pending admin approval.',
      requires_approval: true,
      face_verified: faceMatch === true,
      duplicate_of: duplicateOf,
    });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? `Registration failed: ${e.message}` : 'Registration failed. Please try again.' }, { status: 500 });
  }
}
