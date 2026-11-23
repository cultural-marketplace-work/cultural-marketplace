import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { sql, usingPg } from '@/lib/dbPg';
import ModerationClient from './ModerationClient';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    redirect('/auth/login?next=/admin/moderation');
  }

  let items: Array<{
    id: number;
    name: string;
    image_path: string | null;
    artisan: string;
    flagged_reason: string;
  }> = [];

  if (usingPg) {
    const rows = await sql`
      select p.id, p.name, p.image_path, a.name as artisan
      from products p join artisans a on a.id = p.artisan_id
      where p.status = 'pending_review'
      order by p.created_at desc`;

    items = (
      rows as unknown as Array<{
        id: number;
        name: string;
        image_path: string | null;
        artisan: string;
      }>
    ).map((r) => ({
      ...r,
      flagged_reason:
        'Uploaded image was flagged for manual review (borderline classification or automatic check unavailable).',
    }));
  }

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
              <ShieldCheck size={15} aria-hidden="true" />
              Content review
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Moderation Queue
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Review flagged product submissions and check artisan uploads
              before they become visible in the marketplace.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {items.length} {items.length === 1 ? 'item' : 'items'} awaiting review
          </div>
        </div>
      </header>

      <div className="min-w-0">
        <ModerationClient initial={items} />
      </div>
    </main>
  );
}