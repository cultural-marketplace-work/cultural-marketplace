
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Pencil, Save, X, Truck, Search } from 'lucide-react';

interface Row {
  id: number;
  order_id: number;
  tracking: string;
  status: string;
  artisan: string;
  recipient: string;
  items: string;
  weight: number;
  declared: number;
  created_at: string;
}

const STATUSES = ['created', 'dropped_off', 'in_transit', 'delivered', 'cancelled'];

const STATUS_STYLE: Record<string, string> = {
  created: 'bg-stone-100 text-stone-700',
  dropped_off: 'bg-ochre-100 text-ochre-900',
  in_transit: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function AdminShipmentsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [newTracking, setNewTracking] = useState('');

  // Tracking search
  const [trackingQuery, setTrackingQuery] = useState('');
  const [appliedTracking, setAppliedTracking] = useState('');

  const filteredRows = rows.filter((r) =>
    r.tracking.toLowerCase().includes(appliedTracking.toLowerCase().trim())
  );

  function searchTracking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAppliedTracking(trackingQuery.trim());
  }

  function clearSearch() {
    setTrackingQuery('');
    setAppliedTracking('');
  }

  async function setStatus(id: number, status: string) {
    setBusy(true);
    setError('');

    try {
      const res = await fetch(`/api/shipments/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setError(data.message ?? 'Unable to update shipment status.');
        return;
      }

      setRows((rs) => rs.map((r) => r.id === id ? { ...r, status } : r));
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function fixTracking(id: number) {
    if (!newTracking.trim()) {
      setError('Please enter a tracking number.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const tracking = newTracking.trim().toUpperCase();
      const res = await fetch(`/api/admin/shipments/${id}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_number: tracking }),
      });
      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setError(data.message ?? 'Unable to update tracking number.');
        return;
      }

      setRows((rs) => rs.map((r) => r.id === id ? { ...r, tracking } : r));
      setEditing(null);
      setTrackingQuery('');
      setAppliedTracking('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3">

      {/* Tracking number search */}
      <form
        onSubmit={searchTracking}
        className="flex min-w-0 flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="search"
            value={trackingQuery}
            onChange={(e) => setTrackingQuery(e.target.value)}
            placeholder="Search tracking number..."
            aria-label="Search by tracking number"
            className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-700 outline-none placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white transition hover:bg-brand-900 sm:flex-none"
          >
            <Search size={15} />
            Search
          </button>

          <button
            type="button"
            onClick={clearSearch}
            className="h-10 rounded-lg border border-stone-300 px-4 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Clear
          </button>
        </div>

        <span className="text-xs text-stone-400 sm:ml-2">
          {filteredRows.length} of {rows.length} shipments
        </span>
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Shipment records */}
      {filteredRows.map((r) => (
        <article
          key={r.id}
          className="min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-4"
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-3">

            {/* Product and order */}
            <div className="min-w-0 flex-1 basis-40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Shipment #{r.id} · Order #{r.order_id}
              </p>
              <p className="mt-0.5 break-words text-sm font-semibold text-stone-800">
                {r.items || 'No item description'}
              </p>
            </div>

            {/* Tracking number */}
            <div className="min-w-0 flex-1 basis-44">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Tracking Number
              </p>

              {editing === r.id ? (
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <input
                    aria-label="Tracking number"
                    className="h-8 min-w-0 w-full rounded-lg border border-stone-300 px-2 font-mono text-xs leading-normal"
                    value={newTracking}
                    onChange={(e) => setNewTracking(e.target.value)}
                    placeholder="Tracking number"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="rounded-lg bg-brand-800 p-2 text-white disabled:opacity-50"
                    disabled={busy}
                    onClick={() => fixTracking(r.id)}
                    aria-label="Save tracking number"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-200 p-2 text-stone-600"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                    aria-label="Cancel editing"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="break-all font-mono text-xs font-bold text-brand-800">
                    {r.tracking || 'No tracking number'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(r.id);
                      setNewTracking(r.tracking);
                      setError('');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                    aria-label={`Edit tracking number for shipment ${r.id}`}
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Shipment information */}
            <div className="flex min-w-0 flex-1 basis-64 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
              <span className="min-w-0 break-words">
                <b className="text-stone-600">From:</b> {r.artisan || '—'}
              </span>
              <span className="min-w-0 break-words">
                <b className="text-stone-600">To:</b> {r.recipient || '—'}
              </span>
              <span className="whitespace-nowrap">
                <b className="text-stone-600">Weight:</b> {r.weight ?? 0} kg
              </span>
              <span className="whitespace-nowrap">
                <b className="text-stone-600">Value:</b> ₱{Number(r.declared ?? 0).toFixed(2)}
              </span>
            </div>

            {/* Status selector */}
            <div className="w-full min-w-0 sm:w-48 sm:flex-none">
              <label
                htmlFor={`status-${r.id}`}
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400"
              >
                Shipment Status
              </label>

              <div className="relative">
                <select
                  id={`status-${r.id}`}
                  className="block h-8 w-full appearance-none rounded-lg border border-stone-300 bg-white py-0 pl-3 pr-9 font-sans text-xs font-medium leading-5 tracking-normal text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    lineHeight: '20px',
                    letterSpacing: 'normal',
                  }}
                  value={r.status}
                  disabled={busy || r.status === 'delivered'}
                  onChange={(e) => setStatus(r.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
                />
              </div>
            </div>
          </div>

          {/* Created date */}
          <div className="mt-2 border-t border-stone-100 pt-2 text-[10px] text-stone-400">
            <Truck size={11} className="mr-1 inline" />
            Created: {new Date(r.created_at).toLocaleString()}
          </div>
        </article>
      ))}

      {filteredRows.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center">
          <Search size={22} className="mx-auto text-stone-300" />
          <p className="mt-2 text-sm font-semibold text-stone-700">
            No matching shipments found
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Check the tracking number or clear your search.
          </p>
          <button
            type="button"
            onClick={clearSearch}
            className="mt-3 text-xs font-semibold text-brand-700 hover:underline"
          >
            Show all shipments
          </button>
        </div>
      )}
    </div>
  );
}
