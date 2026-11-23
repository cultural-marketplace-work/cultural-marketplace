
'use client';

import { useMemo, useState } from 'react';
import { Search, X, Ticket, Users } from 'lucide-react';

interface Booking {
  order_item_id: number;
  order_id: number;
  product_name: string;
  purchase_type?: string | null;  customer_name: string;
customer_phone?: string | null;  attendee_name: string | null;
  attendee_for?: string | null;
  selected_session: {
    date: string;
    time_start: string;
    time_end: string;
  } | null;
  quantity: number;
  price: number;
  status: string;
  ticket_code: string | null;
}

export default function BookingHistoryClient({
  bookings,
}: {
  bookings: Booking[];
}) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return bookings;

    return bookings.filter((booking) =>
      booking.customer_name.toLowerCase().includes(query)
    );
  }, [bookings, searchQuery]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSearchQuery(searchInput);
  }

  function clearSearch() {
    setSearchInput('');
    setSearchQuery('');
  }

  return (
    <section className="space-y-4">
      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer name..."
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-3 pl-10 pr-10 text-sm text-stone-800 outline-none transition focus:border-[#9E2A2B] focus:ring-2 focus:ring-[#9E2A2B]/10"
          />

          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8f2928] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#70201f]"
        >
          <Search size={16} />
          Search
        </button>

        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            Clear
          </button>
        )}
      </form>

      {/* Results count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-500">
          {searchQuery ? (
            <>
              Showing <strong className="text-stone-800">{filteredBookings.length}</strong> of{' '}
              <strong className="text-stone-800">{bookings.length}</strong> records
              for &quot;{searchQuery}&quot;
            </>
          ) : (
            <>
              Showing all <strong className="text-stone-800">{bookings.length}</strong> booking records
            </>
          )}
        </p>
      </div>

      {/* Booking records */}
      <div className="space-y-3">
        {filteredBookings.map((b) => (
          <article
            key={b.order_item_id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-semibold text-stone-900">
                    {b.product_name}
                  </h2>

                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold capitalize text-stone-600">
                    {(b.purchase_type || 'workshop').replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="mt-1 text-sm text-stone-500">
                  Order #{b.order_id} · Booking #{b.order_item_id}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Customer
                    </p>
                    <p className="mt-1 font-medium text-stone-800">
                      {b.customer_name}
                    </p>
                    {b.customer_phone && (
                      <p className="text-xs text-stone-500">
                        {b.customer_phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Attendee
                    </p>
                    <p className="mt-1 text-stone-800">
                      {b.attendee_name || b.customer_name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {b.attendee_for === 'others' ? 'Guest / Group' : 'Self'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Scheduled session
                    </p>
                    <p className="mt-1 text-stone-700">
                      {b.selected_session
                        ? `${b.selected_session.date} · ${b.selected_session.time_start}–${b.selected_session.time_end}`
                        : 'No session information'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Booking details
                    </p>
                    <p className="mt-1 text-stone-700">
                      Quantity: {b.quantity} · ₱{b.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    b.status === 'cancelled' || b.status === 'no_show'
                      ? 'bg-red-100 text-red-700'
                      : b.status === 'attended'
                        ? 'bg-charcoal-900 text-ochre-300'
                        : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {b.status.replace(/_/g, ' ')}
                </span>

                {b.ticket_code && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-brand-700">
                    <Ticket size={13} />
                    {b.ticket_code}
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}

        {filteredBookings.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
            <Users size={30} className="mx-auto text-stone-400" />

            <p className="mt-3 font-semibold text-stone-700">
              {searchQuery
                ? 'No matching customer found'
                : 'No booking history found'}
            </p>

            <p className="mt-1 text-sm text-stone-500">
              {searchQuery
                ? `No booking records match "${searchQuery}". Try another customer name.`
                : 'Historical workshop and experience bookings will appear here.'}
            </p>

            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-4 text-sm font-semibold text-[#8f2928] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
