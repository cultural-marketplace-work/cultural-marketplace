import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { listArtisanOrders } from '@/lib/db';
import { MessageSquareQuote, Sparkles, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArtisanReviewsPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/reviews');
  await requireVerifiedArtisan(session.id);

  const orders = await listArtisanOrders(session.id);
  const reviews = orders.filter((o) => o.review_rating != null);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + (review.review_rating ?? 0), 0) / reviews.length
    : 0;

  return (
    <main className="mx-auto max-w-7xl space-y-5">
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
              Customer stories
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Reviews of your work</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Hear what customers think about the care and tradition behind your creations.
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-ochre-200">
            <MessageSquareQuote size={25} strokeWidth={1.7} aria-hidden="true" />
          </span>
        </div>
      </section>

      <section aria-label="Review summary" className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <MessageSquareQuote size={19} aria-hidden="true" />
            </span>
            <span className="font-serif text-3xl font-bold text-brand-900">{reviews.length}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-stone-800">Customer reviews</p>
          <p className="mt-1 text-xs text-stone-500">Feedback on your creations</p>
        </div>
        <div className="rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <Star size={19} aria-hidden="true" />
            </span>
            <span className="font-serif text-3xl font-bold text-brand-900">{reviews.length ? averageRating.toFixed(1) : '—'}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-stone-800">Average rating</p>
          <p className="mt-1 text-xs text-stone-500">Out of 5 stars</p>
        </div>
      </section>

      <section aria-label="Customer reviews" className="space-y-3">
        <h2 className="font-serif text-xl font-bold text-brand-900">Recent feedback</h2>
        {reviews.map((review) => {
          const rating = Math.max(0, Math.min(5, review.review_rating ?? 0));
          const date = review.reviewed_at ? new Date(review.reviewed_at) : null;
          return (
            <article key={review.id} className="rounded-2xl border border-abaca-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-900">{review.product_name}</h3>
                  <div className="mt-2 flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={16}
                        aria-hidden="true"
                        className={index < rating ? 'fill-ochre-500 text-ochre-600' : 'text-abaca-300'}
                      />
                    ))}
                    <span className="ml-1 text-xs font-semibold text-stone-600">{rating}.0</span>
                  </div>
                </div>
                {date && (
                  <time dateTime={review.reviewed_at ?? undefined} className="text-xs text-stone-500">
                    {Number.isNaN(date.getTime()) ? review.reviewed_at : date.toLocaleDateString([], { dateStyle: 'medium' })}
                  </time>
                )}
              </div>
              {review.review_comment ? (
                <blockquote className="mt-4 rounded-xl border-l-4 border-ochre-400 bg-canvas/70 px-4 py-3 text-sm leading-6 text-stone-700">
                  “{review.review_comment}”
                </blockquote>
              ) : (
                <p className="mt-3 text-xs italic text-stone-500">The customer left a rating without a written comment.</p>
              )}
            </article>
          );
        })}
        {reviews.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-12 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <Star size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-900">Your first review is on its way</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Once customers receive your creations and share feedback, their reviews will appear here.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
