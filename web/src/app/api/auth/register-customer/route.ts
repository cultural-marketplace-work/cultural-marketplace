import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { deletePendingRegistration, isEmailRegistered, putPendingRegistration, takePendingRegistration } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      first_name?: string; last_name?: string; email?: string; phone?: string; password?: string; password_confirmation?: string; terms?: boolean; resend?: boolean;
    };
    const firstName = (body.first_name ?? '').trim();
    const lastName = (body.last_name ?? '').trim();
    const email = (body.email ?? '').trim().toLowerCase();
    const phone = (body.phone ?? '').trim();
    const password = body.password ?? '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ status: 'error', message: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (body.resend) {
      if (await isEmailRegistered(email)) {
        return NextResponse.json({ status: 'error', message: 'This email is already registered. Please sign in instead.' }, { status: 409 });
      }
      const pending = await takePendingRegistration(email);
      if (!pending) {
        return NextResponse.json({ status: 'error', message: 'Your registration expired. Please register again.' }, { status: 404 });
      }

      const otp = pending.expires > Date.now() ? pending.otp : String(randomInt(100000, 1_000_000));
      if (pending.expires <= Date.now()) {
        await putPendingRegistration(email, {
          name: pending.name,
          phone: pending.phone,
          password: pending.password,
          otp,
          ttlMinutes: 10,
        });
      }

      const { delivered } = await sendOtpEmail(email, otp);
      if (!delivered) {
        return NextResponse.json({ status: 'error', message: "We couldn't send the verification email. Please try again later." }, { status: 503 });
      }

      return NextResponse.json({
        status: 'success',
        message: 'A new verification code has been sent to your email.',
      });
    }

    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json({ status: 'error', message: 'Please complete all required fields.' }, { status: 400 });
    }
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ status: 'error', message: 'Please enter a valid 11-digit mobile number starting with 09.' }, { status: 400 });
    }
    if (password !== (body.password_confirmation ?? '')) {
      return NextResponse.json({ status: 'error', message: 'Passwords do not match.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ status: 'error', message: 'Your password must be at least 8 characters long.' }, { status: 400 });
    }
    if (!body.terms) {
      return NextResponse.json({ status: 'error', message: 'Please agree to the Terms & Conditions and Privacy Policy.' }, { status: 400 });
    }
    if (await isEmailRegistered(email)) {
      return NextResponse.json({ status: 'error', message: 'This email is already registered. Please provide a different valid email address.' }, { status: 409 });
    }

    const otp = String(randomInt(100000, 1_000_000));
    await putPendingRegistration(email, {
      name: `${firstName} ${lastName}`, phone, password,
      otp, ttlMinutes: 10,
    });
    const { delivered } = await sendOtpEmail(email, otp);
    if (!delivered) {
      await deletePendingRegistration(email);
      return NextResponse.json({ status: 'error', message: "We couldn't send the verification email. Please try again later." }, { status: 503 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'We sent a 6-digit code to your email. Enter it below to verify your account.',
      requires_otp: true,
    });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
