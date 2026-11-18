import { NextResponse } from 'next/server';
import { verifyFace } from '@/lib/faceVerify';
import { logFaceAttempt } from '@/lib/faceLogs';

// Live preview: selfie vs ID front, called from the capture screen so the
// applicant can retake immediately. Final gate is server-side in /captures.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const idImage = form.get('id_image') as File | null;
    const selfie = form.get('selfie') as File | null;
    if (!idImage || !selfie) {
      return NextResponse.json(
        { status: 'error', match: false, message: 'Need ID image and selfie.' },
        { status: 400 }
      );
    }

    const result = await verifyFace(await idImage.arrayBuffer(), await selfie.arrayBuffer());
    if (result.status === 'ok') {
      const pct = Math.round(result.data.confidence * 100);
      return NextResponse.json({
        status: 'ok',
        match: Boolean(result.data.match),
        confidence: result.data.confidence,
        distance: result.data.distance,
        message: result.data.match
          ? `Face matched your ID photo (${pct}% confidence).`
          : `Face did not match ID photo (${pct}% match score). You can retake or proceed with manual review.`,
      });
    }
    if (result.status === 'skipped') {
      return NextResponse.json({
        status: 'skipped',
        match: false,
        skipped: true,
        message: 'Face comparison service is offline. Photo saved for manual admin review.',
      });
    }

    await logFaceAttempt({ result: 'error', detail: { step: 'preview', message: result.message } });

    const isNoFace = result.message?.toLowerCase().includes('no face') || result.message?.toLowerCase().includes('face found');
    if (isNoFace) {
      return NextResponse.json({
        status: 'no_face',
        match: false,
        no_face: true,
        message: 'No face was detected in one or both images. Ensure your face and ID photo are clear and well-lit.',
      });
    }
    return NextResponse.json({
      status: 'error',
      match: false,
      message: 'Automatic face comparison is unavailable. You may continue; an admin will review your ID and selfie.',
    });
  } catch (err) {
    console.error('Face preview failed:', err);
    return NextResponse.json({
      status: 'error',
      match: false,
      message: 'Automatic face comparison is unavailable. You may continue; an admin will review your ID and selfie.',
    }, { status: 500 });
  }
}
