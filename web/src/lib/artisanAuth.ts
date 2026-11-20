import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getArtisan } from '@/lib/db';

export async function hasVerifiedArtisanAccess(artisanId: number): Promise<boolean> {
  const artisan = await getArtisan(artisanId);
  return artisan?.verification_status === 'approved';
}

export async function requireVerifiedArtisan(artisanId: number): Promise<void> {
  if (!await hasVerifiedArtisanAccess(artisanId)) redirect('/artisan/dashboard');
}

export async function getVerifiedArtisanSession() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') return null;
  return await hasVerifiedArtisanAccess(session.id) ? session : null;
}
