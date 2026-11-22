import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  MessageSquareQuote,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Timer,
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { artisanAnalytics } from '@/lib/db';
import { getArtisanTranslator } from '@/lib/artisanI18n';

export const dynamic = 'force-dynamic';

export default async function ArtisanAnalyticsPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/analytics');
  await requireVerifiedArtisan(session.id);

  const { t } = await getArtisanTranslator(session.id);
  const stats = await artisanAnalytics(session.id);
  const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const maxProductQty = Math.max(1, ...stats.topProducts.map((product) => product.qty));
  const metrics = [
    { label: t('Total sales'), value: currency.format(stats.totalSales), detail: t('From completed shop activity'), Icon: CircleDollarSign },
    { label: t('Orders'), value: stats.totalOrders.toLocaleString(), detail: t('Orders received'), Icon: ShoppingBag },
    { label: t('Average rating'), value: stats.avgRating != null ? `${stats.avgRating.toFixed(1)} / 5` : '—', detail: `${stats.reviewCount} ${t(stats.reviewCount === 1 ? 'review' : 'reviews')}`, Icon: Star },
    { label: t('Creations'), value: stats.productCount.toLocaleString(), detail: t('Products in your shop'), Icon: Package },
    { label: t('Bookings'), value: stats.bookingCount.toLocaleString(), detail: t('Experience bookings'), Icon: CalendarDays },
    { label: t('Pending bookings'), value: stats.pendingBookings.toLocaleString(), detail: t('Awaiting your attention'), Icon: Timer },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -right-8 -top-20 -z-10 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-ochre-200">
              <ChartNoAxesColumnIncreasing size={15} aria-hidden="true" />
              {t('Artisan insights')}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">{t('Your business at a glance')}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              {t('Track sales, understand which creations are connecting with customers, and keep up with your community.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/artisan/products"
              className="inline-flex items-center gap-2 rounded-xl bg-ochre-300 px-4 py-3 text-sm font-bold text-charcoal-950 transition hover:bg-ochre-200"
            >
              <Package size={16} aria-hidden="true" /> {t('Manage creations')}
            </Link>
            <Link
              href="/artisan/orders"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {t('View orders')} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-label={t('Business metrics')} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(({ label, value, detail, Icon }) => (
          <article key={label} className="rounded-2xl border border-abaca-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-medium text-stone-500">{label}</p>
            <p className="mt-1 break-words font-serif text-2xl font-bold text-brand-900">{value}</p>
            <p className="mt-1 text-[11px] text-stone-400">{detail}</p>
          </article>
        ))}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section aria-labelledby="top-products-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">{t('What customers love')}</p>
              <h2 id="top-products-title" className="mt-1 font-serif text-2xl font-bold text-brand-900">{t('Top creations')}</h2>
            </div>
            <Link href="/artisan/products" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900">
              {t('View creations')} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
            {stats.topProducts.map((product, index) => (
              <div key={product.name} className={`px-5 py-4 ${index > 0 ? 'border-t border-stone-100' : ''}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ochre-50 font-serif text-sm font-bold text-ochre-800">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">{product.name}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {product.qty} {t(product.qty === 1 ? 'item sold' : 'items sold')}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-brand-700">{currency.format(product.revenue)}</p>
                </div>
                <div aria-hidden="true" className="ml-12 mt-3 h-1.5 overflow-hidden rounded-full bg-abaca-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-700 to-ochre-500"
                    style={{ width: `${Math.max(4, (product.qty / maxProductQty) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {stats.topProducts.length === 0 && (
              <div className="px-6 py-10 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
                  <Package size={22} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-brand-900">{t('Your bestsellers will appear here')}</h3>
                <p className="mt-1 text-sm text-stone-500">{t('Once customers start ordering, you can see which creations are most popular.')}</p>
                <Link href="/artisan/products" className="btn-outline mt-4">{t('Manage creations')}</Link>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="recent-reviews-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">{t('From your community')}</p>
              <h2 id="recent-reviews-title" className="mt-1 font-serif text-2xl font-bold text-brand-900">{t('Recent reviews')}</h2>
            </div>
            <Link href="/artisan/reviews" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900">
              {t('View reviews')} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentReviews.map((review, index) => (
              <article key={`${review.name}-${index}`} className="rounded-2xl border border-abaca-200/80 bg-white/95 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-brand-700">
                      <MessageSquareQuote size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-stone-800">{review.name}</p>
                      <div className="mt-1 flex items-center gap-0.5" aria-label={`${review.rating} ${t('out of 5 stars')}`}>
                        {Array.from({ length: 5 }, (_, starIndex) => (
                          <Star
                            key={starIndex}
                            size={14}
                            aria-hidden="true"
                            className={starIndex < review.rating ? 'fill-ochre-500 text-ochre-500' : 'text-stone-200'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Sparkles size={16} className="shrink-0 text-ochre-500" aria-hidden="true" />
                </div>
                {review.comment ? (
                  <blockquote className="mt-4 border-l-2 border-ochre-300 pl-3 text-sm leading-6 text-stone-600">
                    “{review.comment}”
                  </blockquote>
                ) : (
                  <p className="mt-4 text-xs italic text-stone-400">{t('This customer left a rating without a written comment.')}</p>
                )}
              </article>
            ))}
            {stats.recentReviews.length === 0 && (
              <div className="rounded-2xl border border-abaca-200/80 bg-white/95 px-6 py-10 text-center shadow-sm">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
                  <Star size={21} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold text-brand-900">{t('No reviews just yet')}</h3>
                <p className="mt-1 text-sm text-stone-500">{t('Customer feedback will show up here after a purchase.')}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
