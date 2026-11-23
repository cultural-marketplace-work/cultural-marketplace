import { listAllShipments } from '@/lib/shipments';
import AdminShipmentsClient from './AdminShipmentsClient';
import { Truck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminShipmentsPage() {
  const shipments = await listAllShipments();

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
              <Truck size={15} aria-hidden="true" />
              Order fulfillment
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Shipments
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Track outgoing orders, monitor delivery progress, and manage
              shipment records across the marketplace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
              {shipments.length} {shipments.length === 1 ? 'shipment' : 'shipments'}
            </div>

            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white px-4 py-3 text-sm font-semibold text-[#7f2422] transition hover:bg-ochre-100"
              href="/api/admin/shipments/export"
              download
            >
              <span aria-hidden="true">↓</span>
              Export CSV
            </a>
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <AdminShipmentsClient
          initial={shipments.map((s) => ({
            id: s.id,
            order_id: s.order_id,
            tracking: s.tracking_number,
            status: s.status,
            artisan: s.sender_name,
            recipient: s.recipient_name,
            items: s.items_summary,
            weight: s.weight_kg,
            declared: s.declared_value,
            created_at: s.created_at,
          }))}
        />
      </div>
    </main>
  );
}