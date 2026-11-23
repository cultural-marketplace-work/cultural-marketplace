
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAdminAnalytics } from '@/lib/analytics';
import BarList from '@/components/BarList';
import { ChartNoAxesCombined } from 'lucide-react';

export const dynamic = 'force-dynamic';

const peso = (v: number) =>
  `₱${v.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <h2 className="break-words font-serif text-base font-bold text-brand-900 sm:text-lg">
        {title}
      </h2>

      {hint && (
        <p className="mt-0.5 text-xs text-stone-400">{hint}</p>
      )}

      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

export default async function AdminAnalyticsPage() {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    redirect('/auth/login?next=/admin/analytics');
  }

  const a = await getAdminAnalytics();

  // Generate Monday-based weeks to match PostgreSQL date_trunc('week').
  function fillWeeks(rows: Array<{ week: string }>): string[] {
    const now = new Date();

    const currentMonday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

    const day = currentMonday.getUTCDay();
    const daysSinceMonday = (day + 6) % 7;

    currentMonday.setUTCDate(
      currentMonday.getUTCDate() - daysSinceMonday
    );

    const out: string[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentMonday);

      d.setUTCDate(currentMonday.getUTCDate() - i * 7);

      out.push(d.toISOString().slice(0, 10));
    }

    return Array.from(
      new Set([...rows.map((r) => r.week.slice(0, 10)), ...out])
    ).sort();
  }

  const weeks = fillWeeks(a.signupTrend);

  const signupByWeek = new Map(
    a.signupTrend.map((r) => [r.week.slice(0, 10), r])
  );

  const revenueByWeek = new Map(
    a.revenueTrend.map((r) => [
      r.week.slice(0, 10),
      r.revenue,
    ])
  );

  const signupMax = Math.max(
    ...weeks.map((week) =>
      Math.max(
        signupByWeek.get(week)?.customers ?? 0,
        signupByWeek.get(week)?.artisans ?? 0
      )
    ),
    1
  );

  const kpis = [
    {
      label: 'Customers',
      value: a.totalCustomers.toLocaleString(),
    },
    {
      label: 'Artisans',
      value: a.totalArtisans.toLocaleString(),
    },
    {
      label: 'Orders',
      value: a.totalOrders.toLocaleString(),
    },
    {
      label: 'Revenue',
      value: peso(a.totalRevenue),
    },
    {
      label: 'Avg order value',
      value: peso(a.avgOrderValue),
    },
    {
      label: 'Artisan : customer',
      value:
        a.totalCustomers > 0
          ? `1 : ${(
              a.totalCustomers /
              Math.max(a.totalArtisans, 1)
            ).toFixed(1)}`
          : '—',
    },
  ];

  return (
  <main className="mx-auto min-w-0 w-full max-w-6xl font-sans">
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
            <ChartNoAxesCombined size={15} aria-hidden="true" />
            Marketplace insights
          </p>

          <h1 className="mt-3 break-words font-serif text-3xl font-bold leading-tight sm:text-4xl">
            Analytics &amp; demographics
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
            Understand marketplace activity, customer demographics, artisan
            growth, product performance, and sales trends.
          </p>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
          12-week platform insights
        </div>
      </div>
    </header>

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="card min-w-0 p-3 sm:p-5">
            <p className="break-words text-xs text-stone-500 sm:text-sm">{k.label}</p>

            <p className="mt-1 break-words text-xl font-bold leading-tight text-brand-700 sm:text-3xl">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Trends */}
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
        <Section
          title="Signups — last 12 weeks"
          hint="New customers vs new artisans per week"
        >
          <div className="space-y-1">
            {weeks.map((w) => {
              const r = signupByWeek.get(w);
              const customers = r?.customers ?? 0;
              const artisans = r?.artisans ?? 0;

              return (
                <div
                  key={w}
                  className="flex min-w-0 items-center gap-2 text-xs"
                >
                  <span className="w-12 shrink-0 text-stone-400 sm:w-16">
                    {w.slice(5)}
                  </span>

                  <div className="flex h-4 flex-1 gap-px">
                    <div
                      className="h-full rounded-l bg-crimson-600"
                      style={{
                        width: `${(customers / signupMax) * 100}%`,
                      }}
                      title={`${customers} customers`}
                    />

                    <div
                      className="h-full rounded-r bg-ochre-500"
                      style={{
                        width: `${(artisans / signupMax) * 100}%`,
                      }}
                      title={`${artisans} artisans`}
                    />
                  </div>

                  <span className="w-10 shrink-0 text-right text-[11px] text-stone-500 sm:w-12 sm:text-xs">
                    {customers + artisans > 0
                      ? `${customers}/${artisans}`
                      : ''}
                  </span>
                </div>
              );
            })}

            <p className="pt-1 text-xs text-stone-400">
              <span className="font-semibold text-crimson-600">■</span>
              {' '}customers ·{' '}
              <span className="font-semibold text-ochre-600">■</span>
              {' '}artisans
            </p>
          </div>
        </Section>

        <Section
          title="Revenue — last 12 weeks"
          hint="Gross revenue from non-cancelled orders"
        >
          <BarList
            items={weeks.map((w) => ({
              label: w.slice(5),
              value: revenueByWeek.get(w) ?? 0,
            }))}
            formatValue={peso}
            emptyText="No revenue recorded yet."
          />
        </Section>
      </div>

      {/* Demographics */}
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
        <Section
          title="Where artisans are"
          hint="Top locations — plan outreach and pickup routes"
        >
          <BarList
            items={a.artisanLocations.map((r) => ({
              label: r.location,
              value: r.count,
            }))}
            formatValue={(v) => `${v}`}
          />
        </Section>

        <Section
          title="Where customers are"
          hint="Customer-declared locations — where demand sits"
        >
          <BarList
            items={a.customerLocations.map((r) => ({
              label: r.location,
              value: r.count,
            }))}
            formatValue={(v) => `${v}`}
          />
        </Section>
      </div>

      {/* Supply vs demand */}
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2">
        <Section
          title="Category mix — listings"
          hint="What artisans offer"
        >
          <BarList
            items={a.categoryListings.map((r) => ({
              label: r.category,
              value: r.count,
            }))}
            formatValue={(v) => `${v}`}
          />
        </Section>

        <Section
          title="Category mix — actual sales"
          hint="Revenue and units sold by category"
        >
          <BarList
            items={a.categoryRevenue.map((r) => ({
              label: r.category,
              value: r.revenue,
              sub: `· ${r.units} sold`,
            }))}
            formatValue={peso}
          />
        </Section>
      </div>

      {/* Operations */}
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-3">
        <Section
          title="Payment methods"
          hint="How customers pay"
        >
          <BarList
            items={a.paymentSplit.map((r) => ({
              label: r.method.replace(/_/g, ' '),
              value: r.count,
            }))}
            formatValue={(v) => `${v}`}
          />
        </Section>

        <Section
          title="Order statuses"
          hint="Lifecycle funnel — spot stuck stages"
        >
          <BarList
            items={a.orderStatusCounts.map((r) => ({
              label: r.status.replace(/_/g, ' '),
              value: r.count,
            }))}
            formatValue={(v) => `${v}`}
          />
        </Section>

        <Section
          title="Ratings"
          hint="Review stars across all order items"
        >
          {a.ratingDistribution.length === 0 ? (
            <p className="text-sm text-stone-400">
              No reviews yet.
            </p>
          ) : (
            <BarList
              items={[5, 4, 3, 2, 1].map((stars) => ({
                label:
                  '★'.repeat(stars) +
                  '☆'.repeat(5 - stars),
                value:
                  a.ratingDistribution.find(
                    (r) => r.stars === stars
                  )?.count ?? 0,
              }))}
              formatValue={(v) => `${v}`}
            />
          )}
        </Section>
      </div>

      {/* Top products */}
      <div className="mt-6">
        <Section
          title="Top products — last 90 days"
          hint="Your best sellers by revenue"
        >
          {a.topProducts.length === 0 ? (
            <p className="text-sm text-stone-400">
              No sales in the last 90 days.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {a.topProducts.map((p, i) => (
                <div
                  key={p.id}
                  className="flex min-w-0 flex-col gap-1.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {i + 1}
                    </span>

                    <span className="truncate text-stone-700">
                      {p.name}
                    </span>
                  </span>

                  <span className="pl-8 text-xs text-stone-500 sm:shrink-0 sm:pl-0 sm:text-sm">
                    {p.units} sold ·{' '}
                    <b className="text-brand-700">
                      {peso(p.revenue)}
                    </b>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
