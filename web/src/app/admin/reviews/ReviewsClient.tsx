
'use client';

import { useMemo, useState } from 'react';

interface Row {
  item_id: number;
  product: string;
  customer: string;
  rating: number;
  comment: string | null;
  visible: boolean;
  reviewed: string;
}

type FilterStatus = 'all' | 'visible' | 'hidden';

export default function ReviewsClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const stats = useMemo(() => {
    const total = rows.length;
    const visible = rows.filter((r) => r.visible).length;
    const hidden = total - visible;
    const rated = rows.filter((r) => r.rating > 0);
    const average = rated.length
      ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length
      : 0;

    return { total, visible, hidden, average };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchesSearch =
        !term ||
        r.product.toLowerCase().includes(term) ||
        r.customer.toLowerCase().includes(term) ||
        (r.comment ?? '').toLowerCase().includes(term);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'visible' && r.visible) ||
        (filter === 'hidden' && !r.visible);

      return matchesSearch && matchesFilter;
    });
  }, [rows, search, filter]);

  async function act(itemId: number, action: 'toggle' | 'delete') {
    if (busyId !== null) return;

    if (
      action === 'delete' &&
      !window.confirm('Are you sure you want to permanently delete this review? This action cannot be undone.')
    ) {
      return;
    }

    setBusyId(itemId);
    setMessage('');

    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, action }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Unable to complete the review action.');
      }

      if (action === 'delete') {
        setRows((current) =>
          current.filter((r) => r.item_id !== itemId)
        );
        setMessage('Review deleted successfully.');
      } else {
        setRows((current) =>
          current.map((r) =>
            r.item_id === itemId
              ? { ...r, visible: !r.visible }
              : r
          )
        );
        setMessage('Review visibility updated successfully.');
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  }

  const filters: { label: string; value: FilterStatus; count: number }[] = [
    { label: 'All Reviews', value: 'all', count: stats.total },
    { label: 'Visible', value: 'visible', count: stats.visible },
    { label: 'Hidden', value: 'hidden', count: stats.hidden },
  ];

  return (
    <div className="mt-6 space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#71675F]">
            Total Reviews
          </p>
          <p className="mt-2 text-2xl font-bold text-[#3D3028]">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-[#8A8078]">
            Customer feedback received
          </p>
        </div>

        <div className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#71675F]">
            Visible Reviews
          </p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {stats.visible}
          </p>
          <p className="mt-1 text-xs text-[#8A8078]">
            Displayed to marketplace visitors
          </p>
        </div>

        <div className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#71675F]">
            Hidden Reviews
          </p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {stats.hidden}
          </p>
          <p className="mt-1 text-xs text-[#8A8078]">
            Not currently displayed
          </p>
        </div>

        <div className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#71675F]">
            Average Rating
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-bold text-[#3D3028]">
              {stats.average.toFixed(1)}
            </p>
            <span className="text-lg text-[#B7791F]">★</span>
          </div>
          <p className="mt-1 text-xs text-[#8A8078]">
            Across {rows.filter((r) => r.rating > 0).length} rated reviews
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[#3D3028]">
              Customer Reviews
            </h2>
            <p className="mt-1 text-xs text-[#71675F]">
              Manage customer feedback and review visibility.
            </p>
          </div>

          <div className="w-full lg:max-w-sm">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, customer, or comment..."
              className="w-full rounded-lg border border-[#D6D0C9] bg-[#FFFEFC] px-4 py-2.5 text-sm text-[#3D3028] outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                filter === item.value
                  ? 'bg-[#8B0000] text-white'
                  : 'border border-[#D6D0C9] bg-white text-[#71675F] hover:bg-[#FCF9F4]'
              }`}
            >
              {item.label}
              <span className="ml-2 opacity-75">
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          role="status"
          className="rounded-lg border border-[#D6D0C9] bg-[#FCF9F4] px-4 py-3 text-sm text-[#3D3028]"
        >
          {message}
        </div>
      )}

      {/* Review List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-[#3D3028]">
            Review List
          </h2>
          <p className="text-xs text-[#71675F]">
            Showing {filteredRows.length} of {rows.length} reviews
          </p>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D6D0C9] bg-white px-4 py-12 text-center">
            <p className="text-base font-semibold text-[#3D3028]">
              No reviews found
            </p>
            <p className="mt-1 text-sm text-[#71675F]">
              {search || filter !== 'all'
                ? 'Try changing your search or filter.'
                : 'Customer reviews will appear here once submitted.'}
            </p>
          </div>
        ) : (
          filteredRows.map((r) => (
            <div
              key={r.item_id}
              className={`rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm transition hover:shadow-md ${
                !r.visible ? 'opacity-75' : ''
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#3D3028]">
                      {r.product || 'Untitled Product'}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        r.visible
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {r.visible ? 'Visible' : 'Hidden'}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#71675F]">
                    <span>By {r.customer}</span>
                    {r.reviewed && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span>{r.reviewed}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-base tracking-wide text-[#B7791F]">
                      {'★'.repeat(Math.max(0, Math.min(5, r.rating)))}
                      <span className="text-[#D6D0C9]">
                        {'☆'.repeat(5 - Math.max(0, Math.min(5, r.rating)))}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#3D3028]">
                      {r.rating}/5
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#FCF9F4] p-3">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#5B5048]">
                      {r.comment?.trim()
                        ? `“${r.comment}”`
                        : 'No written comment provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => act(r.item_id, 'toggle')}
                    className="rounded-lg border border-[#D6D0C9] px-4 py-2 text-xs font-semibold text-[#5B5048] transition hover:bg-[#FCF9F4] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === r.item_id
                      ? 'Processing...'
                      : r.visible
                        ? 'Hide Review'
                        : 'Show Review'}
                  </button>

                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => act(r.item_id, 'delete')}
                    className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
