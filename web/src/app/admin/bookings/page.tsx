
import { listBookings } from '@/lib/db';
import BookingsClient from './BookingsClient';
import { CalendarDays } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  const bookings = await listBookings();

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
              <CalendarDays size={15} aria-hidden="true" />
              Marketplace reservations
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Bookings
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Manage customer reservations, attendee information, scheduled cultural experiences, and booking records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
              {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
            </div>

<a
  href="/admin/bookings/history"
  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
>
  Browse All Booking History
</a>

            <a
              href="/api/admin/bookings/export"
              download
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <span aria-hidden="true">↓</span>
              Export CSV
            </a>
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <BookingsClient
          initial={bookings.map((b) => ({
            order_item_id: b.order_item_id,
            order_id: b.order_id,
            customer: b.customer_name,
            product: b.product_name,
            attendee: b.attendee_name,
            attendee_for: b.attendee_for ?? 'self',
            session: b.selected_session
              ? `${b.selected_session.date} ${b.selected_session.time_start}–${b.selected_session.time_end}`
              : null,
            quantity: b.quantity,
            price: b.price,
            status: b.status,
            ticket: b.ticket_code,
          }))}
        />
      </div>
    </main>
  );
}
