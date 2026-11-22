
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { addCategory, deleteCategoryDb, logActivity } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized.' },
      { status: 401 },
    );
  }

  const { action, id, name, type } = (await req.json()) as {
    action: string;
    id?: number;
    name?: string;
    type?: 'product' | 'experience';
  };

  if (action === 'add') {
    if (!name?.trim()) {
      return NextResponse.json(
        { status: 'error', message: 'Category name is required.' },
        { status: 400 },
      );
    }

    const categoryType = type === 'experience' ? 'experience' : 'product';
    const added = await addCategory(name.trim(), categoryType);

    if (!added.ok || !added.category) {
      return NextResponse.json(
        {
          status: 'error',
          message: `"${name.trim()}" already exists for this category type.`,
        },
        { status: 409 },
      );
    }

    await logActivity({
      userId: session.id,
      role: 'admin',
      userName: session.name,
      action: 'category_add',
      description: `Admin added category "${name.trim()}"`,
    });

    return NextResponse.json({
      status: 'success',
      category: added.category,
    });
  }

  if (action === 'delete' && typeof id === 'number') {
    const result = await deleteCategoryDb(id);

    if (!result.ok) {
      return NextResponse.json(
        {
          status: 'error',
          message: `Cannot delete this category — ${result.products} listing(s) still use it. Reassign those listings first.`,
        },
        { status: 409 },
      );
    }

    await logActivity({
      userId: session.id,
      role: 'admin',
      userName: session.name,
      action: 'category_delete',
      description: `Admin deleted category #${id}`,
    });

    return NextResponse.json({ status: 'success' });
  }

  return NextResponse.json(
    { status: 'error', message: 'Unknown action.' },
    { status: 400 },
  );
}
