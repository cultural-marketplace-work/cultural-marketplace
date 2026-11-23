import { listReports } from '@/lib/db';
import ReportsClient from './ReportsClient';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const reports = await listReports();

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
              <ShieldAlert size={15} aria-hidden="true" />
              Reports &amp; platform safety
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Reports &amp; Moderation
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Review submitted reports, investigate reported content, and
              monitor moderation actions across the marketplace.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <ReportsClient
          initial={reports.map((r) => ({
            id: r.id,
            reporter: r.reporter_name ?? 'Unknown',
            type: r.reported_type,
            reported_id: r.reported_id,
            reported_name: r.reported_name ?? `#${r.reported_id}`,
            reason: r.reason,
            status: r.status,
            action_taken: r.action_taken,
            created: new Date(r.created_at).toLocaleString(),
          }))}
        />
      </div>
    </main>
  );
}