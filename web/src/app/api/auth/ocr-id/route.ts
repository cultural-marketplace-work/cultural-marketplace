import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { status: 'error', message: 'ID OCR now runs locally in the registration page.' },
    { status: 410 }
  );
}
