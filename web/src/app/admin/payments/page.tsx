import { listAllOrders, getOrderItemsForOrders } from '@/lib/db';
import PaymentsClient from './PaymentsClient';
import { WalletCards } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const all = await listAllOrders();
  const pending = all.filter((o) => o.status === 'awaiting_payment');

  // ONE batched items query (N+1 fix).
  const itemsByOrder = await getOrderItemsForOrders(pending.map((o) => o.id));

  const rows = pending.map((o) => ({
    id: o.id,
    total: Number(o.total_amount),
    reference: o.payment_reference,
    created: new Date(o.created_at).toLocaleString(),
    items: (itemsByOrder.get(o.id) ?? []).map(
      (i) => `${i.product_name} ×${i.quantity}`,
    ),
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
              <WalletCards size={15} aria-hidden="true" />
              Financial transactions
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Payment Verification
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Review pending payments, verify transaction references, and
              monitor payment confirmation records.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {rows.length} {rows.length === 1 ? 'pending payment' : 'pending payments'}
          </div>
        </div>
      </header>

      <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-600">
        Simulated GCash payments are auto-confirmed in mock mode; PayMongo
        webhook verifications land here when <code>PAYMENTS_MODE=paymongo</code>.
      </p>

      <div className="min-w-0">
        <PaymentsClient initial={rows} />
      </div>
    </main>
  );
}