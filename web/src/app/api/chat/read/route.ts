import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getVerifiedArtisanSession } from '@/lib/artisanAuth';
import { markArtisanMessagesRead } from '@/lib/db';

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') {
    return NextResponse.json({ status: 'error' }, { status: 401 });
  }
  if (!await getVerifiedArtisanSession()) {
    return NextResponse.json({ status: 'error', message: 'Artisan verification is required.' }, { status: 403 });
  }
  await markArtisanMessagesRead(session.id);
  return NextResponse.json({ status: 'success' });
}
