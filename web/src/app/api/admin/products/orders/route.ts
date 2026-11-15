import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getProductOrderSummary } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ status: 'error', message: 'Unauthorized.' }, { status: 403 });
  }
  const id = Number((await params).id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ status: 'error', message: 'Invalid product.' }, { status: 400 });
  }
  const summary = await getProductOrderSummary(id);
  return NextResponse.json({ status: 'success', summary });
}