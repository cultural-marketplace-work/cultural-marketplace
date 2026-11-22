import { Suspense, cache } from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { adminStats, listActivityLogs } from '@/lib/db';
import {
  getOverviewKpis, getDailySeries, getTopProducts30d, getOrdersSnapshot, getAttentionCounts,
  getCategoryRevenue30d, getPaymentSplit30d,
} from '@/lib/dashboardOverview';
import MiniChart from '@/components/MiniChart';
import AxisChart from '@/components/charts/AxisChart';
import DonutChart from '@/components/charts/DonutChart';

export const dynamic = 'force-dynamic';

const peso = (v: number) => `₱${v.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const getStats = unstable_cache(async () => adminStats(), ['dash-admin-stats'], { revalidate: 30 });
const getLogs = unstable_cache(async () => listActivityLogs(8), ['dash-activity'], { revalidate: 15 });

// Per-request de-duplication so sections that share data don't fetch it twice.
const getSeries = cache(() => getDailySeries());
const getSnapshot = cache(() => getOrdersSnapshot());

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-stone-200/70 ${className}`} />;
}

// Every panel has its own coloured border. Class names are written out in full for Tailwind.
function Panel({
  title, subtitle, border, action, children,
}: { title: string; subtitle?: string; border: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 rounded-xl border-2 bg-white p-4 shadow-sm sm:p-5 ${border}`}>
  <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-bold text-brand-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4 min-w-0 max-w-full overflow-hidden">{children}</div>
    </div>
  );
}

function Insight({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">{children}</p>;
}

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return now > 0 ? <span className="text-xs font-medium text-emerald-600">new activity</span> : null;
  const pct = ((now - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% vs previous 7 days
    </span>
  );
}

const ICONS = {
  currency: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  trend: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941',
  bag: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z',
  userPlus: 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z',
} as const;

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const STATUS_COLORS = ['#f59e0b', '#0ea5e9', '#10b981', '#8b5cf6', '#f43f5e', '#78716c'];
const PAYMENT_COLORS = ['#14b8a6', '#6366f1', '#f97316', '#ec4899', '#84cc16', '#78716c'];

async function AttentionSection() {
  const a = await getAttentionCounts();
  const items = [
    { label: 'Artisan applications to review', count: a.pendingArtisans, href: '/admin/artisans?filter=pending' },
    { label: 'New cultural reports', count: a.pendingReports, href: '/admin/reports' },
    { label: 'Reports under investigation', count: a.investigatingReports, href: '/admin/reports' },
  ].filter((i) => i.count > 0);

  if (items.length === 0) {
    return <p className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Nothing needs your attention right now.</p>;
  }
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((i) => (
        <Link key={i.label} href={i.href} className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
          <b className="text-lg">{i.count}</b> {i.label} →
        </Link>
      ))}
    </div>
  );
}

async function KpiSection() {
  const [stats, k, series] = await Promise.all([getStats(), getOverviewKpis(), getSeries()]);

  const rev14 = series.map((d) => d.revenue);
  const ord14 = series.map((d) => d.orders);
  const sign14 = series.map((d) => d.customers + d.artisans);

  const cards: Array<{
    label: string; value: string | number; href: string; icon: string;
    border: string; iconWrap: string; chartColor: string;
    values: number[]; variant: 'line' | 'area' | 'bars'; caption: string; note?: React.ReactNode;
  }> = [
    { label: 'Revenue today', value: peso(k.revenueToday), href: '/admin/orders', icon: ICONS.currency,
      border: 'border-rose-300', iconWrap: 'bg-rose-50 text-rose-600', chartColor: 'text-rose-500',
      values: rev14, variant: 'bars', caption: 'Daily revenue · last 14 days' },
    { label: 'Revenue · 7 days', value: peso(k.revenue7d), href: '/admin/analytics', icon: ICONS.trend,
      border: 'border-emerald-300', iconWrap: 'bg-emerald-50 text-emerald-600', chartColor: 'text-emerald-500',
      values: rev14.slice(-7), variant: 'area', caption: 'Daily revenue · last 7 days',
      note: <Delta now={k.revenue7d} prev={k.revenuePrev7d} /> },
    { label: 'Orders · 7 days', value: k.orders7d, href: '/admin/orders', icon: ICONS.bag,
      border: 'border-amber-300', iconWrap: 'bg-amber-50 text-amber-600', chartColor: 'text-amber-500',
      values: ord14.slice(-7), variant: 'bars', caption: 'Orders per day · last 7 days',
      note: <Delta now={k.orders7d} prev={k.ordersPrev7d} /> },
    { label: 'New signups · 7 days', value: k.newCustomers7d + k.newArtisans7d, href: '/admin/analytics', icon: ICONS.userPlus,
      border: 'border-sky-300', iconWrap: 'bg-sky-50 text-sky-600', chartColor: 'text-sky-500',
      values: sign14, variant: 'line', caption: 'Signups per day · last 14 days',
      note: <span className="text-xs text-stone-400">{k.newCustomers7d} patrons · {k.newArtisans7d} artisans</span> },
    { label: 'Total revenue (paid)', value: peso(Number(stats.revenue)), href: '/admin/orders', icon: ICONS.currency,
      border: 'border-violet-300', iconWrap: 'bg-violet-50 text-violet-600', chartColor: 'text-violet-500',
      values: rev14, variant: 'area', caption: 'Recent trend · last 14 days' },
    { label: 'Total orders', value: stats.orders, href: '/admin/orders', icon: ICONS.bag,
      border: 'border-teal-300', iconWrap: 'bg-teal-50 text-teal-600', chartColor: 'text-teal-500',
      values: ord14, variant: 'line', caption: 'Recent trend · last 14 days' },
  ];

  const totals = [
    { label: 'Patrons', value: stats.customers, href: '/admin/customers' },
    { label: 'Artisans', value: stats.artisans, href: '/admin/artisans' },
    { label: 'Products', value: stats.products, href: '/admin/products' },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`block rounded-xl border-2 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${c.border}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-stone-500">{c.label}</p>
                <p className="mt-1 truncate text-2xl font-bold text-stone-800">{c.value}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${c.iconWrap}`}>
                <Icon path={c.icon} />
              </div>
            </div>
            <div className="mt-1 min-h-4">{c.note}</div>
            <MiniChart values={c.values} variant={c.variant} className={`mt-3 ${c.chartColor}`} />
            <p className="mt-1 text-[11px] text-stone-400">{c.caption}</p>
          </Link>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
        {totals.map((t) => (
          <Link key={t.label} href={t.href} className="hover:text-brand-700">
            {t.label}: <b className="text-stone-700">{t.value}</b>
          </Link>
        ))}
      </div>
    </>
  );
}

async function RevenueChartPanel() {
  const days = await getSeries();
  const labels = days.map((d) => dayLabel(d.day));
  const values = days.map((d) => d.revenue);
  const total = values.reduce((s, v) => s + v, 0);
  const peak = Math.max(...values, 0);
  const peakDay = peak > 0 ? labels[values.indexOf(peak)] : null;
  return (
    <Panel
      title="Revenue trend" subtitle="Gross revenue per day, last 14 days (cancelled orders excluded)" border="border-rose-300"
      action={<span className="text-sm font-semibold text-rose-600">{peso(total)}</span>}
    >
      <AxisChart
        labels={labels}
        series={[{ name: 'Revenue', values, color: '#f43f5e' }]}
        formatY={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : Math.round(v)}`}
        formatTip={peso}
        ariaLabel="Daily revenue, last 14 days"
      />
      {peakDay && <Insight>Total {peso(total)} · average {peso(total / Math.max(days.length, 1))} per day · best day was {peakDay} with {peso(peak)}.</Insight>}
    </Panel>
  );
}

async function OrdersPerDayPanel() {
  const days = await getSeries();
  const labels = days.map((d) => dayLabel(d.day));
  const values = days.map((d) => d.orders);
  const total = values.reduce((s, v) => s + v, 0);
  const last7 = values.slice(-7).reduce((s, v) => s + v, 0);
  const prev7 = values.slice(0, 7).reduce((s, v) => s + v, 0);
  return (
    <Panel title="Orders per day" subtitle="Number of orders placed each day, last 14 days" border="border-amber-300"
      action={<span className="text-sm font-semibold text-amber-600">{total} orders</span>}>
      <AxisChart labels={labels} series={[{ name: 'Orders', values, color: '#f59e0b' }]} variant="bars" ariaLabel="Orders per day, last 14 days" />
      {total > 0 && <Insight>{last7} orders in the last 7 days vs {prev7} in the 7 days before.</Insight>}
    </Panel>
  );
}

async function SignupsPanel() {
  const days = await getSeries();
  const labels = days.map((d) => dayLabel(d.day));
  const customers = days.map((d) => d.customers);
  const artisans = days.map((d) => d.artisans);
  const c = customers.reduce((s, v) => s + v, 0);
  const a = artisans.reduce((s, v) => s + v, 0);
  return (
    <Panel title="New signups" subtitle="Patrons vs artisans joining each day, last 14 days" border="border-sky-300"
      action={<span className="text-sm font-semibold text-sky-600">{c + a} joined</span>}>
      <AxisChart
        labels={labels}
        series={[
          { name: 'Patrons', values: customers, color: '#0ea5e9' },
          { name: 'Artisans', values: artisans, color: '#10b981' },
        ]}
        variant="bars" ariaLabel="Signups per day, patrons and artisans"
      />
      {c + a > 0 && <Insight>{c} new patrons and {a} new artisans in 14 days.</Insight>}
    </Panel>
  );
}

async function StatusPanel() {
  const { statuses } = await getSnapshot();
  const slices = statuses.map((s, i) => ({ label: s.status.replace(/_/g, ' '), value: s.count, color: STATUS_COLORS[i % STATUS_COLORS.length] }));
  const top = slices[0];
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <Panel title="Order status" subtitle="Where all orders currently stand" border="border-violet-300"
      action={<Link href="/admin/orders" className="text-xs text-brand-700 hover:underline">View all →</Link>}>
      <DonutChart slices={slices} centerLabel="orders" />
      {top && total > 0 && <Insight>Most orders are <b>{top.label}</b> ({((top.value / total) * 100).toFixed(0)}%).</Insight>}
    </Panel>
  );
}

async function CategoryPanel() {
  const cats = await getCategoryRevenue30d();
  const max = Math.max(...cats.map((c) => c.revenue), 1);
  const COLORS = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500'];
  return (
    <Panel title="Sales by category" subtitle="Revenue per craft category, last 30 days" border="border-emerald-300">
      {cats.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">No sales in the last 30 days.</p>
      ) : (
        <>
          <div className="space-y-3">
            {cats.map((c, i) => (
              <div key={c.category}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-stone-700">{c.category}</span>
                  <span className="shrink-0 text-stone-500"><b className="text-stone-700">{peso(c.revenue)}</b> · {c.units} sold</span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full rounded-full ${COLORS[i % COLORS.length]}`} style={{ width: `${Math.max((c.revenue / max) * 100, 3)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <Insight><b>{cats[0].category}</b> is the best-selling category.</Insight>
        </>
      )}
    </Panel>
  );
}

async function PaymentPanel() {
  const pay = await getPaymentSplit30d();
  const slices = pay.map((p, i) => ({ label: p.method.replace(/_/g, ' '), value: p.count, color: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }));
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <Panel title="Payment methods" subtitle="How customers paid, last 30 days" border="border-teal-300">
      <DonutChart slices={slices} centerLabel="orders" />
      {slices[0] && total > 0 && <Insight><b className="capitalize">{slices[0].label}</b> is the most used ({((slices[0].value / total) * 100).toFixed(0)}%).</Insight>}
    </Panel>
  );
}

async function TopProductsPanel() {
  const top = await getTopProducts30d();
  const max = Math.max(...top.map((p) => p.revenue), 1);
  return (
    <Panel title="Top products" subtitle="Best sellers by revenue, last 30 days" border="border-orange-300"
      action={<Link href="/admin/analytics" className="text-xs text-brand-700 hover:underline">Analytics →</Link>}>
      {top.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">No sales in the last 30 days.</p>
      ) : (
        <div className="space-y-3">
          {top.map((p, i) => (
            <div key={p.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">{i + 1}</span>
                  <span className="truncate text-stone-700">{p.name}</span>
                </span>
                <span className="shrink-0 text-stone-500">{p.units} · <b className="text-stone-700">{peso(p.revenue)}</b></span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.max((p.revenue / max) * 100, 3)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

async function RecentOrdersPanel() {
  const { recent } = await getSnapshot();
  return (
    <Panel title="Latest orders" subtitle="The 5 most recent orders" border="border-indigo-300"
      action={<Link href="/admin/orders" className="text-xs text-brand-700 hover:underline">View all →</Link>}>
      {recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">No orders yet.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {recent.map((o) => (
            <div key={o.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
  <div className="min-w-0">
    <span className="font-semibold text-stone-700">#{o.id}</span>
    <span className="ml-2 break-words text-xs text-stone-400">
      {o.status.replace(/_/g, ' ')} · {o.method.replace(/_/g, ' ')}
    </span>
  </div>
  <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:flex-col sm:items-end">
                <div className="font-semibold text-indigo-700">{peso(o.total)}</div>
                <div className="text-xs text-stone-400">{new Date(o.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

async function ActivityPanel() {
  const logs = await getLogs();
  return (
    <Panel title="Recent activity" subtitle="Latest actions on the platform" border="border-pink-300"
      action={<Link href="/admin/activity" className="text-xs text-brand-700 hover:underline">All logs →</Link>}>
      {logs.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">No activity yet.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3">
  <div className="min-w-0 break-words">
    <span className="font-semibold text-stone-700">{l.user_name}</span>
    <span className="ml-2 text-stone-500">{l.description}</span>
  </div>
  <span className="text-xs text-stone-400 sm:shrink-0 sm:text-right">
    {new Date(l.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
  </span>
</div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-brand-900">Platform overview</h1>
      <p className="mt-1 text-sm text-stone-500">What needs your attention, and how the marketplace is doing.</p>

      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-14" />}><AttentionSection /></Suspense>
      </div>

      <div className="mt-6">
        <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>}>
          <KpiSection />
        </Suspense>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-80" />}><RevenueChartPanel /></Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-80" />}><StatusPanel /></Suspense>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-80" />}><OrdersPerDayPanel /></Suspense>
        <Suspense fallback={<Skeleton className="h-80" />}><SignupsPanel /></Suspense>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<Skeleton className="h-72" />}><CategoryPanel /></Suspense>
        <Suspense fallback={<Skeleton className="h-72" />}><PaymentPanel /></Suspense>
        <Suspense fallback={<Skeleton className="h-72" />}><TopProductsPanel /></Suspense>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64" />}><RecentOrdersPanel /></Suspense>
        <Suspense fallback={<Skeleton className="h-64" />}><ActivityPanel /></Suspense>
      </div>
    </div>
  );
}