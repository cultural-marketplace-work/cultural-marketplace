import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { verifyPassword, updateAdminProfile, logActivity, findUserByEmail, hashPassword } from '@/lib/db';
import { setPasswordByEmail } from '@/lib/passwordReset';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ status: 'error' }, { status: 401 });

  const body = (await req.json()) as { action: 'update' | 'password'; name?: string; phone?: string; current_password?: string; new_password?: string };

  if (body.action === 'update') {
    await updateAdminProfile(session.id, { name: body.name, phone: body.phone });
    await logActivity({ userId: session.id, role: 'admin', userName: session.name, action: 'profile_update', description: `Admin updated their profile` });
    return NextResponse.json({ status: 'success' });
  }

  if (body.action === 'password') {
    if (!body.current_password || !body.new_password || body.new_password.length < 8) {
      return NextResponse.json({ status: 'error', message: 'New password must be at least 8 characters.' }, { status: 400 });
    }
    const user = await findUserByEmail(session.email);
    if (!user || !(await verifyPassword(body.current_password, user.password))) {
      return NextResponse.json({ status: 'error', message: 'Current password is incorrect.' }, { status: 400 });
    }
    const hash = await hashPassword(body.new_password);
    await setPasswordByEmail(session.email, hash);
    await logActivity({ userId: session.id, role: 'admin', userName: session.name, action: 'password_change', description: `Admin changed their password` });
    return NextResponse.json({ status: 'success' });
  }

  return NextResponse.json({ status: 'error', message: 'Unknown action.' }, { status: 400 });
}
