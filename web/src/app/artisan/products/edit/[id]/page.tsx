import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { getProduct, listCategories } from '@/lib/db';
import ProductForm from '../../ProductForm';
import ProductMedia from './ProductMedia';
import NfcSection from '@/components/NfcSection';
import { ArrowLeft, ArrowUpRight, CalendarDays, Camera, FilePenLine, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/products');
  await requireVerifiedArtisan(session.id);
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product || product.artisan_id !== session.id) notFound();
  const categories = await listCategories('product');

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/artisan/products"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand-700 transition hover:bg-ochre-50 hover:text-brand-900"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to creations
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/artisan/experiences" className="btn-outline min-h-10 px-3 text-xs">
            <CalendarDays size={14} aria-hidden="true" />
            Workshops
          </Link>
          {product.has_tutorial && (
            <Link href={`/artisan/tutorial-attendees/${product.id}`} className="btn-outline min-h-10 px-3 text-xs">
              Workshop attendees
            </Link>
          )}
          <Link
            href={`/customer/browse/${product.id}`}
            target="_blank"
            className="btn-outline min-h-10 px-3 text-xs"
          >
            View marketplace listing
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <FilePenLine size={14} aria-hidden="true" />
              Creation details
            </p>
            <h1 className="mt-2 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Edit {product.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Update your craft story, pricing, availability, workshop details, and photos whenever you need.
            </p>
          </div>
          <span className={`badge border px-3 py-2 text-xs font-bold uppercase tracking-wide ${
            product.status === 'active'
              ? 'border-ochre-200/40 bg-ochre-200/15 text-ochre-100'
              : 'border-white/20 bg-white/10 text-white/80'
          }`}>
            {product.status === 'active' ? 'Published' : 'Unpublished'}
          </span>
        </div>
        <nav aria-label="Edit creation sections" className="mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          <a href="#photos" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20">
            <Camera size={15} aria-hidden="true" /> Photos
          </a>
          <a href="#authenticity" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20">
            <ShieldCheck size={15} aria-hidden="true" /> Authenticity
          </a>
          <a href="#details" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20">
            <FilePenLine size={15} aria-hidden="true" /> Craft details
          </a>
        </nav>
      </section>

      <section id="photos" aria-label="Creation photos">
        <ProductMedia
          productId={product.id}
          initialMain={product.image_path}
          initialGallery={product.product_gallery}
        />
      </section>

      <section id="authenticity" aria-label="NFC authenticity">
        <NfcSection
          productId={product.id}
          initialTag={product.nfc_tag_id}
          initialStatus={product.nfc_tag_status}
        />
      </section>

      <section id="details" aria-label="Creation details" className="mx-auto w-full max-w-5xl">
        <ProductForm
          mode="edit"
          productId={product.id}
          categories={categories}
          initial={{
            name: product.name,
            description: product.description ?? '',
            price: String(Number(product.price)),
            stock_quantity: String(product.stock_quantity),
            category: product.category ?? '',
            materials_used: product.materials_used ?? '',
            has_tutorial: product.has_tutorial,
            tutorial_title: product.tutorial_title ?? '',
            tutorial_description: product.tutorial_description ?? '',
            tutorial_price:
              product.tutorial_price != null ? String(Number(product.tutorial_price)) : '',
            tutorial_capacity:
              product.tutorial_capacity != null ? String(product.tutorial_capacity) : '',
            tutorial_fee_type: product.tutorial_fee_type ?? 'paid',
            tutorial_location: product.tutorial_location ?? '',
            tutorial_lat: product.tutorial_lat != null ? Number(product.tutorial_lat) : null,
            tutorial_lng: product.tutorial_lng != null ? Number(product.tutorial_lng) : null,
          }}
          initialHasVariations={product.has_variations}
          initialVariations={product.variations_data ?? []}
          initialTutorialDates={product.tutorial_dates ?? []}
        />
      </section>
    </main>
  );
}
