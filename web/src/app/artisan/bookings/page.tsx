import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { listBookings } from '@/lib/db';
import BookingsClient from './BookingsClient';
import { ClipboardCheck, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArtisanBookingsPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/bookings');
  await requireVerifiedArtisan(session.id);

  const bookings = await listBookings(session.id);
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
              Welcome your learners
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Bookings &amp; attendance</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Find a booking, prepare for each workshop, and check learners in when they arrive.
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-ochre-200">
            <ClipboardCheck size={26} strokeWidth={1.7} aria-hidden="true" />
          </span>
        </div>
      </section>

      <nav aria-label="Workshop management" className="flex flex-wrap gap-2 rounded-2xl border border-abaca-200/80 bg-white/90 p-2 shadow-sm">
        <Link
          href="/artisan/experiences"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-stone-600 transition hover:bg-canvas hover:text-brand-900"
        >
          Workshops list
        </Link>
        <Link
          href="/artisan/experiences/calendar"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-stone-600 transition hover:bg-canvas hover:text-brand-900"
        >
          Session calendar
        </Link>
        <Link
          href="/artisan/bookings"
          aria-current="page"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-700 px-3.5 text-xs font-bold text-white shadow-sm"
        >
          Bookings &amp; attendance
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{bookings.length}</span>
        </Link>
      </nav>

      <BookingsClient
        initial={bookings.map((b) => ({
          order_item_id: b.order_item_id,
          order_id: b.order_id,
          product_id: b.product_id,
          product: b.product_name,
          customer: b.customer_name,
          customer_phone: b.customer_phone ?? null,
          attendee: b.attendee_name,
          attendee_contact: b.attendee_contact ?? b.customer_phone ?? null,
          attendee_for: b.attendee_for ?? 'self',
          session_date: b.selected_session?.date ?? null,
          session_time: b.selected_session ? `${b.selected_session.time_start}–${b.selected_session.time_end}` : null,
          session_location: b.selected_session?.location ?? null,
          selected_variant: b.selected_variant ?? null,
          purchase_type: b.purchase_type ?? 'workshop',
          order_notes: b.order_notes ?? null,
          quantity: b.quantity,
          price: b.price,
          status: b.status,
          ticket: b.ticket_code,
        }))}
      />
    </main>
  );
}
