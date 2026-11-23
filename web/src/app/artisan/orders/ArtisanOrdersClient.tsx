'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  Search,
  Ticket,
  Truck,
  UserRound,
} from 'lucide-react';

interface Row {
  item_id: number; order_id: number; product_name: string; quantity: number;
  variant: string | null; customer: string; payment: string; status: string;
  purchase_type: string; tracking_number: string | null;
  attendee_name?: string | null; attendee_for?: string | null;
}

const NEXT_STATUS: Record<string, Array<{ value: string; label: string }>> = {
  pending: [{ value: 'preparing', label: 'Start preparing' }, { value: 'cancelled', label: 'Cancel' }],
  paid: [{ value: 'preparing', label: 'Start preparing' }, { value: 'cancelled', label: 'Cancel' }],
  preparing: [{ value: 'ready_to_ship', label: 'Ready to ship' }, { value: 'cancelled', label: 'Cancel' }],
  ready_to_ship: [{ value: 'shipped', label: 'Mark shipped' }, { value: 'cancelled', label: 'Cancel' }],
  shipped: [{ value: 'received', label: 'Await customer receipt' }],
  awaiting_payment: [],
  received: [],
  cancelled: [],
  no_show: [],
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  preparing: 'border-ochre-200 bg-ochre-50 text-ochre-900',
  ready_to_ship: 'border-abaca-300 bg-canvas text-brand-700',
  shipped: 'border-abaca-200 bg-ochre-50 text-ochre-900',
  received: 'border-green-200 bg-green-50 text-green-800',
  cancelled: 'border-stone-200 bg-stone-100 text-stone-600',
  awaiting_payment: 'border-amber-200 bg-amber-50 text-amber-800',
  no_show: 'border-red-200 bg-red-50 text-red-700',
};

const NEEDS_ATTENTION_STATUSES = ['pending', 'paid', 'preparing', 'ready_to_ship'];

type Filter = 'all' | 'needs_action' | 'shipping' | 'completed';

export default function ArtisanOrdersClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(() => ({
    all: rows.length,
    needs_action: rows.filter((row) => NEEDS_ATTENTION_STATUSES.includes(row.status)).length,
    shipping: rows.filter((row) => ['ready_to_ship', 'shipped'].includes(row.status)).length,
    completed: rows.filter((row) => row.status === 'received').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter = filter === 'all'
        || (filter === 'needs_action' && NEEDS_ATTENTION_STATUSES.includes(row.status))
        || (filter === 'shipping' && ['ready_to_ship', 'shipped'].includes(row.status))
        || (filter === 'completed' && row.status === 'received');
      const matchesQuery = !normalizedQuery ||
        [row.product_name, row.customer, row.order_id.toString(), row.tracking_number ?? '']
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, rows]);

  async function setStatus(itemId: number, status: string) {
    setSavingItemId(itemId);
    setError('');
    try {
      const response = await fetch(`/api/artisan/orders/${itemId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('The order status could not be updated. Please try again.');
      setRows((currentRows) => currentRows.map((row) => (
        row.item_id === itemId ? { ...row, status } : row
      )));
      router.refresh();
    } catch (cause) {
      console.error('[artisan-orders] failed to update order status:', cause);
      setError(cause instanceof Error ? cause.message : 'The order status could not be updated. Please try again.');
    } finally {
      setSavingItemId(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section aria-label="Order summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: 'all' as const, label: 'All orders', value: counts.all, note: 'Across your shop', Icon: Package },
          { key: 'needs_action' as const, label: 'Needs attention', value: counts.needs_action, note: 'Ready for your next step', Icon: Clock3 },
          { key: 'shipping' as const, label: 'Shipping', value: counts.shipping, note: 'Ready or on the way', Icon: Truck },
          { key: 'completed' as const, label: 'Completed', value: counts.completed, note: 'Received by customers', Icon: CheckCircle2 },
        ].map(({ key, label, value, note, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${filter === key ? 'border-ochre-400 bg-ochre-50/80' : 'border-abaca-200/80 bg-white/90'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ochre-800 shadow-sm">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="font-serif text-3xl font-bold text-brand-900">{value}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-stone-800">{label}</p>
            <p className="mt-1 text-xs text-stone-500">{note}</p>
          </button>
        ))}
      </section>

      <section aria-label="Order list" className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Your orders</h2>
            <p className="mt-1 text-xs text-stone-500">{filteredRows.length} {filteredRows.length === 1 ? 'order' : 'orders'} shown</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search orders</span>
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className="input min-h-11 pl-10"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search crafts, customers, order #"
            />
          </label>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        {filteredRows.map((r) => (
          <article key={r.item_id} className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm transition hover:border-ochre-300 hover:shadow-md">
            <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                  {r.purchase_type === 'workshop' ? <Ticket size={20} aria-hidden="true" /> : <Package size={20} aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-brand-900">{r.product_name}</h3>
                    <span className={`badge border capitalize ${STATUS_STYLE[r.status] ?? 'border-stone-200 bg-stone-100 text-stone-600'}`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {r.quantity} {r.quantity === 1 ? 'item' : 'items'}{r.variant ? ` · ${r.variant}` : ''}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ochre-800">Order #{r.order_id}</p>
                </div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[280px]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserRound size={16} aria-hidden="true" className="shrink-0 text-stone-400" />
                  <span className="truncate text-stone-700">{r.customer}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CreditCard size={16} aria-hidden="true" className="shrink-0 text-stone-400" />
                  <span className="text-stone-700">{r.payment === 'gcash' ? 'GCash' : 'Cash on delivery'}</span>
                </div>
                {r.purchase_type === 'workshop' && (
                  <div className="flex min-w-0 items-center gap-2.5 sm:col-span-2">
                    <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-stone-400" />
                    <span className="truncate text-stone-700">
                      Attendee: <strong className="font-semibold">{r.attendee_name ?? 'Not provided'}</strong>
                      {r.attendee_for === 'others' && ' · Guest / group'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {(r.tracking_number || r.purchase_type !== 'workshop' && ['paid', 'pending', 'preparing', 'ready_to_ship'].includes(r.status) || (NEXT_STATUS[r.status] ?? []).length > 0) && (
              <div className="flex flex-col gap-3 border-t border-abaca-100 bg-canvas/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex flex-wrap items-center gap-3">
                  {r.tracking_number && (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-stone-600">
                      <Truck size={15} aria-hidden="true" className="text-ochre-800" />
                      Tracking <span className="font-mono font-bold text-brand-900">{r.tracking_number}</span>
                    </span>
                  )}
                  {r.attendee_for === 'others' && (
                    <span className="badge border border-ochre-300 bg-ochre-100 text-ochre-900">Guest / group booking</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.purchase_type !== 'workshop' && ['paid', 'pending', 'preparing', 'ready_to_ship'].includes(r.status) && (
                    <Link
                      className="btn-primary min-h-10 px-3 text-xs"
                      href={`/artisan/orders/${r.item_id}/ship`}
                      prefetch={true}
                    >
                      <Truck size={15} aria-hidden="true" />
                      Ship with J&amp;T
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  )}
                  {(NEXT_STATUS[r.status] ?? []).map((status) => (
                    <button
                      key={status.value}
                      className={`min-h-10 px-3 text-xs ${status.value === 'cancelled' ? 'btn-danger' : 'btn-outline'}`}
                      disabled={savingItemId === r.item_id}
                      onClick={() => void setStatus(r.item_id, status.value)}
                    >
                      {savingItemId === r.item_id ? 'Saving…' : status.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-12 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <Package size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-900">Your next order starts with a creation</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Add a handcrafted piece or experience to your shop to welcome your first order.
            </p>
            <Link href="/artisan/products/new" className="btn-primary mt-5">
              Add a creation <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
        {rows.length > 0 && filteredRows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-10 text-center">
            <Search size={22} aria-hidden="true" className="mx-auto text-stone-400" />
            <h3 className="mt-3 font-semibold text-brand-900">No matching orders</h3>
            <p className="mt-1 text-sm text-stone-500">Try another search or choose a different order group.</p>
            <button type="button" className="btn-outline mt-4" onClick={() => { setQuery(''); setFilter('all'); }}>
              Show all orders
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
