import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { deletePendingRegistration, isEmailRegistered, putPendingRegistration, takePendingRegistration } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string; email?: string; phone?: string; password?: string; password_confirmation?: string; terms?: boolean;
      resend?: boolean;
    };
    const name = (body.name ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const phone = (body.phone ?? '').trim();
    const password = body.password ?? '';

    if (body.resend) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ status: 'error', message: 'Enter a valid email address to resend the verification code.' }, { status: 400 });
      }
      if (await isEmailRegistered(email)) {
        return NextResponse.json({ status: 'error', message: 'This email already has a Cultural Marketplace account. Please sign in.' }, { status: 409 });
      }
      const pending = await takePendingRegistration(email);
      if (!pending) {
        return NextResponse.json({ status: 'error', message: 'Your registration expired. Please register again.' }, { status: 404 });
      }
      const otp = pending.expires > Date.now() ? pending.otp : String(randomInt(100000, 1_000_000));
      if (pending.expires <= Date.now()) {
        await putPendingRegistration(email, {
          name: pending.name, phone: pending.phone, password: pending.password, otp, ttlMinutes: 10,
        });
      }
      const { delivered } = await sendOtpEmail(email, otp);
      if (!delivered) {
        return NextResponse.json({ status: 'error', message: "We couldn't send the verification email. Please try again later." }, { status: 503 });
      }
      return NextResponse.json({ status: 'success', message: 'A new verification code has been sent to your email.' });
    }
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ status: 'error', message: 'Enter your name, a valid email address, and an 11-digit mobile number starting with 09.' }, { status: 400 });
    }
    if (await isEmailRegistered(email)) {
      return NextResponse.json({ status: 'error', message: 'This email already has a Cultural Marketplace account, so we did not send a code. Sign in or use a different email address.' }, { status: 409 });
    }
    if (password.length < 8 || password !== body.password_confirmation) {
      return NextResponse.json({ status: 'error', message: 'Use a password of at least 8 characters and make sure both password fields match.' }, { status: 400 });
    }
    if (!body.terms) {
      return NextResponse.json({ status: 'error', message: 'Please agree to the Terms & Conditions and Privacy Policy.' }, { status: 400 });
    }
    const otp = String(randomInt(100000, 1_000_000));
    await putPendingRegistration(email, { name, phone, password, otp, ttlMinutes: 10 });
    const { delivered } = await sendOtpEmail(email, otp);
    if (!delivered) {
      await deletePendingRegistration(email);
      return NextResponse.json({ status: 'error', message: "We couldn't send the verification email. Please try again later." }, { status: 503 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'We sent a 6-digit code to your email. Enter it below to create your artisan account.',
      requires_otp: true,
    });
  } catch (error) {
    console.error('Artisan account creation failed:', error);
    return NextResponse.json({ status: 'error', message: 'Account creation failed. Please try again.' }, { status: 500 });
  }
}
