import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { adminUpdateProduct, adminDeleteProduct, logActivity } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  return session && session.role === 'admin' ? session : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ status: 'error', message: 'Unauthorized.' }, { status: 403 });

  const id = Number((await params).id);
  const body = await req.json();

  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const price = body.price === undefined ? undefined : Number(body.price);
  const status = body.status === 'active' || body.status === 'inactive' ? body.status : undefined;
  const category = body.category === undefined ? undefined : (String(body.category).trim() || null);

  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ status: 'error', message: 'Invalid product.' }, { status: 400 });
  if (name !== undefined && !name) return NextResponse.json({ status: 'error', message: 'Name is required.' }, { status: 400 });
  if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
    return NextResponse.json({ status: 'error', message: 'Invalid price.' }, { status: 400 });
  }

  const result = await adminUpdateProduct(id, { name, price, category, status });
  if (!result.ok) {
    return NextResponse.json(
      { status: 'error', message: result.message },
      { status: result.message === 'Product not found.' ? 404 : 409 }
    );
  }

  await logActivity({
    userId: session.id, role: 'admin', userName: session.name,
    action: 'product_edit', description: `Admin edited product #${id}`,
  });
  return NextResponse.json({ status: 'success' });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ status: 'error', message: 'Unauthorized.' }, { status: 403 });

  const id = Number((await params).id);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ status: 'error', message: 'Invalid product.' }, { status: 400 });

  const result = await adminDeleteProduct(id);
  if (!result.ok) return NextResponse.json({ status: 'error', message: result.message }, { status: 409 });

  await logActivity({
    userId: session.id, role: 'admin', userName: session.name,
    action: 'product_delete', description: `Admin deleted product #${id}`,
  });
  return NextResponse.json({ status: 'success' });
}