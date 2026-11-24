import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { listActiveProducts, listCategories, listApprovedArtisans  } from '@/lib/db';

export const dynamic = 'force-dynamic';

const QUICK_SEARCHES = ['Basket', 'Woven Textile', 'Beadwork', 'Woodcarving', 'Abaca'];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; workshop?: string }>;
}) {
  const params = await searchParams;
  const workshopOnly = params.workshop === '1';

  const [products, categories, artisans] = await Promise.all([
    listActiveProducts({ category: params.category, search: params.q, workshopOnly }),
    listCategories('product'),
    listApprovedArtisans(),
  ]);

  const activeCategory = params.category;
  const activeQ = params.q;
const artisanById = new Map(artisans.map((a) => [a.id, a]));  
  const visibleCategories = categories.filter(
    (c) => c.name.toLowerCase() !== 'other'
  );

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-10 flex-1 w-full">
        {/* Page Header */}
        <div className="border-b border-abaca-200 pb-6">
          <h1 className="font-sculpted text-xl sm:text-2xl font-bold text-charcoal-900">
            {workshopOnly ? 'Living Cultural Workshops' : 'Explore Indigenous Crafts'}
          </h1>
          <p className="mt-1.5 text-sm text-stone-600 max-w-2xl">
            Discover authentic handmade products, including woven textiles, woodcarvings, baskets, and cultural workshops created and offered by skilled Indigenous artisans in Agusan del Sur.
          </p>

          {/* Filter Toolbar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-abaca-200/90 bg-white/90 p-4 shadow-2xs">
            <form className="flex flex-wrap items-center gap-2.5" action="/customer/browse">
              {activeQ ? <input type="hidden" name="q" value={activeQ} /> : null}
              {workshopOnly ? <input type="hidden" name="workshop" value="1" /> : null}
              <label htmlFor="cat-select" className="text-xs font-bold uppercase tracking-wider text-ochre-700">
                Category:
              </label>
              <select
                id="cat-select"
                name="category"
                defaultValue={activeCategory ?? ''}
                className="input h-9 !w-56 rounded-xl border-abaca-300 !py-0 px-3 !text-xs"
              >
                <option value="">All Cultural Categories</option>
                {visibleCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary h-9 rounded-xl !px-4 !py-0 !text-xs font-semibold"
                type="submit"
              >
                Apply
              </button>

              {(activeQ || activeCategory || workshopOnly) && (
                <Link
                  href="/customer/browse"
                  className="inline-flex h-9 items-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-medium text-stone-600 transition hover:bg-stone-100"
                >
                  ✕ Reset Filters
                </Link>
              )}
            </form>

            {products.length > 0 && (
              <div className="text-xs font-medium text-stone-500">
                Showing <span className="font-bold text-charcoal-900">{products.length}</span>{' '}
                {workshopOnly ? 'Workshop Crafts' : 'Authentic Crafts'}
              </div>
            )}
          </div>

          {activeQ && (
            <p className="mt-3 text-xs text-ochre-800">
              Searching traditional patterns matching <b>“{activeQ}”</b>
            </p>
          )}
        </div>

        {/* Product Grid */}
{workshopOnly ? (
  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {products.map((w) => {
      const artisan = artisanById.get(w.artisan_id);
      return (
        <div
          key={w.id}
          className="flex flex-col justify-between overflow-hidden rounded-2xl border border-abaca-200 bg-white shadow-2xs transition hover:border-ochre-400"
        >
          {(w.tutorial_gallery?.[0] || w.image_path) && (
            <Link href={`/customer/browse/${w.id}`}>
              <Image
                src={w.tutorial_gallery?.[0] ?? w.image_path ?? ''}
                alt={w.tutorial_title || w.name}
                width={640}
                height={320}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-40 w-full object-cover"
              />
            </Link>
          )}

          <div className="flex flex-1 flex-col justify-between p-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ochre-800">
                Hands-on Experience
              </span>
              <h3 className="mt-1 line-clamp-1 font-sculpted text-base font-bold text-charcoal-900">
                {w.tutorial_title || w.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                {w.tutorial_description || w.description}
              </p>
              {w.tutorial_location && (
                <p className="mt-2 text-[11px] text-stone-400">📍 {w.tutorial_location}</p>
              )}

              {artisan && (
                <Link
                  href={`/artisans/${artisan.id}`}
                  className="mt-3 flex items-center gap-2.5 rounded-xl border border-abaca-100 bg-canvas/50 p-2 transition hover:border-ochre-300"
                >
                  {artisan.profile_picture ? (
                    <img
                      src={artisan.profile_picture}
                      alt={artisan.name}
                      className="h-9 w-9 shrink-0 rounded-full border border-[#D8C8B5] object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D8C8B5] bg-white text-sm font-bold text-[#8B0000]">
                      {artisan.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 leading-tight">
                    <p className="text-[9px] text-stone-500">Taught by</p>
                    <p className="truncate text-xs font-bold text-charcoal-900">{artisan.name}</p>
                  </div>
                </Link>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-abaca-100 pt-3">
              <span className="font-mono text-xs font-bold text-charcoal-900">
                {w.tutorial_fee_type === 'free'
                  ? 'FREE Workshop'
                  : `₱${Number(w.tutorial_price ?? w.price).toFixed(2)} / attendee`}
              </span>
              <Link href={`/customer/browse/${w.id}`} className="text-xs font-semibold text-crimson-700 hover:underline">
                Reserve Pass →
              </Link>
            </div>
          </div>
        </div>
      );
    })}
  </div>
) : (
  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
    {products.map((p, i) => (
      <ProductCard key={p.id} product={p} priority={i < 4} />
    ))}
  </div>
)}

        {/* Empty State */}
        {products.length === 0 && (
          <div className="mx-auto my-14 max-w-lg rounded-3xl border border-dashed border-abaca-300 bg-white/70 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-ochre-300 bg-ochre-50">
              <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9" aria-hidden="true">
                <path d="M24 3 45 24 24 45 3 24Z" stroke="#9E2A2B" strokeWidth="2" strokeLinejoin="round" />
                <path d="M24 12 36 24 24 36 12 24Z" stroke="#C5832B" strokeWidth="2" strokeLinejoin="round" />
                <path d="M24 19 29 24 24 29 19 24Z" fill="#9E2A2B" />
              </svg>
            </div>

            <h3 className="font-sculpted text-lg font-bold text-charcoal-900">
              No matching traditional crafts
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              We couldn&apos;t find any pieces matching your current filters. Try one of
              these popular crafts instead:
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {QUICK_SEARCHES.map((t) => (
                <Link
                  key={t}
                  href={`/customer/browse?q=${encodeURIComponent(t)}`}
                  className="rounded-full border border-ochre-300 bg-ochre-50 px-3 py-1 text-xs font-medium text-ochre-800 transition hover:bg-ochre-100"
                >
                  {t}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/customer/browse" className="btn-primary px-4 py-2 text-xs font-semibold">
                View All Artisans Crafts
              </Link>
              <Link href="/artisans" className="btn-outline px-4 py-2 text-xs font-semibold">
                Meet the Artisans
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}