import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getArtisan, getArtisanByEmail } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sealPending } from '@/lib/pendingToken';
import { VALID_ARTISAN_ID_TYPES } from '@/lib/validArtisanIdTypes';

// Fields carried from the text step to the capture step (inside the encrypted token).
const FIELDS = [
  'name',
  'email',
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
    const idType = (body.id_type ?? '').trim();
    const address = (body.location ?? '').trim();
    const session = await getSession();
    if (!session || session.role !== 'artisan' || session.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ status: 'error', message: 'Sign in to your artisan account before submitting verification.' }, { status: 401 });
    }
    const user = await getArtisan(session.id);
    const artisan = await getArtisanByEmail(session.email);
    if (!user || !artisan) {
      return NextResponse.json({ status: 'error', message: 'Your artisan account could not be found.' }, { status: 404 });
    }
    if (!name || name !== user.name) {
      return NextResponse.json({ status: 'error', message: 'Your account name could not be verified.' }, { status: 400 });
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
    const data: Record<string, string> = {};
    for (const f of FIELDS) {
      if (typeof body[f] === 'string') data[f] = body[f];
    }
    data.name = user.name;
    data.email = user.email;
    data.phone = user.phone ?? '';
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
