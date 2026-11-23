import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { listArtisanOrders } from '@/lib/db';
import { listShipmentsForArtisan } from '@/lib/shipments';
import ArtisanOrdersClient from './ArtisanOrdersClient';
import { ClipboardList, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArtisanOrdersPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/orders');
  await requireVerifiedArtisan(session.id);

  // Parallel: orders + shipments fetched together (LCP — ~100ms per round-trip
  // to Supabase, and these are independent).
  const [orders, shipmentRows] = await Promise.all([
    listArtisanOrders(session.id),
    listShipmentsForArtisan(session.id),
  ]);
  const trackings = new Map<number, string>();
  for (const sh of shipmentRows) {
    trackings.set(sh.order_item_id, sh.tracking_number);
  }
  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <Sparkles size={14} aria-hidden="true" />
              Your shop
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Orders &amp; fulfillment</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              Keep every creation moving from your workshop to the hands of the person who will treasure it.
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-ochre-200">
            <ClipboardList size={26} strokeWidth={1.7} aria-hidden="true" />
          </span>
        </div>
      </section>
      <ArtisanOrdersClient
        initial={orders.map((o) => ({
          item_id: o.id,
          order_id: o.order_id,
          product_name: o.product_name,
          quantity: o.quantity,
          variant: o.selected_variant,
          customer: o.customer_name ?? 'Customer',
          payment: o.order?.payment_method ?? 'cash_on_delivery',
          status: o.status,
          purchase_type: o.purchase_type,
          attendee_name: o.attendee_name ?? null,
          attendee_for: o.attendee_for ?? null,
          tracking_number: trackings.get(o.id) ?? o.tracking_number ?? null,
        }))}
      />
    </div>
  );
}
