import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getVerifiedArtisanSession } from '@/lib/artisanAuth';
import { markNotificationsRead } from '@/lib/db';

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: 'error' }, { status: 401 });
  if (session.role === 'artisan' && !await getVerifiedArtisanSession()) {
    return NextResponse.json({ status: 'error', message: 'Artisan verification is required.' }, { status: 403 });
  }
  await markNotificationsRead(session.id, session.role);
  return NextResponse.json({ status: 'success' });
}
