
'use client';

import { useMemo, useState } from 'react';
import {
  ShoppingBag,
  CheckCircle2,
  Clock3,
  XCircle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

interface Order {
  id: number;
  customer_id: number;
  customer_name: string;
  total: number;
  status: string;
  method: string;
  created: string;
  items: { name: string; quantity: number }[];
}

const PAGE_SIZE = 8;

export default function OrdersClient({ initial }: { initial: Order[] }) {
  const [orders] = useState(initial);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);

  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string) => {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return date || '—';

    return parsed.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const stats = useMemo(() => ({
    total: orders.length,
    value: orders
      .filter((o) => o.status.toLowerCase() !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0),
    pending: orders.filter(
      (o) => o.status.toLowerCase() === 'pending'
    ).length,
    completed: orders.filter((o) =>
      ['completed', 'delivered', 'received'].includes(
        o.status.toLowerCase()
      )
    ).length,
  }), [orders]);

  const statuses = useMemo(
    () => [...new Set(orders.map((o) => o.status))].sort(),
    [orders]
  );

  const paymentMethods = useMemo(
    () => [...new Set(
      orders.map((o) => o.method).filter(Boolean)
    )].sort(),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        String(order.id).includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.items.some((item) =>
          item.name.toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === 'all' ||
        order.status === statusFilter;

      const matchesPayment =
        paymentFilter === 'all' ||
        order.method?.toLowerCase() === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function statusStyle(status: string) {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';

      case 'processing':
        return 'bg-blue-50 text-blue-800 border-blue-200';

      case 'shipped':
        return 'bg-violet-50 text-violet-800 border-violet-200';

      case 'delivered':
      case 'completed':
      case 'received':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';

      case 'cancelled':
        return 'bg-red-50 text-red-800 border-red-200';

      default:
        return 'bg-[#F5F2ED] text-[#71675F] border-[#D6D0C9]';
    }
  }

  function paymentLabel(method: string) {
    switch (method?.toLowerCase()) {
      case 'gcash':
        return 'GCash';

      case 'cod':
        return 'Cash on Delivery';

      default:
        return method || 'Not specified';
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setPage(1);
  }

  function exportOrders() {
    const headers = [
      'Order ID',
      'Customer',
      'Products',
      'Total',
      'Payment Method',
      'Status',
      'Date',
    ];

    const rows = filteredOrders.map((order) => [
      order.id,
      order.customer_name,
      order.items.map(
        (item) => `${item.name} x${item.quantity}`
      ).join('; '),
      order.total,
      paymentLabel(order.method),
      order.status,
      formatDate(order.created),
    ]);

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'cultural-marketplace-orders.csv';
    link.click();

    URL.revokeObjectURL(url);
  }

  const summaryCards = [
    {
      label: 'Total Orders',
      value: stats.total.toLocaleString(),
      icon: ShoppingBag,
      style: 'bg-[#F8EDE4] text-[#8B0000]',
      accent: 'border-l-[#8B0000]',
    },
    {
      label: 'Order Value',
      value: formatCurrency(stats.value),
      icon: CheckCircle2,
      style: 'bg-emerald-50 text-emerald-700',
      accent: 'border-l-emerald-600',
    },
    {
      label: 'Pending Orders',
      value: stats.pending.toLocaleString(),
      icon: Clock3,
      style: 'bg-amber-50 text-amber-700',
      accent: 'border-l-amber-500',
    },
    {
      label: 'Completed Orders',
      value: stats.completed.toLocaleString(),
      icon: CheckCircle2,
      style: 'bg-green-50 text-green-700',
      accent: 'border-l-green-600',
    },
  ];

  return (
    <div className="mt-6 min-w-0 space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={`rounded-xl border border-[#E8DCCB] border-l-4 ${card.accent} bg-white p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#71675F]">
                    {card.label}
                  </p>
                  <p className="mt-2 truncate text-xl font-bold text-[#3D3028]">
                    {card.value}
                  </p>
                </div>

                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.style}`}>
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[#E8DCCB] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">

          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-[#71675F]">
              Search Orders
            </label>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94877C]"
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search order ID, customer, or product..."
                className="w-full rounded-lg border border-[#D6D0C9] bg-[#FCF9F4] py-2.5 pl-10 pr-3 text-sm text-[#3D3028] outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:w-[340px]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#71675F]">
                Order Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#D6D0C9] bg-[#FCF9F4] px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="all">All Statuses</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#71675F]">
                Payment Method
              </label>

              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-[#D6D0C9] bg-[#FCF9F4] px-3 py-2.5 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="all">All Methods</option>

                {paymentMethods.map((method) => (
                  <option
                    key={method}
                    value={method.toLowerCase()}
                  >
                    {paymentLabel(method)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#D6D0C9] px-3 py-2.5 text-xs font-semibold text-[#71675F] transition hover:bg-[#F8F3EB]"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              type="button"
              onClick={exportOrders}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#780D0D] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#5E0909]"
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8DCCB] pt-3">
          <p className="text-xs text-[#71675F]">
            Showing <span className="font-semibold text-[#3D3028]">{filteredOrders.length}</span> matching orders
          </p>

          {(search || statusFilter !== 'all' || paymentFilter !== 'all') && (
            <span className="rounded-full bg-[#F8EDE4] px-3 py-1 text-[10px] font-semibold text-[#8B0000]">
              Filters applied
            </span>
          )}
        </div>
      </div>

      {/* Unified orders table */}
      <div className="overflow-hidden rounded-xl border border-[#E8DCCB] bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DCCB] bg-[#FCF9F4] px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-[#3D3028]">
              All Orders
            </h2>
            <p className="mt-0.5 text-[11px] text-[#94877C]">
              Customer transactions and purchased products
            </p>
          </div>

          <span className="rounded-full bg-[#F1E4D8] px-3 py-1 text-xs font-semibold text-[#780D0D]">
            {filteredOrders.length} Orders
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">

            <thead>
              <tr className="border-b border-[#E8DCCB] bg-[#F8F1E9] text-[11px] font-bold uppercase tracking-wide text-[#71675F]">
                <th className="px-4 py-4">Order #</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Items</th>
                <th className="px-4 py-4 text-right">Total</th>
                <th className="px-4 py-4">Payment Method</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EEE6DC]">
              {paginatedOrders.map((order) => (
                <tr
                  key={order.id}
                  className="transition hover:bg-[#FFFCF8]"
                >
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="text-sm font-bold text-[#780D0D]">
                      #{order.id}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex min-w-[165px] items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1E4D8] text-xs font-bold uppercase text-[#780D0D]">
                        {order.customer_name?.charAt(0) || '?'}
                      </span>

                      <span className="max-w-[160px] truncate text-sm font-semibold text-[#3D3028]">
                        {order.customer_name}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="min-w-[210px] space-y-1">
                      {order.items.slice(0, 2).map((item, index) => (
                        <p
                          key={`${order.id}-${index}`}
                          className="text-xs text-[#3D3028]"
                        >
                          <span className="font-medium">
                            {item.name}
                          </span>
                          <span className="ml-1 text-[#94877C]">
                            × {item.quantity}
                          </span>
                        </p>
                      ))}

                      {order.items.length > 2 && (
                        <p className="text-[10px] font-semibold text-[#8B0000]">
                          +{order.items.length - 2} more items
                        </p>
                      )}

                      {order.items.length === 0 && (
                        <span className="text-xs text-[#94877C]">
                          No items
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <span className="text-sm font-bold text-[#3D3028]">
                      {formatCurrency(order.total)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="text-xs font-medium text-[#51463D]">
                      {paymentLabel(order.method)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyle(order.status)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-xs text-[#71675F]">
                    {formatDate(order.created)}
                  </td>
                </tr>
              ))}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F8F1E9] text-[#8B0000]">
                        <XCircle size={23} />
                      </div>

                      <p className="mt-3 text-sm font-bold text-[#3D3028]">
                        No orders found
                      </p>

                      <p className="mt-1 text-xs text-[#94877C]">
                        Try adjusting your search or filters.
                      </p>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 text-xs font-semibold text-[#8B0000] hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-[#E8DCCB] bg-[#FCF9F4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#71675F]">
            Showing{' '}
            <span className="font-semibold text-[#3D3028]">
              {filteredOrders.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –
              {Math.min(currentPage * PAGE_SIZE, filteredOrders.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-[#3D3028]">
              {filteredOrders.length}
            </span>{' '}
            orders
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6D0C9] text-[#71675F] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((number) =>
                number === 1 ||
                number === totalPages ||
                Math.abs(number - currentPage) <= 1
              )
              .map((number, index, visiblePages) => (
                <span key={number} className="flex items-center gap-1">
                  {index > 0 && number - visiblePages[index - 1] > 1 && (
                    <span className="px-1 text-xs text-[#94877C]">
                      ...
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setPage(number)}
                    className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                      currentPage === number
                        ? 'bg-[#780D0D] text-white'
                        : 'border border-[#D6D0C9] text-[#71675F] hover:bg-white'
                    }`}
                  >
                    {number}
                  </button>
                </span>
              ))}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6D0C9] text-[#71675F] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
