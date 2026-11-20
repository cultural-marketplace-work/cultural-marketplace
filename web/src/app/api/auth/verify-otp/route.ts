import { NextResponse } from 'next/server';
import { takePendingRegistration, deletePendingRegistration, createCustomer, logActivity, isEmailRegistered, hashPassword } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email: rawEmail, otp } = (await req.json()) as { email?: string; otp?: string };
    const email = (rawEmail ?? '').trim().toLowerCase();
    if (!email || !otp) {
      return NextResponse.json({ status: 'error', message: 'Missing email or OTP.' }, { status: 400 });
    }
    const pending = await takePendingRegistration(email);
    if (!pending) {
      return NextResponse.json({ status: 'error', message: 'Session expired or not found. Please register again.' }, { status: 404 });
    }
    if (pending.otp !== otp) {
      return NextResponse.json({ status: 'error', message: 'Invalid OTP code. Please try again.' }, { status: 400 });
    }
    if (pending.expires < Date.now()) {
      return NextResponse.json({ status: 'error', message: 'OTP has expired. Please click Resend OTP to get a new one.' }, { status: 400 });
    }
    if (await isEmailRegistered(email)) {
      await deletePendingRegistration(email);
      return NextResponse.json({ status: 'error', message: 'This email was just registered. Please log in instead.' }, { status: 409 });
    }

    const id = await createCustomer({ name: pending.name, email, password: await hashPassword(pending.password), phone: pending.phone });
    await deletePendingRegistration(email);
    await createSession({ id, name: pending.name, role: 'customer', email, profile_picture: null });
    await logActivity({ userId: id, role: 'customer', userName: pending.name, action: 'registration', description: `New customer registered: ${pending.name} (${email})` });
    return NextResponse.json({ status: 'success', redirect: '/customer/account/dashboard' });
  } catch (error) {
    console.error('Customer email verification failed:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json({ status: 'error', message: 'This email is already registered. Please sign in instead.' }, { status: 409 });
    }
    return NextResponse.json({ status: 'error', message: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
