import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { getProduct } from '@/lib/db';
import ProductMedia from '../../edit/[id]/ProductMedia';
import { ArrowRight, CalendarDays, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Intermediate step in the create flow: photos first. NFC is offered as an
// optional next step — never required.
export default async function NewProductMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/products');
  await requireVerifiedArtisan(session.id);
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product || product.artisan_id !== session.id) notFound();

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-serif text-3xl font-bold text-brand-900">Add photos to “{product.name}”</h1>
        <p className="mt-1 text-stone-500">
          Review the details you entered and add photos to complete your product listing.
        </p>

        <section aria-labelledby="product-summary-title" className="mt-6 overflow-hidden rounded-2xl border border-abaca-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-abaca-100 bg-canvas/70 px-4 py-4 sm:px-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <Package size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 id="product-summary-title" className="font-serif text-lg font-bold text-brand-900">Your product details</h2>
              <p className="mt-0.5 text-xs text-stone-500">A review of the information saved from your product form.</p>
            </div>
          </header>
          <div className="space-y-4 p-4 sm:p-5">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-canvas/70 p-3">
                <dt className="text-xs font-semibold text-stone-500">Category</dt>
                <dd className="mt-1 text-sm font-bold text-brand-900">{product.category || 'Not provided'}</dd>
              </div>
              <div className="rounded-xl bg-canvas/70 p-3">
                <dt className="text-xs font-semibold text-stone-500">Price per item</dt>
                <dd className="mt-1 text-sm font-bold text-crimson-700">
                  ₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </dd>
              </div>
              <div className="rounded-xl bg-canvas/70 p-3">
                <dt className="text-xs font-semibold text-stone-500">Available quantity</dt>
                <dd className="mt-1 text-sm font-bold text-brand-900">{product.stock_quantity}</dd>
              </div>
              <div className="rounded-xl bg-canvas/70 p-3">
                <dt className="text-xs font-semibold text-stone-500">Materials used</dt>
                <dd className="mt-1 text-sm font-bold text-brand-900">{product.materials_used || 'Not provided'}</dd>
              </div>
            </dl>

            <div className="rounded-xl border border-abaca-200 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-600">Description</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-stone-700">
                {product.description || 'No description provided.'}
              </p>
            </div>

            <div className="rounded-xl border border-abaca-200 p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-600">Options and variations</h3>
              {product.variations_data?.length ? (
                <ul className="mt-2 space-y-2">
                  {product.variations_data.map((variation, index) => (
                    <li key={`${variation.type}-${variation.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas/70 px-3 py-2 text-sm">
                      <span className="font-semibold text-stone-800">
                        {variation.typeLabel}: {variation.name}
                      </span>
                      <span className="text-xs text-stone-600">
                        {variation.stock} available
                        {variation.price > 0 && ` · +₱${Number(variation.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-stone-600">No options or variations added.</p>
              )}
            </div>
          </div>
        </section>

        <div className="mt-5">
          <ProductMedia productId={product.id} initialMain={product.image_path} initialGallery={product.product_gallery} />
        </div>

        <section aria-labelledby="tutorial-choice-title" className="mt-6 rounded-2xl border border-ochre-200 bg-ochre-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="tutorial-choice-title" className="flex items-center gap-2 font-serif text-lg font-bold text-brand-900">
                <CalendarDays size={19} className="text-ochre-800" aria-hidden="true" />
                Would you like to offer a tutorial for this item?
              </h2>
              <p className="mt-1 text-sm leading-5 text-stone-600">
                You can teach participants how to make or use your creation.
              </p>
            </div>
            <Link href={`/artisan/products/${product.id}/tutorial`} className="btn-primary min-h-11 shrink-0 px-4">
              Add a tutorial
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ochre-200 pt-4">
            <Link href="/artisan/products" className="btn-outline min-h-10 px-4 text-xs">
              Finish without a tutorial
            </Link>
            <Link href={`/artisan/products/${product.id}/nfc`} className="btn-outline min-h-10 px-4 text-xs">
              Add an NFC tag (optional)
            </Link>
            <p className="text-xs text-stone-500">NFC tags can be added or skipped at any time.</p>
          </div>
        </section>
      </main>
    </>
  );
}
