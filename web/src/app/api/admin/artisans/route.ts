import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateArtisan, logActivity } from '@/lib/db';
import { deleteArtisanApplication } from '@/lib/adminDb';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ status: 'error' }, { status: 401 });

  const { action, id: rawId, ...fields } = (await req.json()) as { action: string; id: number; [k: string]: unknown };
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ status: 'error', message: 'Invalid artisan.' }, { status: 400 });
  }

  if (action === 'update') {
    await updateArtisan(id, fields as { name?: string; email?: string; phone?: string; location?: string; craft_type?: string; business_name?: string; bio?: string });
    await logActivity({ userId: session.id, role: 'admin', userName: session.name, action: 'artisan_update', description: `Admin updated artisan #${id}` });
  } else if (action === 'delete_application') {
    const result = await deleteArtisanApplication(id);
    if (!result.deleted) return NextResponse.json({ status: 'error', message: 'Artisan not found.' }, { status: 404 });
    await logActivity({ userId: session.id, role: 'admin', userName: session.name, action: 'artisan_verification_delete', description: `Admin deleted the verification application for artisan #${id}` });
    return NextResponse.json({ status: 'success' });
  } else {
    return NextResponse.json({ status: 'error', message: 'Unknown action.' }, { status: 400 });
  }
  return NextResponse.json({ status: 'success' });
}
