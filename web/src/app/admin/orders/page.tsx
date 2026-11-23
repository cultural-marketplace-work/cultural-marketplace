import { listAllOrdersWithItems } from '@/lib/db';
import OrdersClient from './OrdersClient';
import { ShoppingBag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const withItems = await listAllOrdersWithItems();

  const rows = withItems.map(({ order: o, items, customer_name }) => ({
    id: o.id,
    customer_id: o.customer_id,
    customer_name: customer_name ?? 'Unknown Customer',
    total: Number(o.total_amount),
    status: o.status,
    method: o.payment_method,
    created: new Date(o.created_at).toLocaleString(),
    items: items.map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
    })),
  }));

  return (
    <main className="mx-auto min-w-0 w-full max-w-6xl space-y-5 font-sans">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{
            backgroundImage: "url('/images/kalinga-weave.svg')",
            backgroundSize: '240px',
          }}
        />

        <div
          aria-hidden="true"
          className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <ShoppingBag size={15} aria-hidden="true" />
              Marketplace transactions
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Order Management
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Monitor customer orders, review purchased products, and track
              transaction records across the marketplace.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {rows.length} {rows.length === 1 ? 'order' : 'orders'}
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <OrdersClient initial={rows} />
      </div>
    </main>
  );
}