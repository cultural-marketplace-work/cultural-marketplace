
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface OrderItemRow {
  id: number;
  product_id?: number;
  name: string;
  image_path: string | null;
  qty: number;
  status: string;
  price: number;
  rating: number | null;
  tracking: string | null;
  courier: string | null;
  purchase_type?: string;
  ticket_code?: string | null;
  selected_session?: {
    date: string;
    time_start: string;
    time_end: string;
    location?: string;
  } | null;
  selected_variant?: string | null;
  attendee_name?: string | null;
}

export interface OrderRow {
  id: number;
  status: string;
  method: string;
  total: number;
  created_at: string;
  items: OrderItemRow[];
}

type FilterKey =
  | 'all'
  | 'to_pay'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'to_review'
  | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Orders' },
  { key: 'to_pay', label: 'To Pay' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'completed', label: 'Completed' },
  { key: 'to_review', label: 'To Review' },
  { key: 'cancelled', label: 'Cancelled' },
];

const CANCELLATION_REASONS = [
  'Ordered by mistake',
  'Schedule conflict / Cannot attend workshop',
  'Need to change delivery address',
  'Found an alternative craft item',
  'Decided to purchase later',
  'Other reasons',
];

const PROCESSING_STATUSES = [
  'pending',
  'accepted',
  'processing',
  'preparing',
];

const REVIEW_STATUSES = ['delivered', 'received'];

const peso = (amount: number) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function isToReview(item: OrderItemRow) {
  return (
    REVIEW_STATUSES.includes(item.status) &&
    item.rating == null &&
    item.purchase_type !== 'workshop'
  );
}

function orderMatchesFilter(order: OrderRow, filter: FilterKey) {
  const items = order.items;

  switch (filter) {
    case 'to_pay':
      return (
        order.status === 'awaiting_payment' ||
        items.some((i) => i.status === 'awaiting_payment')
      );

    case 'processing':
      return (
        items.some((i) => PROCESSING_STATUSES.includes(i.status)) ||
        (!items.length && order.status === 'pending')
      );

    case 'shipped':
      return items.some((i) => i.status === 'shipped');

    case 'completed':
      return (
        ['completed', 'received', 'delivered'].includes(order.status) ||
        items.some((i) => REVIEW_STATUSES.includes(i.status))
      );

    case 'to_review':
      return items.some(isToReview);

    case 'cancelled':
      return (
        order.status === 'cancelled' ||
        items.some((i) => ['cancelled', 'rejected'].includes(i.status))
      );

    default:
      return true;
  }
}

function orderStatus(order: OrderRow) {
  if (order.status === 'cancelled') return 'Cancelled';
  if (order.status === 'awaiting_payment') return 'Awaiting Payment';
  if (order.items.some((i) => i.status === 'shipped')) return 'Shipped';
  if (order.items.some((i) => i.status === 'received')) return 'Received';
  if (order.items.some((i) => i.status === 'delivered')) return 'Delivered';
  if (order.items.some((i) => PROCESSING_STATUSES.includes(i.status))) {
    return 'Processing';
  }
  if (['completed', 'received'].includes(order.status)) return 'Completed';
  return order.status.replace(/_/g, ' ');
}

function statusStyle(status: string) {
  const value = status.toLowerCase();

  if (['completed', 'received', 'delivered'].includes(value)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (value === 'shipped') {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  if (['cancelled', 'rejected'].includes(value)) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  if (value === 'awaiting payment') {
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }

  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
function getProductImage(imagePath: string | null | undefined) {
  if (!imagePath) return null;

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('/')
  ) {
    return imagePath;
  }

  return `/${imagePath}`;
}

function TrackingCard({
  tracking,
  courier,
  status,
}: {
  tracking: string;
  courier: string;
  status: string;
}) {
  const steps = [
    { key: 'created', label: 'Booked' },
    { key: 'dropped_off', label: 'Drop-off' },
    { key: 'in_transit', label: 'In transit' },
    { key: 'delivered', label: 'Delivered' },
  ];
  const index = steps.findIndex((s) => s.key === status);

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            {courier || 'J&T Express'} · Tracking Number
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-indigo-900">
            {tracking}
          </p>
        </div>

        <a
          href={`https://www.jtexpress.ph/track/${encodeURIComponent(tracking)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          Track Package ↗
        </a>
      </div>

      <div className="mt-5 flex items-start">
        {steps.map((step, i) => (
          <div key={step.key} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div className="h-0.5 flex-1 bg-transparent" />
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i <= index
                    ? 'bg-indigo-600 text-white'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {i <= index ? '✓' : i + 1}
              </div>
              <div
                className={`h-0.5 flex-1 ${
                  i < index ? 'bg-indigo-600' : 'bg-stone-200'
                } ${i === steps.length - 1 ? 'invisible' : ''}`}
              />
            </div>
            <span className="mt-2 text-center text-[9px] font-medium text-stone-500 sm:text-[10px]">
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8DCCB] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${color}`}>
          {icon}
        </span>
        <span className="text-2xl font-bold tabular-nums text-[#3D3028]">
          {value}
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#71675F]">{label}</p>
    </div>
  );
}

export default function OrdersClient({
  initial,
  targetReviewItemId,
  targetOrderId,
}: {
  initial: OrderRow[];
  targetReviewItemId: number | null;
  targetOrderId: number | null;
}) {
  const router = useRouter();

  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);

  const [cancellingOrder, setCancellingOrder] =
    useState<OrderRow | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  // Automatically open the review form requested by the dashboard.
  useEffect(() => {
    if (!targetReviewItemId || !targetOrderId) return;

    const order = rows.find((r) => r.id === targetOrderId);
    const item = order?.items.find((i) => i.id === targetReviewItemId);

    if (!order || !item || !isToReview(item)) return;

    setReviewing(item.id);
    setRating(5);
    setComment('');

    setExpandedOrders((previous) =>
      previous.includes(order.id) ? previous : [...previous, order.id]
    );

    requestAnimationFrame(() => {
      document
        .getElementById(`item-${item.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [rows, targetReviewItemId, targetOrderId]);

  // Live order summary.
  const summary = useMemo(() => {
    const allItems = rows.flatMap((r) => r.items);

    return {
      total: rows.length,
      processing: rows.filter((r) =>
        orderMatchesFilter(r, 'processing')
      ).length,
      shipped: rows.filter((r) => orderMatchesFilter(r, 'shipped')).length,
      review: allItems.filter(isToReview).length,
    };
  }, [rows]);

  // Filter and search.
  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((order) => {
      if (!orderMatchesFilter(order, filter)) return false;
      if (!term) return true;

      return (
        String(order.id).includes(term) ||
        order.items.some((item) => item.name.toLowerCase().includes(term))
      );
    });
  }, [rows, filter, search]);

  function toggleExpanded(orderId: number) {
    setExpandedOrders((previous) =>
      previous.includes(orderId)
        ? previous.filter((id) => id !== orderId)
        : [...previous, orderId]
    );
  }

  async function receive(itemId: number) {
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/orders/item/${itemId}/receive`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setMsg({
          type: 'error',
          text: data.message || 'Could not confirm item receipt.',
        });
        return;
      }

      setRows((previous) =>
        previous.map((order) => ({
          ...order,
          items: order.items.map((item) =>
            item.id === itemId
              ? { ...item, status: 'received' }
              : item
          ),
        }))
      );

      setMsg({
        type: 'success',
        text: 'Item marked as received. You can now leave a review.',
      });

      router.refresh();
    } catch {
      setMsg({
        type: 'error',
        text: 'Network error while confirming receipt.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitReview(itemId: number) {
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/orders/item/${itemId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setMsg({
          type: 'error',
          text: data.message ?? 'Review failed.',
        });
        return;
      }

      setRows((previous) =>
        previous.map((order) => ({
          ...order,
          items: order.items.map((item) =>
            item.id === itemId ? { ...item, rating } : item
          ),
        }))
      );

      setReviewing(null);
      setComment('');

      setMsg({
        type: 'success',
        text: 'Thank you! Your review has been submitted successfully.',
      });
    } catch {
      setMsg({
        type: 'error',
        text: 'Network error while submitting your review.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmCancel() {
    if (!cancellingOrder) return;

    setBusy(true);
    setMsg(null);

    const finalReason =
      cancelReason === 'Other reasons' && customReason.trim()
        ? customReason.trim()
        : cancelReason;

    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: cancellingOrder.id,
          reason: finalReason,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setMsg({
          type: 'error',
          text: data.message || 'Could not cancel order.',
        });
        return;
      }

      setRows((previous) =>
        previous.map((order) =>
          order.id === cancellingOrder.id
            ? {
                ...order,
                status: 'cancelled',
                items: order.items.map((item) => ({
                  ...item,
                  status: 'cancelled',
                })),
              }
            : order
        )
      );

      setCancellingOrder(null);
      setCustomReason('');

      setMsg({
        type: 'success',
        text: `Order #${cancellingOrder.id} has been cancelled successfully.`,
      });

      router.refresh();
    } catch {
      setMsg({
        type: 'error',
        text: 'Network error while attempting cancellation.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <section className="relative overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#F8EEDC] opacity-70" />
        <div className="absolute -right-2 bottom-0 h-24 w-24 rounded-full border-[14px] border-[#F3E5CD] opacity-50" />

        <div className="relative z-10">
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#3D3028] sm:text-4xl">
          My Orders & Purchases
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#71675F]">
            Keep track of your indigenous crafts, deliveries, and cultural
            workshop bookings all in one place.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/customer/browse"
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B0000] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#6F0000]"
            >
              Explore Crafts <span>→</span>
            </Link>

            <Link
              href="/customer/account/bookings"
              className="inline-flex items-center gap-2 rounded-lg border border-[#D6B56D] bg-white px-5 py-2.5 text-xs font-bold text-[#8B0000] transition hover:bg-[#FFF5E4]"
            >
              My Workshops
            </Link>
          </div>
        </div>
      </section>

      {/* STATUS MESSAGE */}
      {msg && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-medium ${
            msg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{msg.type === 'success' ? '✓' : '⚠'}</span>
          <p className="flex-1">{msg.text}</p>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="font-bold"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* ORDER SUMMARY */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#3D3028]">
              Order Overview
            </h2>
            <p className="mt-1 text-xs text-[#71675F]">
              A quick look at your purchases.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label="Total Orders"
            value={summary.total}
            icon="🛍️"
            color="bg-[#FFF3DE]"
          />
          <SummaryCard
            label="Processing"
            value={summary.processing}
            icon="📦"
            color="bg-blue-50"
          />
          <SummaryCard
            label="On the Way"
            value={summary.shipped}
            icon="🚚"
            color="bg-indigo-50"
          />
          <SummaryCard
            label="Items to Review"
            value={summary.review}
            icon="⭐"
            color="bg-emerald-50"
          />
        </div>
      </section>

      {/* ORDER LIST */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#3D3028]">
            Your Purchase History
          </h2>
          <p className="mt-1 text-xs text-[#71675F]">
            Search, filter, and manage your orders.
          </p>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#9A8F84]">
            ⌕
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number or product name..."
            className="w-full rounded-xl border border-[#E8DCCB] bg-white py-3 pl-11 pr-4 text-sm text-[#3D3028] outline-none transition placeholder:text-[#A69B90] focus:border-[#B78B45] focus:ring-2 focus:ring-[#D6B56D]/20"
          />
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((item) => {
            const active = filter === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-[#8B0000] bg-[#8B0000] text-white shadow-sm'
                    : 'border-[#E8DCCB] bg-white text-[#71675F] hover:border-[#D6B56D] hover:bg-[#FFF9EF]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* RESULTS COUNT */}
        <div className="flex items-center justify-between text-xs text-[#8A7D71]">
          <span>
            Showing <strong className="text-[#3D3028]">{filteredOrders.length}</strong>{' '}
            of {rows.length} orders
          </span>

          {(search || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              className="font-semibold text-[#8B0000] underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ORDER CARDS */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const canCancel =
                order.status === 'pending' ||
                order.status === 'awaiting_payment';

              const hasWorkshop = order.items.some(
                (item) =>
                  item.purchase_type === 'workshop' || item.ticket_code
              );

              const expanded = expandedOrders.includes(order.id);
              const status = orderStatus(order);

              return (
                <article
                  key={order.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                    targetOrderId === order.id && targetReviewItemId
                      ? 'border-[#D6B56D] ring-2 ring-[#D6B56D]/30'
                      : 'border-[#E8DCCB]'
                  }`}
                >
                  {/* ORDER HEADER */}
<div className="border-b border-[#F0E8DD] bg-[#FFFDFA] p-4 sm:p-5">
  {(() => {
    const primaryItem = order.items[0];

    const orderName = primaryItem
      ? order.items.length > 1
        ? `${primaryItem.name} + ${order.items.length - 1} more item(s)`
        : primaryItem.name
      : 'Order details';

    const productImage = getProductImage(primaryItem?.image_path);

    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* ORDER IMAGE AND INFORMATION */}
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E8DCCB] bg-[#F5EBDD]">
            {productImage ? (
              <img
                src={productImage}
                alt={orderName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">
                🧺
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-base font-bold text-[#3D3028]">
                {orderName}
              </h3>

              {hasWorkshop && (
                <span className="rounded-full border border-[#D6B56D] bg-[#FFF4DF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#80500D]">
                  Cultural Workshop
                </span>
              )}
            </div>

            <p className="mt-1.5 text-xs text-[#8A7D71]">
              Ordered on {formatDate(order.created_at)}
            </p>

            <p className="mt-1 text-xs text-[#8A7D71]">
              Payment: {order.method === 'gcash' ? 'GCash' : 'Cash on Delivery'}
              {' · '}
              {order.items.length} item(s)
            </p>

            <p className="mt-1 text-xs font-bold text-[#8B0000]">
              {peso(order.total)}
            </p>
          </div>
        </div>

        {/* ORDER STATUS AND ACTIONS */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle(status)}`}
          >
            {status}
          </span>

          <Link
            href={`/order/receipt/${order.id}`}
            className="rounded-lg border border-[#D8C8B5] bg-white px-3 py-2 text-xs font-semibold text-[#5A4030] transition hover:bg-[#FFF5E4]"
          >
            Receipt ↗
          </Link>

          {canCancel && (
            <button
              type="button"
              onClick={() => setCancellingOrder(order)}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    );
  })()}
</div>

                  {/* PURCHASED ITEMS */}
                  <div className="divide-y divide-[#F0E8DD] px-4 sm:px-5">
                    {order.items.map((item) => {
                      const isBundle = item.purchase_type === 'bundle';
                      const isWorkshop = item.purchase_type === 'workshop';
                      const needsReview = isToReview(item);
                      const isReviewing = reviewing === item.id;

                      return (
                        <div
                          key={item.id}
                          id={`item-${item.id}`}
                          className="scroll-mt-24 py-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-[#3D3028]">
                                  {item.name}
                                </p>

                                {isBundle && (
                                  <span className="rounded-full bg-[#F3E5CD] px-2 py-0.5 text-[9px] font-bold text-[#80500D]">
                                    Craft + Workshop Bundle
                                  </span>
                                )}

                                {isWorkshop && (
                                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                                    Workshop
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-[#8A7D71]">
                                Quantity: {item.qty}
                                {item.selected_variant
                                  ? ` · ${item.selected_variant}`
                                  : ''}
                              </p>

                              {item.ticket_code && (
                                <p className="mt-2 inline-flex rounded-lg border border-[#E8DCCB] bg-[#FFF9EF] px-2.5 py-1 font-mono text-[10px] font-bold text-[#80500D]">
                                  🎟️ {item.ticket_code}
                                </p>
                              )}

                              {item.attendee_name && (
                                <p className="mt-1 text-xs text-[#71675F]">
                                  Attendee: {item.attendee_name}
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-[#8B0000]">
                                {peso(item.price * item.qty)}
                              </p>
                              {item.qty > 1 && (
                                <p className="mt-1 text-[10px] text-[#8A7D71]">
                                  {item.qty} × {peso(item.price)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* ITEM ACTIONS */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {item.status === 'shipped' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => receive(item.id)}
                                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                              >
                                {busy ? 'Please wait...' : '✓ Confirm Received'}
                              </button>
                            )}

                            {needsReview && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewing(item.id);
                                  setRating(5);
                                  setComment('');
                                }}
                                className="rounded-lg bg-[#8B0000] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#6F0000]"
                              >
                                ★ Leave a Review
                              </button>
                            )}

                            {item.rating != null && (
                              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                                {'★'.repeat(item.rating)}
                                {'☆'.repeat(5 - item.rating)}
                                {' '}Reviewed
                              </span>
                            )}

                            <span className="text-[10px] text-[#8A7D71]">
                              {item.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* REVIEW FORM */}
                          {isReviewing && (
                            <div className="mt-4 rounded-xl border border-[#D6B56D] bg-[#FFFBF3] p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-bold text-[#3D3028]">
                                    Review this item
                                  </h4>
                                  <p className="mt-1 text-xs text-[#71675F]">
                                    Share your experience with {item.name}.
                                  </p>
                                </div>

                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                                  ORDER #{order.id}
                                </span>
                              </div>

                              <p className="mb-2 mt-4 text-xs font-semibold text-[#5A4030]">
                                Your rating
                              </p>

                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    aria-label={`Rate ${star} stars`}
                                    onClick={() => setRating(star)}
                                    className={`text-3xl transition hover:scale-110 ${
                                      star <= rating
                                        ? 'text-[#D6A23E]'
                                        : 'text-[#D9D0C5]'
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>

                              <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={4}
                                placeholder="Tell us what you liked about this craft or your experience with the artisan..."
                                className="mt-4 w-full resize-y rounded-xl border border-[#E8DCCB] bg-white p-3 text-sm text-[#3D3028] outline-none placeholder:text-[#A69B90] focus:border-[#B78B45] focus:ring-2 focus:ring-[#D6B56D]/20"
                              />

                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setReviewing(null)}
                                  className="rounded-lg border border-[#D8C8B5] bg-white px-4 py-2 text-xs font-semibold text-[#5A4030] hover:bg-[#F8F0E5]"
                                >
                                  Cancel
                                </button>

                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => submitReview(item.id)}
                                  className="rounded-lg bg-[#8B0000] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#6F0000] disabled:opacity-50"
                                >
                                  {busy ? 'Submitting...' : 'Submit Review →'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* WORKSHOP SESSION */}
                          {item.selected_session && (
                            <div className="mt-3 rounded-xl border border-[#E8DCCB] bg-[#FFF9EF] p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-[#80500D]">
                                Scheduled Workshop Session
                              </p>

                              <p className="mt-1 text-xs font-semibold text-[#3D3028]">
                                📅 {item.selected_session.date}
                              </p>

                              <p className="mt-1 text-xs text-[#71675F]">
                                🕒 {item.selected_session.time_start} –{' '}
                                {item.selected_session.time_end}
                              </p>

                              {item.selected_session.location && (
                                <p className="mt-1 text-xs text-[#71675F]">
                                  📍 {item.selected_session.location}
                                </p>
                              )}

                              <Link
                                href={`/order/success/${order.id}#venue-guide`}
                                className="mt-3 inline-flex text-[11px] font-bold text-[#8B0000] hover:underline"
                              >
                                Open Venue & GPS Guide →
                              </Link>
                            </div>
                          )}

                          {/* TRACKING */}
                          {item.tracking && (
                            <TrackingCard
                              tracking={item.tracking}
                              courier={item.courier ?? 'J&T Express'}
                              status={
                                item.status === 'received'
                                  ? 'delivered'
                                  : 'in_transit'
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ORDER FOOTER */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DCCB] bg-[#FFFDFA] px-4 py-4 sm:px-5">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[#8A7D71]">
                        Total Order Amount
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-[#8B0000]">
                        {peso(order.total)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpanded(order.id)}
                      className="rounded-lg border border-[#D6B56D] bg-white px-4 py-2.5 text-xs font-bold text-[#80500D] transition hover:bg-[#FFF5E4]"
                    >
                      {expanded ? 'Hide Order Details ↑' : 'Order Details ↓'}
                    </button>
                  </div>

                  {/* EXPANDED DETAILS */}
                  {expanded && (
                    <div className="border-t border-[#E8DCCB] bg-[#FAF7F1] p-4 sm:p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[#5A4030]">
                        Order Information
                      </h4>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-[#E8DCCB] bg-white p-3">
                          <p className="text-[10px] text-[#8A7D71]">Order Number</p>
                          <p className="mt-1 text-sm font-bold text-[#3D3028]">
                            #{order.id}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#E8DCCB] bg-white p-3">
                          <p className="text-[10px] text-[#8A7D71]">Payment Method</p>
                          <p className="mt-1 text-sm font-bold text-[#3D3028]">
                            {order.method === 'gcash' ? 'GCash' : 'Cash on Delivery'}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#E8DCCB] bg-white p-3">
                          <p className="text-[10px] text-[#8A7D71]">Date Ordered</p>
                          <p className="mt-1 text-sm font-bold text-[#3D3028]">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#E8DCCB] bg-white p-3">
                          <p className="text-[10px] text-[#8A7D71]">Number of Items</p>
                          <p className="mt-1 text-sm font-bold text-[#3D3028]">
                            {order.items.length}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/order/receipt/${order.id}`}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#8B0000] hover:underline"
                      >
                        View Printable Receipt & Ticket →
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#D8C8B5] bg-white px-5 py-14 text-center">
            <div className="text-5xl">🧺</div>
            <h3 className="mt-4 font-serif text-xl font-bold text-[#3D3028]">
              No orders found
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[#8A7D71]">
              {search || filter !== 'all'
                ? 'We could not find any orders matching your search or selected filter.'
                : 'You have not placed any orders yet. Discover handmade crafts and cultural experiences from local Indigenous artisans.'}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {(search || filter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                  }}
                  className="rounded-lg border border-[#D8C8B5] px-4 py-2 text-xs font-semibold text-[#5A4030]"
                >
                  Clear Filters
                </button>
              )}

              <Link
                href="/customer/browse"
                className="rounded-lg bg-[#8B0000] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#6F0000]"
              >
                Browse Crafts →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* CANCELLATION MODAL */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#E8DCCB] bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl">
                ⚠️
              </span>

              <div>
                <h3 className="font-serif text-lg font-bold text-[#3D3028]">
                  Cancel Order #{cancellingOrder.id}?
                </h3>
                <p className="text-xs text-[#8A7D71]">
                  Please confirm your cancellation.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-[#71675F]">
              Are you sure you want to cancel this order? Any reserved stock or
              workshop seats may be released back to other buyers.
            </p>

            <div className="mt-5">
              <label
                htmlFor="cancel-reason"
                className="mb-2 block text-xs font-bold text-[#5A4030]"
              >
                Reason for cancellation
              </label>

              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-[#E8DCCB] bg-[#FFFDFA] p-3 text-xs outline-none focus:border-[#B78B45]"
              >
                {CANCELLATION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {cancelReason === 'Other reasons' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please describe your reason..."
                rows={3}
                className="mt-3 w-full rounded-lg border border-[#E8DCCB] p-3 text-xs outline-none focus:border-[#B78B45]"
              />
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-[#F0E8DD] pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => setCancellingOrder(null)}
                className="rounded-lg border border-[#D8C8B5] px-4 py-2.5 text-xs font-semibold text-[#5A4030] hover:bg-[#FAF7F1]"
              >
                Keep Order
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmCancel}
                className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {busy ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
