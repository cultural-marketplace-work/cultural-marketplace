'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  Clock3,
  MapPin,
  Printer,
  Search,
  Ticket,
  UserRound,
  Users,
  X,
} from 'lucide-react';

export interface BookingRow {
  order_item_id: number;
  order_id: number;
  product_id: number;
  product: string;
  customer: string;
  customer_phone: string | null;
  attendee: string | null;
  attendee_contact: string | null;
  attendee_for?: string | null;
  session_date: string | null;
  session_time: string | null;
  session_location: string | null;
  selected_variant: string | null;
  purchase_type: string;
  order_notes: string | null;
  quantity: number;
  price: number;
  status: string;
  ticket: string | null;
}

export default function BookingsClient({ initial }: { initial: BookingRow[] }) {
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'attended' | 'cancelled_or_noshow'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  async function setStatus(id: number, status: string) {
    setBusyId(id);
    setActionError('');
    try {
      const response = await fetch('/api/artisan/orders/status-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_item_id: id, status }),
      });
      if (!response.ok) throw new Error('Booking status could not be updated. Please try again.');
      setRows((rs) => rs.map((r) => (r.order_item_id === id ? { ...r, status } : r)));
    } catch (cause) {
      console.error('[artisan-bookings] failed to update booking status:', cause);
      setActionError(cause instanceof Error ? cause.message : 'Booking status could not be updated. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  // Filter & Search logic
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // 1. Status Filter
      if (statusFilter === 'pending' && r.status !== 'pending' && r.status !== 'confirmed') return false;
      if (statusFilter === 'attended' && r.status !== 'attended') return false;
      if (statusFilter === 'cancelled_or_noshow' && r.status !== 'cancelled' && r.status !== 'no_show') return false;

      // 2. Query search: ticket code, attendee, customer, product, variant, location
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const inTicket = (r.ticket ?? '').toLowerCase().includes(q);
      const inAttendee = (r.attendee ?? '').toLowerCase().includes(q);
      const inCustomer = (r.customer ?? '').toLowerCase().includes(q);
      const inProduct = (r.product ?? '').toLowerCase().includes(q);
      const inVariant = (r.selected_variant ?? '').toLowerCase().includes(q);
      const inLocation = (r.session_location ?? '').toLowerCase().includes(q);
      return inTicket || inAttendee || inCustomer || inProduct || inVariant || inLocation;
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      pending: rows.filter((r) => r.status === 'pending' || r.status === 'confirmed').length,
      attended: rows.filter((r) => r.status === 'attended').length,
      cancelled: rows.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length,
    };
  }, [rows]);

  function handlePrintRoster() {
    window.print();
  }

  return (
    <div className="space-y-5">
      {/* Search & Actions Header (Screen Only) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Workshop roster</h2>
            <p className="mt-1 text-xs text-stone-500">{filtered.length} bookings shown</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block w-full sm:min-w-[280px]">
              <span className="sr-only">Search bookings</span>
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                placeholder="Search ticket, learner, workshop…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input min-h-10 pl-10 pr-10 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 hover:bg-canvas hover:text-stone-700"
                  aria-label="Clear booking search"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={handlePrintRoster}
              className="btn-outline min-h-10 shrink-0 px-3 text-xs"
              title="Print session roster for offline attendance check"
            >
              <Printer size={15} aria-hidden="true" />
              Print roster
            </button>
          </div>
        </div>

        {/* Row 2: Status Filter Tabs */}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            aria-pressed={statusFilter === 'all'}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 text-left text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${statusFilter === 'all' ? 'border-brand-700 bg-brand-700 text-white shadow-sm' : 'border-abaca-200 bg-white/90 text-stone-700 hover:border-ochre-300 hover:bg-ochre-50/50'}`}
          >
            <span className="flex items-center gap-2"><Ticket size={15} aria-hidden="true" /> All bookings</span>
            <span className={`rounded-full px-2 py-1 text-[10px] ${statusFilter === 'all' ? 'bg-white/15' : 'bg-canvas text-stone-600'}`}>{counts.all}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            aria-pressed={statusFilter === 'pending'}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 text-left text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${statusFilter === 'pending' ? 'border-ochre-500 bg-ochre-100 text-ochre-950 shadow-sm' : 'border-abaca-200 bg-white/90 text-stone-700 hover:border-ochre-300 hover:bg-ochre-50/50'}`}
          >
            <span className="flex items-center gap-2"><Clock3 size={15} aria-hidden="true" /> Upcoming / pending</span>
            <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-stone-700">{counts.pending}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('attended')}
            aria-pressed={statusFilter === 'attended'}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 text-left text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${statusFilter === 'attended' ? 'border-charcoal-900 bg-charcoal-900 text-ochre-200 shadow-sm' : 'border-abaca-200 bg-white/90 text-stone-700 hover:border-ochre-300 hover:bg-ochre-50/50'}`}
          >
            <span className="flex items-center gap-2"><CheckCheck size={15} aria-hidden="true" /> Checked in</span>
            <span className={`rounded-full px-2 py-1 text-[10px] ${statusFilter === 'attended' ? 'bg-white/10' : 'bg-canvas text-stone-600'}`}>{counts.attended}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('cancelled_or_noshow')}
            aria-pressed={statusFilter === 'cancelled_or_noshow'}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 text-left text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${statusFilter === 'cancelled_or_noshow' ? 'border-red-700 bg-red-700 text-white shadow-sm' : 'border-abaca-200 bg-white/90 text-stone-700 hover:border-red-200 hover:bg-red-50/50'}`}
          >
            <span className="flex items-center gap-2"><X size={15} aria-hidden="true" /> Cancelled / absent</span>
            <span className={`rounded-full px-2 py-1 text-[10px] ${statusFilter === 'cancelled_or_noshow' ? 'bg-white/15' : 'bg-canvas text-stone-600'}`}>{counts.cancelled}</span>
          </button>
        </div>
        {actionError && (
          <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle size={16} aria-hidden="true" />
            {actionError}
          </p>
        )}
      </div>

      {/* Printable Sheet View (Hidden on Screen, Shown when Printing) */}
      <div className="hidden print:block mb-6">
        <div className="border-b-2 border-stone-800 pb-3">
          <h1 className="text-xl font-bold font-serif">Cultural Marketplace — Workshop Attendance Roster</h1>
          <p className="text-xs text-stone-600 mt-1">Official Artisan Session Sign-in Sheet · Agusan del Sur</p>
          <p className="text-xs text-stone-500">Date Printed: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <table className="w-full mt-4 text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-300 font-bold uppercase text-stone-700">
              <th className="py-2">Ticket #</th>
              <th className="py-2">Attendee Name</th>
              <th className="py-2">Workshop / Craft</th>
              <th className="py-2">Session Date & Time</th>
              <th className="py-2">Variant / Notes</th>
              <th className="py-2 text-center">Status</th>
              <th className="py-2 text-center">Sign-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filtered.map((b) => (
              <tr key={b.order_item_id} className="align-middle">
                <td className="py-2 font-mono font-bold">{b.ticket || `OID-${b.order_item_id}`}</td>
                <td className="py-2 font-semibold">
                  {b.attendee || b.customer}
                  {b.attendee_for === 'others' && <span className="block text-[10px] text-ochre-900 font-medium">Guest / Group</span>}
                  {b.attendee && b.attendee !== b.customer && <span className="block text-[10px] text-stone-500">by {b.customer}</span>}
                </td>
                <td className="py-2">{b.product} × {b.quantity}</td>
                <td className="py-2">{b.session_date} {b.session_time}</td>
                <td className="py-2 text-[10px]">{b.selected_variant || 'Standard'}</td>
                <td className="py-2 text-center uppercase font-bold text-[10px]">{b.status}</td>
                <td className="py-2 text-center border-b border-stone-300 w-24">[ &nbsp; &nbsp; &nbsp; &nbsp; ]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Screen Cards List */}
      <div className="print:hidden space-y-3.5">
        {filtered.map((b) => {
          const isAttended = b.status === 'attended';
          const isCancelled = b.status === 'cancelled';
          const isNoShow = b.status === 'no_show';
          const isBundle = b.purchase_type === 'bundle';
          const isBusy = busyId === b.order_item_id;

          return (
            <article
              key={b.order_item_id}
              className={`overflow-hidden rounded-2xl border shadow-sm transition ${
                isAttended
                  ? 'border-ochre-300 bg-ochre-50/30'
                  : isCancelled || isNoShow
                    ? 'border-abaca-200 bg-canvas/70'
                    : 'border-abaca-200/80 bg-white/95 hover:border-ochre-300 hover:shadow-md'
              }`}
            >
              {/* Left Column: Workshop & Attendee Information */}
              <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                {/* Header row: Product Title & Ticket Badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif font-bold text-brand-900 text-base">
                    {b.product}
                  </h3>
                  <span className="text-xs font-semibold text-stone-500">× {b.quantity}</span>

                  {isBundle && (
                    <span className="badge border border-ochre-300 bg-ochre-100 text-[11px] font-bold text-ochre-900">
                      Craft &amp; workshop bundle
                    </span>
                  )}

                  {b.ticket && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-abaca-200 bg-canvas px-2.5 py-1 font-mono text-xs font-bold text-brand-800">
                      <Ticket size={13} aria-hidden="true" />
                      {b.ticket}
                    </span>
                  )}
                </div>

                {/* Attendee & Contact Details */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-700">
                  <span className="inline-flex items-center gap-2 font-semibold text-stone-900">
                    <UserRound size={15} aria-hidden="true" className="text-ochre-800" />
                    <span>{b.attendee || b.customer}</span>
                  </span>
                  {b.attendee_for === 'others' && (
                    <span className="badge border border-ochre-300 bg-ochre-100 text-[10px] text-ochre-900">
                      Guest / Group
                    </span>
                  )}
                  {b.attendee && b.attendee !== b.customer && (
                    <span className="text-xs text-stone-500">
                      Booked by {b.customer}
                    </span>
                  )}
                  {b.attendee_contact && (
                    <a
                      href={`tel:${b.attendee_contact}`}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-brand-700 hover:bg-ochre-50 hover:underline"
                    >
                      <Users size={14} aria-hidden="true" />
                      <span>{b.attendee_contact}</span>
                    </a>
                  )}
                </div>

                {/* Scheduled Session Date & Location */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-abaca-200/70 bg-canvas/70 p-3 text-xs text-stone-600">
                  {b.session_date && (
                    <span className="inline-flex items-center gap-2 font-semibold text-stone-800">
                      <CalendarDays size={15} aria-hidden="true" className="text-ochre-800" />
                      <span>{b.session_date}</span>
                      {b.session_time && <span className="text-stone-500 font-normal">({b.session_time})</span>}
                    </span>
                  )}
                  {b.session_location && (
                    <span className="inline-flex min-w-0 items-center gap-2 font-medium text-stone-700">
                      <MapPin size={15} aria-hidden="true" className="shrink-0 text-ochre-800" />
                      <span className="truncate">{b.session_location}</span>
                    </span>
                  )}
                </div>

                {/* Craft Variant (If Bundle or customized craft) */}
                {b.selected_variant && (
                  <p className="inline-block rounded-lg border border-ochre-300 bg-ochre-50 px-3 py-2 text-xs text-ochre-900">
                    <b>Craft variation to prepare:</b> {b.selected_variant}
                  </p>
                )}

                {/* Special Request / Customer Notes */}
                {b.order_notes && (
                  <p className="rounded-lg border border-abaca-200 bg-white/80 px-3 py-2 text-xs italic leading-5 text-stone-600">
                    <b className="not-italic text-stone-800">Note from customer:</b> &ldquo;{b.order_notes}&rdquo;
                  </p>
                )}

              {/* Right Column: Status & Action Buttons */}
                </div>
              <div className="flex shrink-0 flex-col items-start gap-3 border-t border-abaca-100 pt-4 lg:min-w-[220px] lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                {/* Status Badge */}
                <span
                  className={`badge border uppercase font-bold text-[10px] tracking-wider px-2.5 py-1 ${
                    isAttended
                      ? 'border-green-300 bg-green-50 text-green-800'
                      : isCancelled
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : isNoShow
                      ? 'border-stone-200 bg-stone-100 text-stone-700'
                      : 'border-ochre-300 bg-ochre-100 text-ochre-900 font-semibold'
                  }`}
                >
                  {isAttended ? 'Checked in' : b.status.replace(/_/g, ' ')}
                </span>

                {/* Interactive Action Buttons */}
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!isAttended && !isCancelled && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setStatus(b.order_item_id, 'attended')}
                      className="btn-primary min-h-10 px-3 text-xs"
                      title="Mark attendee as checked in and present at the workshop"
                    >
                      <CircleCheck size={15} aria-hidden="true" />
                      {isBusy ? 'Updating…' : 'Check in'}
                    </button>
                  )}

                  {isAttended && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setStatus(b.order_item_id, 'pending')}
                      className="btn-outline min-h-10 px-3 text-xs"
                      title="Undo check-in"
                    >
                      Undo check-in
                    </button>
                  )}

                  {!isCancelled && !isAttended && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setStatus(b.order_item_id, 'no_show')}
                        className="btn-outline min-h-10 px-3 text-xs"
                        title="Mark as absent / did not show up"
                      >
                        Mark no-show
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setStatus(b.order_item_id, 'cancelled')}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        title="Cancel this booking"
                      >
                        Cancel booking
                      </button>
                    </>
                  )}

                  <Link
                    href={`/artisan/tutorial-attendees/${b.product_id}`}
                    className="btn-outline min-h-10 px-3 text-xs"
                  >
                    <Users size={14} aria-hidden="true" />
                    Roster
                  </Link>
                </div>
              </div>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-10 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <Search size={23} aria-hidden="true" />
            </span>
            <p className="mt-4 font-serif text-lg font-bold text-brand-900">No matching workshop bookings</p>
            {search ? (
              <p className="mt-1 text-sm text-stone-500">
                No tickets or attendees match &ldquo;{search}&rdquo;. Try another name or clear your search.
              </p>
            ) : (
              <p className="mt-1 text-sm text-stone-500">
                You do not have any bookings in this status tab.
              </p>
            )}
            {search && (
              <button type="button" className="btn-outline mt-4 min-h-10" onClick={() => setSearch('')}>
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
