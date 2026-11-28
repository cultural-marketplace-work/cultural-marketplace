import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { getProduct } from '@/lib/db';
import TutorialDetailsEditor from './TutorialDetailsEditor';

export const dynamic = 'force-dynamic';

export default async function TutorialDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/products');
  await requireVerifiedArtisan(session.id);

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isSafeInteger(productId) || productId <= 0) notFound();
  const product = await getProduct(productId);
  if (!product || product.artisan_id !== session.id) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-semibold text-ochre-800">Tutorial for {product.name}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-brand-900">Tutorial details</h1>
      <p className="mt-2 leading-6 text-stone-600">
        Tell learners what they will experience, then add one or more session dates and venues.
      </p>
      <TutorialDetailsEditor product={product} />
    </main>
  );
}
