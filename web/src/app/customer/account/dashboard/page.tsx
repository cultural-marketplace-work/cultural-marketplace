import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import {
  listCustomerOrders,
  listCustomerOrderItems,
  listNotifications,
  markNotificationsRead,
  getCart,
  listCustomerBookings,
  getUnreadMessageCount,
  getUser,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

// Keys are the real order_items.status values. 'pending' = paid/COD and the
// artisan has not acted yet.
const STATUS: Record<string, { label: string; cls: string }> = {
  awaiting_payment: { label: 'Awaiting GCash payment', cls: 'bg-orange-100 text-orange-800' },
  pending: { label: 'Waiting for artisan', cls: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Accepted by artisan', cls: 'bg-emerald-100 text-emerald-800' },
  processing: { label: 'Being prepared', cls: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'Being prepared', cls: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', cls: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', cls: 'bg-teal-100 text-teal-800' },
  received: { label: 'Received', cls: 'bg-stone-200 text-stone-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
  rejected: { label: 'Declined by artisan', cls: 'bg-red-100 text-red-800' },
};

const statusOf = (s: string) =>
  STATUS[s] ?? { label: s.replace(/_/g, ' '), cls: 'bg-stone-100 text-stone-600' };

const peso = (n: number) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ACTIVE_EXCLUDED = ['delivered', 'received', 'attended', 'no_show', 'cancelled', 'rejected'];
const PREPARING = ['accepted', 'processing', 'preparing'];
const STALE_DAYS = 7;
const TZ = 'Asia/Manila';
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Date helpers (everything is rendered in Manila time)
// ---------------------------------------------------------------------------
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

function daysBetweenKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

function fmtDate(key: string): string {
  return new Date(`${key}T00:00:00+08:00`).toLocaleDateString('en-PH', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ,
  });
}

function fmtTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ });
}

const ageInDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);

function greeting(): string {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: TZ }));
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type Attention = { key: string; text: string; cta: string; href: string; cls: string };

// Deep link to one specific item in the orders page. The orders page can read
// ?review=<order item id> to open the review form, and each item row carries
// id="item-<order item id>" so the #hash scrolls to it.
const reviewHref = (it: { id: number; order_id: number }) =>
  `/customer/account/orders?order=${it.order_id}&review=${it.id}#item-${it.id}`;

export default async function CustomerDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'customer') redirect('/auth/login?next=/customer/account/dashboard');

  async function markAllRead() {
    'use server';
    const s = await getSession();
    if (!s || s.role !== 'customer') return;
    await markNotificationsRead(s.id, 'customer');
    revalidatePath('/customer/account/dashboard');
  }

  const [orders, allItems, notifications, cart, bookings, user, unreadMessages] = await Promise.all([
    listCustomerOrders(session.id),
    listCustomerOrderItems(session.id, 100),
    listNotifications(session.id, 'customer'),
    getCart(session.id),
    listCustomerBookings(session.id),
    getUser(session.id),
    getUnreadMessageCount(session.id),
  ]);

  const unread = notifications.filter((n) => !n.is_read).length;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // -------------------------------------------------------------------------
  // Workshops: only upcoming sessions, soonest first
  // -------------------------------------------------------------------------
  const today = todayKey();
  const upcoming = bookings
    .filter((b) => !['cancelled', 'attended', 'no_show'].includes(b.status) && b.order_status !== 'cancelled')
    .map((b) => {
      const raw = b.selected_session?.date;
      const key = raw && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
      return { b, key };
    })
    .filter((x) => !x.key || x.key >= today)
    .sort((a, b) => (a.key ?? '9999-12-31').localeCompare(b.key ?? '9999-12-31'));

  const next = upcoming[0] ?? null;
  const nextBooking = next?.b ?? null;
  const nextDays = next?.key ? daysBetweenKeys(today, next.key) : null;
  const moreUpcoming = Math.max(0, upcoming.length - 1);

  // -------------------------------------------------------------------------
  // Orders (physical products / bundles; workshop tickets live in Bookings)
  // -------------------------------------------------------------------------
  const items = allItems.filter((i) => i.purchase_type !== 'workshop');

  const awaitingPayment = items.filter((i) => i.status === 'awaiting_payment');
  const waitingArtisan = items.filter((i) => i.status === 'pending');
  const preparing = items.filter((i) => PREPARING.includes(i.status));
  const shipped = items.filter((i) => i.status === 'shipped');
  const toReview = items.filter((i) => ['delivered', 'received'].includes(i.status) && i.review_rating == null);
  const stale = waitingArtisan.filter((i) => ageInDays(i.created_at) >= STALE_DAYS);
  const inProgress = items.filter((i) => !ACTIVE_EXCLUDED.includes(i.status)).length;

  const activeItems = items.filter((i) => !ACTIVE_EXCLUDED.includes(i.status));
  const recentItems = (activeItems.length ? activeItems : items).slice(0, 5);

  // Summary numbers
  const monthKey = today.slice(0, 7);
  const ordersThisMonth = orders.filter(
    (o) => o.status !== 'cancelled' && new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7) === monthKey
  ).length;
  const totalOrdered = allItems
    .filter((i) => !['cancelled', 'rejected'].includes(i.status) && i.order_status !== 'cancelled')
    .reduce((s, i) => s + i.price * i.quantity, 0);

  // -------------------------------------------------------------------------
  // "Needs your attention"
  // -------------------------------------------------------------------------
  const attention: Attention[] = [];
  const awaitingOrderIds = Array.from(new Set(awaitingPayment.map((i) => i.order_id)));
  if (awaitingOrderIds.length) {
    attention.push({
      key: 'pay',
      text: `${awaitingOrderIds.length} order${awaitingOrderIds.length > 1 ? 's are' : ' is'} waiting for your GCash payment.`,
      cta: 'Pay now', href: '/customer/account/orders',
      cls: 'border-orange-300 bg-orange-50 text-orange-900',
    });
  }
  if (nextBooking && nextDays !== null && nextDays <= 7) {
    attention.push({
      key: 'workshop',
      text: `${nextBooking.product_name} ${nextDays === 0 ? 'is today' : nextDays === 1 ? 'is tomorrow' : `starts in ${nextDays} days`}.`,
      cta: 'View ticket', href: '/customer/account/bookings',
      cls: 'border-[#D6B56D] bg-[#FFF9EF] text-[#7A5410]',
    });
  }
  if (shipped.length) {
    attention.push({
      key: 'shipped',
      text: `${shipped.length} item${shipped.length > 1 ? 's are' : ' is'} on the way. Confirm once it arrives.`,
      cta: 'Track', href: '/customer/account/orders',
      cls: 'border-indigo-300 bg-indigo-50 text-indigo-900',
    });
  }
  // One row per item that needs a review (max 3), each linking straight to that item
  const REVIEW_ROWS = 3;
  for (const it of toReview.slice(0, REVIEW_ROWS)) {
    attention.push({
      key: `review-${it.id}`,
      text: `How was “${it.product_name}”? It was delivered, so you can leave a review.`,
      cta: 'Leave a review', href: reviewHref(it),
      cls: 'border-teal-300 bg-teal-50 text-teal-900',
    });
  }
  if (toReview.length > REVIEW_ROWS) {
    const rest = toReview.length - REVIEW_ROWS;
    attention.push({
      key: 'review-more',
      text: `${rest} more delivered item${rest > 1 ? 's are' : ' is'} waiting for your review.`,
      cta: 'Review next', href: reviewHref(toReview[REVIEW_ROWS]),
      cls: 'border-teal-300 bg-teal-50 text-teal-900',
    });
  }
  if (stale.length) {
    const oldest = Math.max(...stale.map((i) => ageInDays(i.created_at)));
    attention.push({
      key: 'stale',
      text: `${stale.length} order${stale.length > 1 ? 's have' : ' has'} had no artisan response for ${STALE_DAYS}+ days (oldest: ${oldest} days).`,
      cta: 'Message artisan', href: '/customer/account/messages',
      cls: 'border-red-300 bg-red-50 text-red-900',
    });
  }
  if (unreadMessages > 0) {
    attention.push({
      key: 'messages',
      text: `You have ${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''} from artisans.`,
      cta: 'Open inbox', href: '/customer/account/messages',
      cls: 'border-blue-300 bg-blue-50 text-blue-900',
    });
  }

  // -------------------------------------------------------------------------
  // Notifications: group identical messages, unread first
  // -------------------------------------------------------------------------
  type Group = { id: number; message: string; count: number; latest: string; unread: boolean };
  const grouped = new Map<string, Group>();
  for (const n of notifications) {
    const g = grouped.get(n.message);
    if (g) {
      g.count += 1;
      g.unread = g.unread || !n.is_read;
    } else {
      grouped.set(n.message, { id: n.id, message: n.message, count: 1, latest: n.created_at, unread: !n.is_read });
    }
  }
  const groups = Array.from(grouped.values());
  const shownNotifications = [...groups.filter((g) => g.unread), ...groups.filter((g) => !g.unread)].slice(0, 5);

  const stats = [
    { label: 'Awaiting payment', value: awaitingPayment.length, box: 'border-orange-300 bg-orange-50 hover:bg-orange-100', text: 'text-orange-900', num: 'text-orange-700' },
    { label: 'Waiting for artisan', value: waitingArtisan.length, box: 'border-amber-300 bg-amber-50 hover:bg-amber-100', text: 'text-amber-900', num: 'text-amber-700' },
    { label: 'Being prepared', value: preparing.length, box: 'border-blue-300 bg-blue-50 hover:bg-blue-100', text: 'text-blue-900', num: 'text-blue-700' },
    { label: 'Shipped', value: shipped.length, box: 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100', text: 'text-indigo-900', num: 'text-indigo-700' },
    { label: 'To review', value: toReview.length, box: 'border-teal-300 bg-teal-50 hover:bg-teal-100', text: 'text-teal-900', num: 'text-teal-700' },
  ];

  const summary = [
    { label: 'Total ordered', value: peso(totalOrdered) },
    { label: 'Orders this month', value: String(ordersThisMonth) },
    { label: 'Unread messages', value: String(unreadMessages), href: '/customer/account/messages' },
    { label: 'Items in basket', value: String(cartCount), href: '/customer/account/cart' },
  ];

  const headerLine = attention.length
    ? `${attention.length} thing${attention.length > 1 ? 's need' : ' needs'} your attention.`
    : inProgress > 0
      ? `You have ${inProgress} order${inProgress > 1 ? 's' : ''} in progress.`
      : 'Track your orders and support local artisans.';

  return (
    <main className="min-h-screen bg-[#FCF9F4]">
      {/* PROFILE HEADER */}
      <section className="relative border-b border-[#E8DCCB] px-4 py-6 md:px-8">
        <Link
          href="/customer/account/cart"
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          className="absolute right-4 top-4 rounded-full border border-[#D8C8B5] bg-white p-2.5 shadow-sm transition hover:bg-[#FFF5E4] md:right-8 md:top-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-[#3D3028]"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          {cartCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8B0000] px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          )}
        </Link>

        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border border-[#D8C8B5] bg-white">
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={`${session.name}'s profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#8B0000]">
                {session.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
            )}
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9A8F84]">{greeting()}</p>
            <h1 className="font-serif text-xl font-bold text-[#3D3028] md:text-2xl">Hi, {session.name}</h1>
            <p className="mt-1 text-sm font-semibold text-[#D18A00]">Valued Customer</p>
            <p className="mt-1 text-sm text-[#71675F]">{headerLine}</p>

            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link
                href="/customer/account/profile"
                className="rounded-md border border-[#D6B56D] bg-white px-4 py-1 text-[10px] font-medium text-[#9A681D] transition hover:bg-[#FFF5E4]"
              >
                Change Photo
              </Link>
              <Link
                href="/customer/account/bookings"
                className="rounded-md border border-[#D9A6A6] bg-white px-4 py-1 text-[10px] font-medium text-[#8B0000] transition hover:bg-[#FCEEEE]"
              >
                My Bookings
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gray-300" />

      <section className="px-4 py-5 md:px-8 md:py-6">
        <div className="mx-auto max-w-4xl">
          {/* NEEDS YOUR ATTENTION */}
          <div className="rounded-2xl border border-[#D6D0C9] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-serif text-xl font-bold text-[#3D3028]">
              Needs your attention
              {attention.length > 0 && (
                <span className="ml-2 rounded-full bg-[#8B0000] px-2 py-0.5 align-middle text-xs font-bold text-white">
                  {attention.length}
                </span>
              )}
            </h2>
            {attention.length ? (
              <ul className="mt-4 space-y-2">
                {attention.map((a) => (
                  <li key={a.key} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${a.cls}`}>
                    <p className="min-w-0 flex-1 text-sm font-medium">{a.text}</p>
                    <Link
                      href={a.href}
                      className="shrink-0 rounded-lg border border-current bg-white/70 px-3 py-1.5 text-xs font-bold transition hover:bg-white"
                    >
                      {a.cta} →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ You&apos;re all caught up. Nothing needs action right now.
              </p>
            )}
          </div>

          {/* UPCOMING WORKSHOP */}
          {nextBooking && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#D6B56D] bg-[#FFF9EF] p-5 shadow-sm">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#D6B56D] bg-[#F5A000] px-2.5 py-0.5 text-xs font-bold text-[#3D3028]">
                    Upcoming Workshop
                  </span>
                  {nextDays !== null && (
                    <span className="rounded-full bg-[#8B0000] px-2.5 py-0.5 text-xs font-bold text-white">
                      {nextDays === 0 ? 'Today' : nextDays === 1 ? 'Tomorrow' : `In ${nextDays} days`}
                    </span>
                  )}
                  {nextBooking.order_status === 'awaiting_payment' && (
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                      Payment pending
                    </span>
                  )}
                  {nextBooking.ticket_code && (
                    <span className="font-mono text-xs font-bold text-[#8B0000]">🎟️ {nextBooking.ticket_code}</span>
                  )}
                </div>
                <h3 className="font-serif text-lg font-bold text-[#3D3028]">{nextBooking.product_name}</h3>
                <p className="text-xs text-[#71675F]">
                  {next?.key ? fmtDate(next.key) : 'Confirmed session'}
                  {nextBooking.selected_session?.time_start && (
                    <>
                      {' · '}
                      {fmtTime(nextBooking.selected_session.time_start)}
                      {nextBooking.selected_session.time_end ? ` – ${fmtTime(nextBooking.selected_session.time_end)}` : ''}
                    </>
                  )}
                </p>
                <p className="text-xs text-[#71675F]">
                  📍 {nextBooking.venue_location || nextBooking.selected_session?.location || 'Artisan Workshop Studio'}
                </p>
                <p className="text-xs text-[#71675F]">
                  Hosted by <span className="font-medium">{nextBooking.artisan_name}</span>
                  {nextBooking.artisan_phone && <> · 📞 {nextBooking.artisan_phone}</>}
                </p>
                {moreUpcoming > 0 && (
                  <p className="text-[11px] text-[#9A681D]">
                    +{moreUpcoming} more upcoming booking{moreUpcoming > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <Link href="/customer/account/bookings" className="btn-primary px-3.5 py-2 text-xs font-bold shadow-sm">
                Track Venue & Pathfinding →
              </Link>
            </div>
          )}

          {/* ORDER STATUS OVERVIEW */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map((s) => (
              <Link
                key={s.label}
                href="/customer/account/orders"
                className={`rounded-2xl border p-4 shadow-sm transition ${s.box} ${s.value === 0 ? 'opacity-60' : ''}`}
              >
                <p className={`text-xs ${s.text}`}>{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.num}`}>{s.value}</p>
              </Link>
            ))}
          </div>

          {/* SUMMARY */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.map((s) => {
              const body = (
                <>
                  <p className="text-[11px] text-[#71675F]">{s.label}</p>
                  <p className="mt-0.5 text-lg font-bold text-[#3D3028]">{s.value}</p>
                </>
              );
              const cls = 'rounded-xl border border-[#E8DCCB] bg-white p-3 shadow-sm';
              return s.href ? (
                <Link key={s.label} href={s.href} className={`${cls} transition hover:bg-[#FFF5E4]`}>{body}</Link>
              ) : (
                <div key={s.label} className={cls}>{body}</div>
              );
            })}
          </div>

          {/* QUICK LINKS */}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn-primary" href="/customer/account/bookings">Workshops & Bookings</Link>
            <Link className="btn-outline" href="/customer/account/orders">All orders</Link>
            <Link className="btn-outline" href="/customer/account/profile">Edit profile</Link>
            <Link className="btn-outline" href="/customer/account/addresses">Address book</Link>
            <Link className="btn-outline" href="/customer/account/report">Report an issue</Link>
            <Link className="btn-outline" href="/customer/account/messages">Messages</Link>
          </div>

          {/* MY ORDERS (item-level) */}
          <div className="mt-8 rounded-2xl border border-[#D6D0C9] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-[#3D3028]">
                {activeItems.length ? 'Orders in progress' : 'Recent orders'}
              </h2>
              <Link href="/customer/account/orders" className="text-sm text-[#8B0000] underline">
                View all ({orders.length})
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentItems.map((it) => {
                const st = statusOf(it.status);
                const age = ageInDays(it.created_at);
                const isStale = it.status === 'pending' && age >= STALE_DAYS;
                const needsReview = ['delivered', 'received'].includes(it.status) && it.review_rating == null;
                return (
                  <Link
                    key={it.id}
                    href={needsReview ? reviewHref(it) : `/customer/account/orders?order=${it.order_id}#item-${it.id}`}
                    className="flex items-center gap-4 rounded-xl border border-[#E8DCCB] p-3 transition hover:bg-[#FFF5E4]"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F3EBDD]">
                      {it.image_path ? (
                        <img src={it.image_path} alt={it.product_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl">🧺</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#3D3028]">{it.product_name}</p>
                      <p className="truncate text-xs text-[#71675F]">
                        Made by <span className="font-medium">{it.artisan_name}</span>
                      </p>
                      {it.selected_variant && (
                        <p className="truncate text-[11px] text-[#71675F]">{it.selected_variant}</p>
                      )}
                      <p className="mt-0.5 text-xs text-[#71675F]">
                        Order #{it.order_id} · {new Date(it.created_at).toLocaleDateString('en-PH', { timeZone: TZ })} ·{' '}
                        {it.payment_method === 'gcash' ? 'GCash' : 'COD'}
                      </p>
                      {it.status === 'shipped' && it.tracking_number && (
                        <p className="truncate font-mono text-[11px] text-indigo-700">
                          {it.courier_name ? `${it.courier_name}: ` : ''}{it.tracking_number}
                        </p>
                      )}
                      {isStale && (
                        <p className="text-[11px] font-medium text-red-700">⚠ No response for {age} days</p>
                      )}
                      {needsReview && (
                        <p className="text-[11px] font-medium text-teal-700">★ Tap to rate this item</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="text-sm font-bold text-[#8B0000]">{peso(it.price * it.quantity)}</p>
                      {it.quantity > 1 && <p className="text-[10px] text-[#71675F]">{it.quantity} × {peso(it.price)}</p>}
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                  </Link>
                );
              })}

              {items.length === 0 && (
                <p className="text-[#71675F]">
                  No orders yet —{' '}
                  <Link className="text-[#8B0000] underline" href="/customer/browse">start browsing</Link>.
                </p>
              )}
            </div>
          </div>

          {/* NOTIFICATIONS (grouped, unread first) */}
          <div className="mt-5 rounded-2xl border border-[#D6D0C9] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-xl font-bold text-[#3D3028]">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 rounded-full bg-[#8B0000] px-2 py-0.5 align-middle text-xs font-bold text-white">
                    {unread} new
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-4">
                {unread > 0 && (
                  <form action={markAllRead}>
                    <button type="submit" className="text-sm text-[#9A681D] underline hover:text-[#8B0000]">
                      Mark all as read
                    </button>
                  </form>
                )}
                <Link href="/customer/account/messages" className="text-sm text-[#8B0000] underline">
                  See all
                </Link>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {shownNotifications.map((g) => (
                <div
                  key={g.id}
                  className={`flex items-start gap-3 rounded-xl border border-[#E8DCCB] p-3 ${g.unread ? 'bg-[#FFF9EF]' : 'opacity-60'}`}
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${g.unread ? 'bg-[#8B0000]' : 'bg-transparent'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#3D3028]">
                      {g.message}
                      {g.count > 1 && (
                        <span className="ml-2 rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold text-stone-700">
                          ×{g.count}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">{relTime(g.latest)}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-[#71675F]">You&apos;re all caught up.</p>}
              {groups.length > shownNotifications.length && (
                <p className="pt-1 text-center text-xs text-[#71675F]">
                  +{groups.length - shownNotifications.length} older notification{groups.length - shownNotifications.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}