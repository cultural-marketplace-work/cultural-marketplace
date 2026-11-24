'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Package,
  Printer,
  Search,
  Truck,
} from 'lucide-react';

interface Row {
  id: number;
  order_id: number;
  tracking: string;
  status: string;
  recipient: string;
  items: string;
  weight: number;
  declared: number;
  order_item_id: number;
  updated_at: string;
}

const NEXT: Record<string, { value: string; label: string }> = {
  created: { value: 'dropped_off', label: 'Mark dropped off' },
  dropped_off: { value: 'in_transit', label: 'Mark in transit' },
  in_transit: { value: 'delivered', label: 'Mark delivered' },
};

const STATUS_STYLE: Record<string, string> = {
  created: 'border-abaca-200 bg-canvas text-stone-700',
  dropped_off: 'border-ochre-300 bg-ochre-100 text-ochre-900',
  in_transit: 'border-brand-200 bg-brand-50 text-brand-800',
  delivered: 'border-green-200 bg-green-50 text-green-800',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  created: 'Label created',
  dropped_off: 'Dropped off',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function ShipmentsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => ({
    all: rows.length,
    moving: rows.filter((row) => ['dropped_off', 'in_transit'].includes(row.status)).length,
    delivered: rows.filter((row) => row.status === 'delivered').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;
    return rows.filter((row) =>
      [row.tracking, row.recipient, row.items, String(row.order_id)]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [query, rows]);

  async function advance(id: number, status: string) {
    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`/api/shipments/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message ?? 'Shipment status could not be updated. Please try again.');
      }
      setRows((currentRows) => currentRows.map((row) => (
        row.id === id ? { ...row, status, updated_at: new Date().toISOString() } : row
      )));
      router.refresh();
    } catch (cause) {
      console.error('[artisan-shipments] failed to update shipment status:', cause);
      setError(cause instanceof Error ? cause.message : 'Shipment status could not be updated. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <section aria-label="Shipment overview" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'All parcels', value: counts.all, note: 'Booked for your orders', Icon: Package },
          { label: 'On the way', value: counts.moving, note: 'Dropped off or in transit', Icon: Truck },
          { label: 'Delivered', value: counts.delivered, note: 'Successfully received', Icon: CheckCircle2 },
        ].map(({ label, value, note, Icon }) => (
          <div key={label} className="rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="font-serif text-3xl font-bold text-brand-900">{value}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-stone-800">{label}</p>
            <p className="mt-1 text-xs text-stone-500">{note}</p>
          </div>
        ))}
      </section>

      <section aria-label="Shipment list" className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Your parcels</h2>
            <p className="mt-1 text-xs text-stone-500">{filteredRows.length} {filteredRows.length === 1 ? 'shipment' : 'shipments'} shown</p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search shipments</span>
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              className="input min-h-11 pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracking, recipient, order…"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {filteredRows.map((row) => {
          const next = NEXT[row.status];
          const statusClass = STATUS_STYLE[row.status] ?? 'border-abaca-200 bg-canvas text-stone-700';
          const updated = new Date(row.updated_at);
          return (
            <article key={row.id} className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm transition hover:border-ochre-300 hover:shadow-md">
              <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                    <Package size={20} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-brand-900">Order #{row.order_id}</h3>
                      <span className={`badge border capitalize ${statusClass}`}>
                        {STATUS_LABEL[row.status] ?? row.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-1.5 break-words text-sm font-medium leading-5 text-stone-700">{row.items}</p>
                    <p className="mt-2 text-xs text-stone-500">Recipient <span className="font-semibold text-stone-700">{row.recipient}</span></p>
                  </div>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[280px]">
                  <div className="rounded-xl border border-abaca-100 bg-canvas/60 p-3 sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ochre-800">J&amp;T tracking number</p>
                    <p className="mt-1 break-all font-mono text-sm font-bold text-brand-900">{row.tracking}</p>
                  </div>
                  <p className="text-xs text-stone-600"><span className="font-semibold text-stone-800">Weight:</span> {row.weight} kg</p>
                  <p className="text-xs text-stone-600"><span className="font-semibold text-stone-800">Declared value:</span> ₱{row.declared.toFixed(2)}</p>
                  <p className="flex items-center gap-1.5 text-xs text-stone-500 sm:col-span-2">
                    <Clock3 size={13} aria-hidden="true" />
                    Updated {Number.isNaN(updated.getTime()) ? row.updated_at : updated.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-abaca-100 bg-canvas/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-xs leading-5 text-stone-500">
                  {row.status === 'delivered'
                    ? 'This parcel is marked as delivered.'
                    : next
                      ? 'Update the parcel status as it moves through delivery.'
                      : 'No further status updates are available.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="btn-outline min-h-10 px-3 text-xs"
                    href={`/artisan/orders/${row.order_item_id}/waybill`}
                    prefetch={true}
                  >
                    <Printer size={15} aria-hidden="true" />
                    View waybill
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                  {next && (
                    <button
                      type="button"
                      className="btn-primary min-h-10 px-3 text-xs"
                      disabled={busyId === row.id}
                      onClick={() => void advance(row.id, next.value)}
                    >
                      <Truck size={15} aria-hidden="true" />
                      {busyId === row.id ? 'Updating…' : next.label}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-12 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <Truck size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-900">No shipments yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              When you book delivery for an order, its tracking and status updates will appear here.
            </p>
            <Link href="/artisan/orders" className="btn-primary mt-5 min-h-10">
              View orders <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
        {rows.length > 0 && filteredRows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-10 text-center">
            <Search size={22} aria-hidden="true" className="mx-auto text-stone-400" />
            <h3 className="mt-3 font-semibold text-brand-900">No matching shipments</h3>
            <p className="mt-1 text-sm text-stone-500">Try another tracking number, recipient, item, or order number.</p>
          </div>
        )}
      </section>
    </div>
  );
}
