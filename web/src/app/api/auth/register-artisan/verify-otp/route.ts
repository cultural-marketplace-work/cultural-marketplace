import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import {
  createUnverifiedArtisan,
  deletePendingRegistration,
  hashPassword,
  isEmailRegistered,
  logActivity,
  takePendingRegistration,
} from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email: rawEmail, otp } = (await req.json()) as { email?: string; otp?: string };
    const email = (rawEmail ?? '').trim().toLowerCase();
    if (!email || !otp) {
      return NextResponse.json({ status: 'error', message: 'Enter your email and 6-digit code.' }, { status: 400 });
    }
    const pending = await takePendingRegistration(email);
    if (!pending) {
      return NextResponse.json({ status: 'error', message: 'Your registration expired. Please register again.' }, { status: 404 });
    }
    if (pending.expires < Date.now()) {
      return NextResponse.json({ status: 'error', message: 'This code has expired. Request a new one and try again.' }, { status: 400 });
    }
    if (pending.otp !== otp) {
      return NextResponse.json({ status: 'error', message: 'That code is not correct. Please try again.' }, { status: 400 });
    }
    if (await isEmailRegistered(email)) {
      await deletePendingRegistration(email);
      return NextResponse.json({ status: 'error', message: 'This email already has a Cultural Marketplace account. Please sign in instead.' }, { status: 409 });
    }

    const id = await createUnverifiedArtisan({
      name: pending.name,
      email,
      phone: pending.phone,
      password: await hashPassword(pending.password),
    });
    await deletePendingRegistration(email);
    await createSession({ id, name: pending.name, role: 'artisan', email, profile_picture: null });
    await logActivity({
      userId: id, role: 'artisan', userName: pending.name, action: 'registration',
      description: `Artisan account registered: ${pending.name} (${email}) - verification not submitted`,
    });
    return NextResponse.json({ status: 'success', redirect: '/artisan/dashboard' });
  } catch (error) {
    console.error('Artisan email verification failed:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json({ status: 'error', message: 'This email is already registered. Please sign in instead.' }, { status: 409 });
    }
    return NextResponse.json({ status: 'error', message: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
