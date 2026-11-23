import { listAllReviews } from '@/lib/db';
import ReviewsClient from './ReviewsClient';
import { MessageSquareText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const reviews = await listAllReviews();

  return (
    <main className="mx-auto min-w-0 w-full max-w-6xl space-y-5 font-sans">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{
            backgroundImage: "url('/images/kalinga-weave.svg')",
            backgroundSize: '240px',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <MessageSquareText size={15} aria-hidden="true" />
              Customer feedback
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Reviews
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Review customer feedback, monitor product ratings, and manage the
              visibility of marketplace reviews.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <ReviewsClient
          initial={reviews.map((r) => ({
            item_id: r.id,
            product: r.product_name,
            customer: r.customer_name ?? 'Customer',
            rating: r.review_rating ?? 0,
            comment: r.review_comment,
            visible: r.review_visible ?? true,
            reviewed: r.reviewed_at
              ? new Date(r.reviewed_at).toLocaleString()
              : '',
          }))}
        />
      </div>
    </main>
  );
}