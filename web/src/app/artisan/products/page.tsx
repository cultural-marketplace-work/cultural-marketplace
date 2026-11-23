import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { listArtisanProducts } from '@/lib/db';
import ProductsClient from './ProductsClient';
import { Palette, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArtisanProductsPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/products');
  await requireVerifiedArtisan(session.id);

  const products = await listArtisanProducts(session.id);
  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <Sparkles size={14} aria-hidden="true" />
              Traditional crafting
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Your creations</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Share the pieces and traditions you bring to life. Keep your listings, availability, and craft details in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-ochre-200 sm:flex">
              <Palette size={26} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ochre-300 px-4 py-3 text-sm font-bold text-charcoal-950 shadow-sm transition hover:bg-ochre-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href="/artisan/products/new"
            >
              <span aria-hidden="true">+</span>
              Add a creation
            </Link>
          </div>
        </div>
      </section>
      <ProductsClient
        initial={products.map((p) => ({
          id: p.id, name: p.name, price: Number(p.price), stock: p.stock_quantity,
          status: p.status, has_tutorial: p.has_tutorial, nfc_tag_id: p.nfc_tag_id,
        }))}
      />
    </div>
  );
}
