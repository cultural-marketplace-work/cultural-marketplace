'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  Ticket,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import type { CustomerBooking } from '@/lib/db';
import ExperienceMap from '@/app/customer/browse/[id]/ExperienceMap';

function formatSessionDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function CustomerBookingsClient({
  initial,
  customerName,
}: {
  initial: CustomerBooking[];
  customerName: string;
}) {
  const [bookings, setBookings] = useState<CustomerBooking[]>(initial);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'attended' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [expandedMapId, setExpandedMapId] = useState<number | null>(null);
  const [cancellingItem, setCancellingItem] = useState<CustomerBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('Schedule conflict / Cannot attend workshop');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const upcomingCount = bookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'attended' && b.order_status !== 'cancelled'
  ).length;
  const attendedCount = bookings.filter((b) => b.status === 'attended').length;
  const cancelledCount = bookings.filter(
    (b) => b.status === 'cancelled' || b.order_status === 'cancelled'
  ).length;

  const filtered = bookings.filter((b) => {
    const isCancelled = b.status === 'cancelled' || b.order_status === 'cancelled';
    const isAttended = b.status === 'attended';
    const isUpcoming = !isCancelled && !isAttended;

    if (filter === 'upcoming' && !isUpcoming) return false;
    if (filter === 'attended' && !isAttended) return false;
    if (filter === 'cancelled' && !isCancelled) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = b.product_name.toLowerCase().includes(q);
      const matchArtisan = b.artisan_name.toLowerCase().includes(q);
      const matchTicket = (b.ticket_code ?? '').toLowerCase().includes(q);
      const matchVenue = (b.venue_location ?? '').toLowerCase().includes(q);
      if (!matchName && !matchArtisan && !matchTicket && !matchVenue) return false;
    }

    return true;
  });

  async function handleConfirmCancel() {
    if (!cancellingItem) return;
    setIsSubmitting(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: cancellingItem.order_id, reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to cancel booking');
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.order_id === cancellingItem.order_id
            ? { ...b, status: 'cancelled', order_status: 'cancelled' }
            : b
        )
      );
      setActionMsg({ text: `Booking for ${cancellingItem.product_name} was successfully cancelled.` });
      setCancellingItem(null);
    } catch (e: unknown) {
      setActionMsg({ text: (e as Error).message || 'Failed to cancel booking', error: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div
          role={actionMsg.error ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-medium shadow-sm ${
            actionMsg.error
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-green-200 bg-green-50 text-green-900'
          }`}
        >
          <span className="flex items-center gap-2">
            {actionMsg.error ? <AlertCircle size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            {actionMsg.text}
          </span>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 transition hover:bg-white/70 hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            aria-label="Dismiss message"
            onClick={() => setActionMsg(null)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section aria-label="Booking summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'All bookings', value: bookings.length, note: 'Your workshop passes', Icon: Ticket, tone: 'bg-[#FFF3DE] text-[#8B0000]' },
          { label: 'Upcoming', value: upcomingCount, note: 'Ready for your next visit', Icon: Clock3, tone: 'bg-[#FFF4DF] text-[#80500D]' },
          { label: 'Attended', value: attendedCount, note: 'Experiences completed', Icon: CheckCircle2, tone: 'bg-green-50 text-green-800' },
          { label: 'Cancelled', value: cancelledCount, note: 'Cancelled reservations', Icon: XCircle, tone: 'bg-stone-100 text-stone-600' },
        ].map(({ label, value, note, Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-[#E8DCCB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="font-serif text-3xl font-bold text-[#3D3028]">{value}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-[#3D3028]">{label}</p>
            <p className="mt-1 text-xs text-[#71675F]">{note}</p>
          </div>
        ))}
      </section>

      <section aria-label="Filter bookings" className="rounded-2xl border border-[#E8DCCB] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold" role="group" aria-label="Booking status">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`min-h-10 rounded-full border px-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B0000] ${
              filter === 'all'
                ? 'border-[#8B0000] bg-[#8B0000] text-white shadow-sm'
                : 'border-[#E8DCCB] bg-white text-[#71675F] hover:border-[#D6B56D] hover:bg-[#FFF9EF]'
            }`}
          >
            All ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            aria-pressed={filter === 'upcoming'}
            className={`min-h-10 rounded-full border px-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B0000] ${
              filter === 'upcoming'
                ? 'border-[#8B0000] bg-[#8B0000] text-white shadow-sm'
                : 'border-[#E8DCCB] bg-white text-[#71675F] hover:border-[#D6B56D] hover:bg-[#FFF9EF]'
            }`}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('attended')}
            aria-pressed={filter === 'attended'}
            className={`min-h-10 rounded-full border px-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B0000] ${
              filter === 'attended'
                ? 'border-[#8B0000] bg-[#8B0000] text-white shadow-sm'
                : 'border-[#E8DCCB] bg-white text-[#71675F] hover:border-[#D6B56D] hover:bg-[#FFF9EF]'
            }`}
          >
            Attended ({attendedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('cancelled')}
            aria-pressed={filter === 'cancelled'}
            className={`min-h-10 rounded-full border px-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B0000] ${
              filter === 'cancelled'
                ? 'border-[#8B0000] bg-[#8B0000] text-white shadow-sm'
                : 'border-[#E8DCCB] bg-white text-[#71675F] hover:border-[#D6B56D] hover:bg-[#FFF9EF]'
            }`}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>

        <label className="relative block w-full lg:max-w-sm">
          <span className="sr-only">Search bookings</span>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9A8F84]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets, workshops, venues…"
            className="w-full rounded-xl border border-[#E8DCCB] bg-white py-3 pl-10 pr-4 text-sm text-[#3D3028] outline-none transition placeholder:text-[#A69B90] focus:border-[#B78B45] focus:ring-2 focus:ring-[#D6B56D]/20"
          />
        </label>
        </div>
      </section>

      {/* Bookings Pass List */}
      <div className="space-y-4">
        {filtered.map((b) => {
          const isCancelled = b.status === 'cancelled' || b.order_status === 'cancelled';
          const isAttended = b.status === 'attended';
          const isMapOpen = expandedMapId === b.order_item_id;
          const venueLocation = b.selected_session?.location || b.venue_location || 'Artisan Workshop Studio';
          const venueLat = b.venue_lat ?? 8.5085;
          const venueLng = b.venue_lng ?? 125.9789;
          const canCancel = (b.order_status === 'pending' || b.order_status === 'awaiting_payment') && !isCancelled && !isAttended;
          const statusLabel = isCancelled
            ? 'Cancelled'
            : isAttended
              ? 'Attended'
              : b.order_status === 'awaiting_payment'
                ? 'Payment pending'
                : 'Confirmed';

          return (
            <div
              key={b.order_item_id}
              className={`overflow-hidden rounded-2xl border shadow-sm transition ${
                isCancelled
                  ? 'border-[#E8DCCB] bg-stone-50/70'
                  : 'border-[#E8DCCB] bg-white hover:border-[#D6B56D] hover:shadow-md'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E8DD] bg-gradient-to-r from-[#FFFDFA] to-white px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#71675F]">Order #{b.order_id}</span>
                  {b.ticket_code && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8DCCB] bg-[#FFF9EF] px-2.5 py-1 font-mono text-xs font-bold text-[#80500D]">
                      <Ticket size={13} aria-hidden="true" />
                      {b.ticket_code}
                    </span>
                  )}
                  {b.purchase_type === 'bundle' && (
                    <span className="badge border border-[#D6B56D] bg-[#FFF4DF] text-[10px] font-bold text-[#80500D]">
                      Craft + Workshop Bundle
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`badge border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      isAttended
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : isCancelled
                          ? 'border-[#E8DCCB] bg-stone-100 text-stone-700'
                          : 'border-[#D6B56D] bg-[#FFF4DF] text-[#80500D]'
                    }`}
                  >
                    {statusLabel}
                  </span>
                  <span className="text-sm font-bold text-[#8B0000]">
                    ₱{Number(b.price * b.quantity).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[#E8DCCB] bg-[#F5EBDD]">
                    {b.image_path ? (
                      <Image
                        src={b.image_path}
                        alt={b.product_name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#80500D]">
                        <Ticket size={30} strokeWidth={1.5} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-serif text-xl font-bold leading-snug text-[#3D3028]">
                        {b.product_name}
                      </h3>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#71675F]">
                        <UserRound size={14} aria-hidden="true" className="text-[#80500D]" />
                        <span>Hosted by</span>
                        <span className="font-semibold text-[#8B0000]">{b.artisan_name}</span>
                        {b.artisan_phone && (
                          <span className="text-stone-500">· {b.artisan_phone}</span>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                      <div className="rounded-lg border border-[#E8DCCB] bg-[#FFF9EF] p-3">
                        <p className="flex items-center gap-1.5 font-bold text-[#3D3028]">
                          <CalendarDays size={15} aria-hidden="true" className="text-[#80500D]" />
                          Scheduled session
                        </p>
                        <p className="mt-1 font-semibold text-[#3D3028]">
                          {b.selected_session?.date ? formatSessionDate(b.selected_session.date) : 'Schedule to be confirmed'}
                        </p>
                        {b.selected_session?.time_start && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#71675F]">
                            <Clock3 size={12} aria-hidden="true" />
                            {b.selected_session.time_start}–{b.selected_session.time_end}
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-[#E8DCCB] bg-[#FAF7F1] p-3">
                        <p className="flex items-center gap-1.5 font-bold text-[#3D3028]">
                          <MapPin size={15} aria-hidden="true" className="text-[#80500D]" />
                          Workshop venue
                        </p>
                        <p className="mt-1 line-clamp-2 font-semibold text-[#3D3028]">
                          {venueLocation}
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-500">Agusan del Sur, Philippines</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#F0E8DD] pt-3 text-xs text-[#71675F]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Users size={14} aria-hidden="true" className="text-[#80500D]" />
                        <span className="text-[#8A7D71]">Attendee(s)</span>
                        {b.attendee_name && b.attendee_name.includes(',') ? (
                          <span className="inline-flex flex-wrap gap-1 align-middle">
                            {b.attendee_name.split(',').map((name, idx) => (
                              <span key={idx} className="rounded border border-[#E8DCCB] bg-white px-2 py-1 text-[11px] font-semibold text-[#3D3028]">
                                {name.trim()}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="font-semibold text-[#3D3028]">
                            {b.attendee_name || customerName}
                          </span>
                        )}
                        {b.attendee_for === 'others' && (
                          <span className="badge border border-[#D6B56D] bg-[#FFF4DF] text-[10px] font-bold text-[#80500D]">
                            Guest / Group
                          </span>
                        )}
                        {b.attendee_contact && <span className="text-[#8A7D71]">{b.attendee_contact}</span>}
                      </div>
                      {b.selected_variant && (
                        <p className="inline-flex items-center gap-1">
                          <span className="text-[#8A7D71]">Variant:</span>
                          <span className="font-semibold text-[#3D3028]">{b.selected_variant}</span>
                        </p>
                      )}
                      <p className="inline-flex items-center gap-1">
                        <Ticket size={14} aria-hidden="true" className="text-[#80500D]" />
                        <span className="text-[#8A7D71]">Passes:</span>
                        <span className="font-semibold text-[#3D3028]">{b.quantity} seat(s)</span>
                      </p>
                      {b.payment_method && (
                        <p className="inline-flex items-center gap-1">
                          <CreditCard size={14} aria-hidden="true" className="text-[#80500D]" />
                          <span className="font-semibold text-[#3D3028]">
                            {b.payment_method === 'gcash' ? 'GCash' : b.payment_method === 'free' ? 'Free' : 'Cash on delivery'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Venue Pathfinding Drawer */}
                {isMapOpen && (
                  <div id={`venue-map-${b.order_item_id}`} className="animate-in fade-in space-y-3 rounded-xl border border-[#D6B56D] bg-[#FFFBF3] p-4 duration-200">
                    <div className="flex items-center justify-between gap-3 border-b border-[#E8DCCB] pb-3">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#80500D] shadow-sm">
                          <Navigation size={17} aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#3D3028]">
                            Venue directions
                          </p>
                          <p className="mt-0.5 text-xs text-[#71675F]">
                            Explore the route and open directions in your preferred map app.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedMapId(null)}
                        aria-label="Close venue map"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-white hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8B0000]"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>

                    <ExperienceMap
                      lat={venueLat}
                      lng={venueLng}
                      locationName={venueLocation}
                      artisanPhone={b.artisan_phone}
                    />
                  </div>
                )}

                {/* Bottom Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0E8DD] pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedMapId(isMapOpen ? null : b.order_item_id)}
                      aria-expanded={isMapOpen}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B0000] ${
                        isMapOpen
                          ? 'bg-[#8B0000] text-white'
                          : 'border border-[#D6B56D] bg-[#FFF4DF] text-[#80500D] hover:bg-[#F3E5CD]'
                      }`}
                    >
                      <MapPin size={15} aria-hidden="true" />
                      {isMapOpen ? 'Hide venue map' : 'Find venue'}
                    </button>

                    <Link
                      href={`/order/receipt/${b.order_id}#ticket-${b.order_item_id}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#D8C8B5] bg-white px-3.5 text-xs font-semibold text-[#5A4030] transition hover:bg-[#FFF5E4]"
                    >
                      <Ticket size={15} aria-hidden="true" />
                      Receipt &amp; ticket
                    </Link>

                    <Link
                      href={`/customer/account/messages`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#D8C8B5] bg-white px-3.5 text-xs font-semibold text-[#5A4030] transition hover:bg-[#FFF5E4]"
                    >
                      <MessageCircle size={15} aria-hidden="true" />
                      Message artisan
                    </Link>
                  </div>

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setCancellingItem(b)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
                    >
                      <XCircle size={15} aria-hidden="true" />
                      Cancel reservation
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#D8C8B5] bg-white px-5 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF3DE] text-[#80500D]">
              {bookings.length === 0 ? <CalendarDays size={24} aria-hidden="true" /> : <Search size={22} aria-hidden="true" />}
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-[#3D3028]">
              {bookings.length === 0
                ? 'Your workshop journey starts here'
                : search.trim()
                  ? 'No bookings match your search'
                  : 'No bookings in this category'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#8A7D71]">
              {bookings.length === 0
                ? 'Book a hands-on cultural experience and your session details and tickets will be saved here.'
                : 'Try a different search or select another booking status to find your session.'}
            </p>
            {bookings.length === 0 ? (
              <Link href="/customer/browse" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#8B0000] px-5 text-xs font-bold text-white transition hover:bg-[#6F0000]">
                Explore workshops <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => { setFilter('all'); setSearch(''); }}
                className="mt-5 rounded-lg border border-[#D8C8B5] px-4 py-2 text-xs font-semibold text-[#5A4030] transition hover:bg-[#FAF7F1]"
              >
                Show all bookings
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {cancellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-booking-title"
            className="w-full max-w-md space-y-5 rounded-2xl border border-[#E8DCCB] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <XCircle size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 id="cancel-booking-title" className="font-serif text-xl font-bold text-[#3D3028]">
                  Cancel workshop reservation?
                </h3>
                <p className="mt-1 text-sm leading-5 text-stone-600">
                  Cancel your booking for <b className="text-stone-800">{cancellingItem.product_name}</b> (Order #{cancellingItem.order_id})?
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="cancel-reason" className="text-xs font-bold text-[#5A4030]">Reason for cancellation</label>
              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#E8DCCB] bg-[#FFFDFA] p-3 text-xs outline-none focus:border-[#B78B45]"
              >
                <option value="Schedule conflict / Cannot attend workshop">Schedule conflict / Cannot attend workshop</option>
                <option value="Booked by mistake">Booked by mistake</option>
                <option value="Emergency circumstances">Emergency circumstances</option>
                <option value="Want to re-book a different session date">Want to re-book a different session date</option>
                <option value="Other reasons">Other reasons</option>
              </select>
            </div>

            <div className="flex flex-col-reverse justify-end gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                disabled={isSubmitting}
                className="rounded-lg border border-[#D8C8B5] px-4 py-2.5 text-xs font-semibold text-[#5A4030] transition hover:bg-[#FAF7F1]"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
                className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
