import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/db';
import { sealPending } from '@/lib/pendingToken';
import { VALID_ARTISAN_ID_TYPES } from '@/lib/validArtisanIdTypes';

// Fields carried from the text step to the capture step (inside the encrypted token).
const FIELDS = [
  'name',
  'email',
  'password',
  'phone',
  'location',
  'id_type',
  'craft_type',
  'business_name',
  'indigenous_affiliation',
  'id_number',
  'dob',
  'liveness_challenge_order',
] as const;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, string>;
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim();
    const password = body.password ?? '';
    const idType = (body.id_type ?? '').trim();
    const address = (body.location ?? '').trim();
    if (!name || !email || !password) {
      return NextResponse.json({ status: 'error', message: 'Please complete all required fields.' }, { status: 400 });
    }
    if (!VALID_ARTISAN_ID_TYPES.some((acceptedType) => acceptedType === idType)) {
      return NextResponse.json({ status: 'error', message: 'Choose one of the accepted ID types.' }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ status: 'error', message: 'Enter the address shown on your ID.' }, { status: 400 });
    }
    const requestedChallengeOrder = (body.liveness_challenge_order ?? '').split(',');
    const challengeOrder = requestedChallengeOrder.length === 2 &&
      requestedChallengeOrder.includes('blink_twice') &&
      requestedChallengeOrder.includes('turn_both_sides')
      ? requestedChallengeOrder
      : randomBytes(1)[0] % 2 === 0
        ? ['blink_twice', 'turn_both_sides']
        : ['turn_both_sides', 'blink_twice'];
    if (await findUserByEmail(email)) {
      return NextResponse.json({ status: 'error', message: 'This email is already registered.' }, { status: 409 });
    }

    const data: Record<string, string> = {};
    for (const f of FIELDS) {
      if (typeof body[f] === 'string') data[f] = body[f];
    }
    data.id_type = idType;
    data.location = address;
    data.liveness_challenge_order = challengeOrder.join(',');

    // Stateless, encrypted token (valid 15 minutes) - works across serverless instances.
    const token = sealPending(data);

    return NextResponse.json({
      status: 'success',
      token,
      liveness_challenge_order: challengeOrder,
      services: {
        ocr: true,
        face: Boolean(process.env.FACE_API_URL),
        storage: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
    });
  } catch (error) {
    console.error('Failed to start artisan registration:', error);
    if (error instanceof Error && error.message.startsWith('No server secret configured for registration tokens.')) {
      return NextResponse.json(
        { status: 'error', message: 'Artisan registration is not configured. Set PENDING_TOKEN_SECRET or JWT_SECRET on the server.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ status: 'error', message: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
