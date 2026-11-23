
import { listActivityLogs } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SearchParams = {
  period?: string;
  value?: string;
};

function getManilaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

function getDateRange(period: string, value: string) {
  let start = '';
  let end = '';

  if (period === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    start = `${value}T00:00:00+08:00`;

    const next = new Date(`${value}T00:00:00+08:00`);
    next.setDate(next.getDate() + 1);

    end = next.toISOString();
  } else if (period === 'month' && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);

    if (month < 1 || month > 12) return null;

    start = `${value}-01T00:00:00+08:00`;

    const next = new Date(
      new Date(start).getTime()
    );
    next.setUTCMonth(next.getUTCMonth() + 1);

    end = next.toISOString();
  } else if (period === 'year' && /^\d{4}$/.test(value)) {
    const year = Number(value);

    if (year < 2000 || year > 2100) return null;

    start = `${value}-01-01T00:00:00+08:00`;
    end = `${year + 1}-01-01T00:00:00+08:00`;
  } else {
    return null;
  }

  const from = new Date(start).toISOString();

  return {
    from,
    to: end,
  };
}

function roleStyle(role: string) {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'bg-yellow-100 text-yellow-800 ring-yellow-300';

    case 'artisan':
      return 'bg-neutral-900 text-white ring-neutral-700';

    case 'customer':
    case 'buyer':
      return 'bg-red-100 text-red-800 ring-red-300';

    default:
      return 'bg-stone-100 text-stone-600 ring-stone-200';
  }
}

function formatDate(date: string | Date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return 'Unknown date';

  return parsed.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'long',
  });
}

function formatTime(date: string | Date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return '--';

  return parsed.toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const period = params.period ?? 'day';
  const value = params.value ?? getManilaDate();

  const range = getDateRange(period, value);

  // Invalid search parameters fall back to today's activity.
  const activePeriod = range ? period : 'day';
  const activeValue = range ? value : getManilaDate();

  const activeRange = range ?? getDateRange('day', getManilaDate())!;

  const logs = await listActivityLogs(200, activeRange);

  const periodLabel =
    activePeriod === 'month'
      ? new Date(`${activeValue}-01T00:00:00`).toLocaleDateString(
          'en-PH',
          { month: 'long', year: 'numeric' }
        )
      : activePeriod === 'year'
        ? activeValue
        : formatDate(`${activeValue}T00:00:00+08:00`);


  return (
    <main className="mx-auto min-w-0 w-full max-w-6xl space-y-5 font-sans">
      {/* PAGE HEADER */}
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12 8v4l3 2" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              System monitoring
            </p>

            <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Activity Logs
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Monitor and review activities recorded across the Cultural
              Marketplace platform.
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {logs.length} {logs.length === 1 ? 'activity record' : 'activity records'}
          </div>
        </div>
      </header>

      {/* DATE SEARCH AND FILTER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold text-brand-900">
            Activity history
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Browse records by date, month, or year.
          </p>
        </div>

        <details className="group relative z-20">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18M9 15h2" />
            </svg>

            Search by date

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-4 shadow-xl">
            <form action="/admin/activity" method="GET" className="space-y-3">
              <p className="text-sm font-semibold text-stone-800">
                Find activity records
              </p>

              <div>
                <label
                  htmlFor="period"
                  className="mb-1 block text-xs font-medium text-stone-600"
                >
                  Search by
                </label>

                <select
                  id="period"
                  name="period"
                  defaultValue={activePeriod}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="day">Specific date</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="value"
                  className="mb-1 block text-xs font-medium text-stone-600"
                >
                  Select period
                </label>

                <input
                  id="value"
                  name="value"
                  type={
                    activePeriod === 'month'
                      ? 'month'
                      : activePeriod === 'year'
                        ? 'number'
                        : 'date'
                  }
                  defaultValue={activeValue}
                  min={activePeriod === 'year' ? '2000' : undefined}
                  max={activePeriod === 'year' ? '2100' : undefined}
                  required
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>
                Search logs
              </button>
            </form>

            <a
              href="/admin/activity"
              className="mt-3 block text-center text-xs font-medium text-stone-500 hover:text-brand-700"
            >
              Back to today&apos;s activity
            </a>
          </div>
        </details>
      </div>

      {/* ACTIVITY LIST */}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-4 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-stone-800">
              {activePeriod === 'day'
                ? 'Daily activity'
                : activePeriod === 'month'
                  ? 'Monthly activity'
                  : 'Yearly activity'}
            </h2>

            <p className="mt-1 text-xs text-stone-500">
              {periodLabel}
            </p>
          </div>

          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {logs.length} records
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>

            <h3 className="mt-3 font-semibold text-stone-800">
              No activity found
            </h3>

            <p className="mt-1 text-sm text-stone-500">
              There are no recorded activities for {periodLabel}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {logs.map((log) => (
              <article
                key={log.id}
                className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-stone-50 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${roleStyle(log.user_role)}`}
                    >
                      {log.user_role || 'Unknown'}
                    </span>

                    <span className="break-words text-sm font-semibold text-stone-800">
                      {log.user_name || 'Unknown user'}
                    </span>
                  </div>

                  <p className="mt-1.5 break-words text-sm leading-relaxed text-stone-600">
                    {log.description || 'No description available.'}
                  </p>
                </div>

                <div className="shrink-0 pl-2 text-right">
                  <p className="text-sm font-semibold tabular-nums text-stone-700">
                    {formatTime(log.created_at)}
                  </p>

                  <p className="mt-1 text-[11px] text-stone-400">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {logs.length > 0 && (
          <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-3 text-center text-xs text-stone-500">
            Showing up to 200 records for the selected period.
          </div>
        )}
      </section>
    </main>
  );
}
