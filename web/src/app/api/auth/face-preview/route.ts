import { NextResponse } from 'next/server';
import { compareHumanFaces } from '@/lib/humanFaceVerification';
import { logFaceAttempt } from '@/lib/faceLogs';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Live preview: Human.js compares the ID portrait and captured selfie.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const idImage = form.get('id_image') as File | null;
    const selfie = form.get('selfie') as File | null;
    if (
      !idImage || !selfie ||
      idImage.size === 0 || selfie.size === 0 ||
      idImage.size > 8 * 1024 * 1024 || selfie.size > 8 * 1024 * 1024 ||
      !idImage.type.startsWith('image/') || !selfie.type.startsWith('image/')
    ) {
      return NextResponse.json(
        { status: 'error', match: false, message: 'Upload image files of the ID and selfie, each under 8 MB.' },
        { status: 400 }
      );
    }

    const result = await compareHumanFaces(await idImage.arrayBuffer(), await selfie.arrayBuffer());
    if (result.status === 'ok') {
      const pct = Math.round(result.similarity * 100);
      return NextResponse.json({
        status: 'ok',
        match: result.match,
        confidence: result.similarity,
        distance: result.distance,
        message: result.match
          ? `Face matched your ID photo (${pct}% confidence).`
          : `Face did not match ID photo (${pct}% match score). You can retake or proceed with manual review.`,
      });
    }
    return NextResponse.json({ status: 'no_face', match: false, no_face: true, message: result.message });
  } catch (err) {
    console.error('Face preview failed:', err);
    await logFaceAttempt({
      result: 'error',
      detail: { step: 'preview', message: err instanceof Error ? err.message : 'Unknown Human.js error.' },
    });
    return NextResponse.json({
      status: 'error',
      match: false,
      message: 'Human.js face comparison is unavailable. You may continue; an admin will review your ID and selfie.',
    }, { status: 500 });
  }
}
