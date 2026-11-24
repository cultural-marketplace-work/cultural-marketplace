import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { requireVerifiedArtisan } from '@/lib/artisanAuth';
import { listArtisanProducts } from '@/lib/db';
import { ArrowUpRight, BookOpen, CalendarDays, Clock3, MapPin, Sparkles, Ticket } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArtisanCalendarPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/experiences/calendar');
  await requireVerifiedArtisan(session.id);

  const products = await listArtisanProducts(session.id);
  const sessions = products
    .filter((p) => p.has_tutorial && p.tutorial_dates?.length)
    .flatMap((p) => p.tutorial_dates!.map((d) => ({ product: p.name, productId: p.id, ...d })))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="mx-auto max-w-7xl space-y-5">
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
              Plan your teaching days
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Workshop calendar</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
              See your scheduled sessions in order and prepare to welcome learners into your craft.
            </p>
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-ochre-200">
            <CalendarDays size={26} strokeWidth={1.7} aria-hidden="true" />
          </span>
        </div>
      </section>

      <nav aria-label="Workshop management" className="flex flex-wrap gap-2 rounded-2xl border border-abaca-200/80 bg-white/90 p-2 shadow-sm">
        <Link
          href="/artisan/experiences"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-stone-600 transition hover:bg-canvas hover:text-brand-900"
        >
          <BookOpen size={15} aria-hidden="true" />
          Workshops list
        </Link>
        <Link
          href="/artisan/experiences/calendar"
          aria-current="page"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-700 px-3.5 text-xs font-bold text-white shadow-sm"
        >
          <CalendarDays size={15} aria-hidden="true" />
          Session calendar
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">{sessions.length}</span>
        </Link>
        <Link
          href="/artisan/bookings"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold text-stone-600 transition hover:bg-canvas hover:text-brand-900"
        >
          <Ticket size={15} aria-hidden="true" />
          Bookings &amp; attendance
        </Link>
      </nav>

      <section aria-label="Scheduled sessions" className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-abaca-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">All scheduled sessions</h2>
            <p className="mt-1 text-xs text-stone-500">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} · Ordered by date
            </p>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="divide-y divide-abaca-100">
            {sessions.map((session, index) => {
              const date = new Date(`${session.date}T12:00:00`);
              const validDate = !Number.isNaN(date.getTime());
              return (
                <article key={`${session.productId}-${session.date}-${session.time_start}-${index}`} className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-canvas/60 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-center sm:gap-0">
                    <span className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm sm:h-16 sm:w-16">
                      <span className="font-serif text-xl font-bold leading-none">
                        {validDate ? date.toLocaleDateString('en', { day: '2-digit' }) : session.date.slice(-2)}
                      </span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ochre-200">
                        {validDate ? date.toLocaleDateString('en', { month: 'short' }) : ''}
                      </span>
                    </span>
                    <span className="text-xs font-medium text-stone-500 sm:mt-2">
                      {validDate ? date.toLocaleDateString('en', { weekday: 'long', year: 'numeric' }) : 'Scheduled date'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-brand-900">{session.product}</h3>
                      <span className="badge border border-abaca-200 bg-canvas text-stone-600">Workshop</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={15} aria-hidden="true" className="text-ochre-800" />
                        {session.time_start}–{session.time_end}
                      </span>
                      {session.location && (
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <MapPin size={15} aria-hidden="true" className="shrink-0 text-ochre-800" />
                          <span className="truncate">{session.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {session.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline min-h-10 px-3 text-xs"
                      >
                        <MapPin size={14} aria-hidden="true" />
                        Map
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </a>
                    )}
                    <Link href={`/artisan/products/${session.productId}/edit`} className="btn-outline min-h-10 px-3 text-xs">
                      Edit schedule
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <CalendarDays size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-900">No sessions on your calendar yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Add dates to your workshops and they’ll appear here in chronological order.
            </p>
            <Link href="/artisan/experiences" className="btn-primary mt-5 min-h-10">
              Go to workshops <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
