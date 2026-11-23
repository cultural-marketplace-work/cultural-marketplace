
import Link from 'next/link';
import { listAllBookingHistory } from '@/lib/db';
import { CalendarDays, ArrowLeft } from 'lucide-react';
import BookingHistoryClient from './BookingHistoryClient';

export const dynamic = 'force-dynamic';

export default async function AdminBookingHistoryPage() {
  const bookings = await listAllBookingHistory();

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

        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <CalendarDays size={15} aria-hidden="true" />
              Marketplace records
            </p>

            <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
              Booking History
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              View all historical workshop and cultural experience bookings,
              including records for deleted artisan listings.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {bookings.length} total {bookings.length === 1 ? 'record' : 'records'}
          </div>
        </div>
      </header>

      <div>
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
        >
          <ArrowLeft size={16} />
          Back to Bookings
        </Link>
      </div>

      <BookingHistoryClient bookings={bookings} />
    </main>
  );
}
