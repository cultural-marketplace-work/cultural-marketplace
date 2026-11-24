import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { listArtisanProducts, listBookings } from '@/lib/db';
import ExperiencesClient from './ExperiencesClient';
import { BookOpen, CalendarDays, Ticket, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArtisanExperiencesPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/experiences');
  await requireVerifiedArtisan(session.id);

  const [products, bookings] = await Promise.all([
    listArtisanProducts(session.id),
    listBookings(session.id),
  ]);

  const tutorials = products.filter((p) => p.has_tutorial);

  const bookingsByProduct = new Map<number, Array<{
    order_item_id: number;
    attendee_name: string | null;
    customer_name: string;
    quantity: number;
    status: string;
    ticket_code: string | null;
    selected_session: { date: string; time_start: string; time_end: string } | null;
  }>>();
  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    const productBookings = bookingsByProduct.get(b.product_id) ?? [];
    productBookings.push({
      order_item_id: b.order_item_id,
      attendee_name: b.attendee_name,
      customer_name: b.customer_name,
      quantity: b.quantity,
      status: b.status,
      ticket_code: b.ticket_code,
      selected_session: b.selected_session
        ? {
            date: b.selected_session.date,
            time_start: b.selected_session.time_start,
            time_end: b.selected_session.time_end,
          }
        : null,
    });
    bookingsByProduct.set(b.product_id, productBookings);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
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
              Share your knowledge
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Workshops &amp; experiences</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Welcome learners into your practice. Manage workshop details, session dates, venues, and attendance here.
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-ochre-200">
            <BookOpen size={26} strokeWidth={1.7} aria-hidden="true" />
          </span>
        </div>
      </section>

      <nav aria-label="Workshop management" className="flex flex-wrap gap-2 rounded-2xl border border-abaca-200/80 bg-white/90 p-2 shadow-sm">
        <Link
          href="/artisan/experiences"
          aria-current="page"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-700 px-3.5 text-xs font-bold text-white shadow-sm"
        >
          <BookOpen size={15} aria-hidden="true" />
          Workshops list
        </Link>
        <Link
          href="/artisan/experiences/calendar"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-stone-600 transition hover:bg-canvas hover:text-brand-900"
        >
          <CalendarDays size={15} aria-hidden="true" />
          Session calendar
        </Link>
        <Link
          href="/artisan/bookings"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-stone-600 transition hover:bg-canvas hover:text-brand-900"
        >
          <Ticket size={15} aria-hidden="true" />
          Bookings &amp; attendance
          <span className="rounded-full bg-ochre-100 px-2 py-0.5 text-[10px] font-bold text-ochre-900">{bookings.length}</span>
        </Link>
      </nav>

      <ExperiencesClient
        initial={tutorials.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.tutorial_price ?? p.price),
          fee_type: p.tutorial_fee_type ?? (Number(p.tutorial_price) === 0 ? 'free' : 'paid'),
          capacity: p.tutorial_capacity,
          booked_count: (bookingsByProduct.get(p.id) ?? []).reduce((total, booking) => total + booking.quantity, 0),
          attendees: bookingsByProduct.get(p.id) ?? [],
          status: p.tutorial_status ?? 'accept_bookings',
          location: p.tutorial_location ?? null,
          lat: p.tutorial_lat ?? null,
          lng: p.tutorial_lng ?? null,
          dates: p.tutorial_dates ?? [],
        }))}
      />
    </div>
  );
}
