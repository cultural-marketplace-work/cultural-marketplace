import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { findUserByEmail, updateCustomer, deleteCustomer, toggleCustomerStatus, logActivity } from '@/lib/db';

async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== 'admin') return null;
  return s;
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ status: 'error' }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const action = body.action;
  const id = Number(body.id);
  let warning: string | undefined;
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ status: 'error', message: 'Invalid customer.' }, { status: 400 });
  }

  if (action === 'update') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';

    if (!name || name.length > 100) {
      return NextResponse.json({ status: 'error', message: 'Name is required and must be 100 characters or fewer.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
      return NextResponse.json({ status: 'error', message: 'Enter a valid email address (100 characters or fewer).' }, { status: 400 });
    }
    if (phone.length > 30 || location.length > 100) {
      return NextResponse.json({ status: 'error', message: 'Phone or location is too long.' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing && existing.id !== id) {
      return NextResponse.json({ status: 'error', message: 'That email address is already in use.' }, { status: 409 });
    }

    let updated: boolean;
    try {
      updated = await updateCustomer(id, { name, email, phone, location });
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === '23505') {
        return NextResponse.json({ status: 'error', message: 'That email address is already in use.' }, { status: 409 });
      }
      console.error('Admin customer update failed:', error);
      return NextResponse.json({ status: 'error', message: 'Could not update customer details.' }, { status: 500 });
    }
    if (!updated) return NextResponse.json({ status: 'error', message: 'Customer not found.' }, { status: 404 });

    await logActivity({ userId: session.id, role: 'admin', userName: session.name, action: 'customer_update', description: `Admin updated customer #${id}` });
  } else if (action === 'delete') {
    let result: Awaited<ReturnType<typeof deleteCustomer>>;
    try {
      result = await deleteCustomer(id);
    } catch (error) {
      console.error('Admin customer deletion failed:', error);
      return NextResponse.json({ status: 'error', message: 'Could not delete customer and order history.' }, { status: 500 });
    }
    if (!result.deleted) return NextResponse.json({ status: 'error', message: 'Customer not found.' }, { status: 404 });
    warning = result.warning;

    await logActivity({ userId: session.id, role: 'admin', userName: session.name, action: 'customer_delete', description: `Admin deleted customer #${id}` });
  } else if (action === 'toggle') {
    await toggleCustomerStatus(id);
    await logActivity({ userId: session.id, role: 'admin', userName: session.name, action: 'customer_toggle', description: `Admin toggled status of customer #${id}` });
  } else {
    return NextResponse.json({ status: 'error', message: 'Unknown action.' }, { status: 400 });
  }
  return NextResponse.json({ status: 'success', ...(warning ? { warning } : {}) });
}
