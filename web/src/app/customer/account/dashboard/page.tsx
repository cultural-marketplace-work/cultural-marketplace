import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  CreditCard,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShoppingBag,
  ShoppingCart,
  Star,
  Truck,
  UserRound,
} from 'lucide-react';
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
  awaiting_payment: { label: 'Awaiting GCash payment', cls: 'border border-ochre-300 bg-ochre-50 text-ochre-900' },
  pending: { label: 'Waiting for artisan', cls: 'border border-ochre-300 bg-ochre-50 text-ochre-900' },
  accepted: { label: 'Accepted by artisan', cls: 'border border-emerald-200 bg-emerald-50 text-emerald-800' },
  processing: { label: 'Being prepared', cls: 'border border-abaca-300 bg-abaca-100 text-brand-900' },
  preparing: { label: 'Being prepared', cls: 'border border-abaca-300 bg-abaca-100 text-brand-900' },
  shipped: { label: 'Shipped', cls: 'border border-crimson-200 bg-crimson-50 text-crimson-800' },
  delivered: { label: 'Delivered', cls: 'border border-emerald-200 bg-emerald-50 text-emerald-800' },
  received: { label: 'Received', cls: 'border border-stone-200 bg-stone-100 text-stone-700' },
  cancelled: { label: 'Cancelled', cls: 'border border-crimson-200 bg-crimson-50 text-crimson-800' },
  rejected: { label: 'Declined by artisan', cls: 'border border-crimson-200 bg-crimson-50 text-crimson-800' },
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
  const displayName = user?.name || session.name;

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
      cls: 'border-ochre-300 bg-ochre-50 text-ochre-950',
    });
  }
  if (nextBooking && nextDays !== null && nextDays <= 7) {
    attention.push({
      key: 'workshop',
      text: `${nextBooking.product_name} ${nextDays === 0 ? 'is today' : nextDays === 1 ? 'is tomorrow' : `starts in ${nextDays} days`}.`,
      cta: 'View ticket', href: '/customer/account/bookings',
      cls: 'border-ochre-300 bg-[#fffaf0] text-ochre-950',
    });
  }
  if (shipped.length) {
    attention.push({
      key: 'shipped',
      text: `${shipped.length} item${shipped.length > 1 ? 's are' : ' is'} on the way. Confirm once it arrives.`,
      cta: 'Track', href: '/customer/account/orders',
      cls: 'border-abaca-300 bg-abaca-50 text-brand-900',
    });
  }
  // One row per item that needs a review (max 3), each linking straight to that item
  const REVIEW_ROWS = 3;
  for (const it of toReview.slice(0, REVIEW_ROWS)) {
    attention.push({
      key: `review-${it.id}`,
      text: `How was “${it.product_name}”? It was delivered, so you can leave a review.`,
      cta: 'Leave a review', href: reviewHref(it),
      cls: 'border-ochre-300 bg-ochre-50 text-ochre-950',
    });
  }
  if (toReview.length > REVIEW_ROWS) {
    const rest = toReview.length - REVIEW_ROWS;
    attention.push({
      key: 'review-more',
      text: `${rest} more delivered item${rest > 1 ? 's are' : ' is'} waiting for your review.`,
      cta: 'Review next', href: reviewHref(toReview[REVIEW_ROWS]),
      cls: 'border-ochre-300 bg-ochre-50 text-ochre-950',
    });
  }
  if (stale.length) {
    const oldest = Math.max(...stale.map((i) => ageInDays(i.created_at)));
    attention.push({
      key: 'stale',
      text: `${stale.length} order${stale.length > 1 ? 's have' : ' has'} had no artisan response for ${STALE_DAYS}+ days (oldest: ${oldest} days).`,
      cta: 'Message artisan', href: '/customer/account/messages',
      cls: 'border-crimson-300 bg-crimson-50 text-crimson-950',
    });
  }
  if (unreadMessages > 0) {
    attention.push({
      key: 'messages',
      text: `You have ${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''} from artisans.`,
      cta: 'Open inbox', href: '/customer/account/messages',
      cls: 'border-abaca-300 bg-white text-brand-900',
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
    { label: 'Awaiting payment', value: awaitingPayment.length, box: 'border-ochre-200 bg-ochre-50 hover:bg-ochre-100', text: 'text-ochre-950', num: 'text-ochre-800', Icon: CreditCard },
    { label: 'Waiting for artisan', value: waitingArtisan.length, box: 'border-abaca-200 bg-white hover:bg-canvas', text: 'text-brand-900', num: 'text-brand-800', Icon: Clock3 },
    { label: 'Being prepared', value: preparing.length, box: 'border-abaca-200 bg-[#fffdf8] hover:bg-abaca-50', text: 'text-brand-900', num: 'text-brand-800', Icon: Package },
    { label: 'Shipped', value: shipped.length, box: 'border-crimson-200 bg-crimson-50 hover:bg-crimson-100', text: 'text-crimson-900', num: 'text-crimson-800', Icon: Truck },
    { label: 'To review', value: toReview.length, box: 'border-ochre-200 bg-[#fffaf0] hover:bg-ochre-50', text: 'text-ochre-950', num: 'text-ochre-800', Icon: Star },
  ];

  const summary = [
    { label: 'Total ordered', value: peso(totalOrdered), Icon: ShoppingBag },
    { label: 'Orders this month', value: String(ordersThisMonth), Icon: CalendarDays },
    { label: 'Unread messages', value: String(unreadMessages), href: '/customer/account/messages', Icon: MessageCircle },
    { label: 'Items in basket', value: String(cartCount), href: '/customer/account/cart', Icon: ShoppingCart },
  ];

  const headerLine = attention.length
    ? `${attention.length} thing${attention.length > 1 ? 's need' : ' needs'} your attention.`
    : inProgress > 0
      ? `You have ${inProgress} order${inProgress > 1 ? 's' : ''} in progress.`
      : 'Track your orders and support local artisans.';

  return (
    <main className="mx-auto max-w-7xl space-y-5 font-sans">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-ochre-300 bg-white/10 shadow-md sm:h-20 sm:w-20">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt={`${displayName}'s profile`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-3xl font-bold text-ochre-200">
                  {displayName?.charAt(0)?.toUpperCase() || 'C'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">{greeting()}</p>
              <h1 className="mt-1 truncate font-serif text-2xl font-bold sm:text-3xl">Welcome, {displayName}</h1>
              <p className="mt-1 text-sm font-semibold text-white/85">Customer account</p>
              <p className="mt-2 max-w-2xl text-sm leading-5 text-white/75">{headerLine}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/customer/account/profile"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-200"
                >
                  <UserRound size={15} aria-hidden="true" />
                  Edit profile
                </Link>
                <Link
                  href="/customer/account/bookings"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ochre-300 px-3.5 py-2 text-sm font-bold text-charcoal-950 transition hover:bg-ochre-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <CalendarDays size={15} aria-hidden="true" />
                  My bookings
                </Link>
              </div>
            </div>
          </div>
          <Link
            href="/customer/account/cart"
            aria-label={`Basket, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            className="relative inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-200 sm:self-center"
          >
            <ShoppingCart size={18} aria-hidden="true" />
            Basket
            {cartCount > 0 && (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-ochre-300 px-1.5 py-0.5 text-xs font-bold text-charcoal-950">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <section aria-labelledby="attention-title" className="rounded-2xl border border-abaca-200/80 bg-white/95 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                <CircleAlert size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 id="attention-title" className="font-serif text-xl font-bold text-brand-900">
                  Needs your attention
                  {attention.length > 0 && (
                    <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-crimson-700 px-2 py-0.5 align-middle text-xs font-bold text-white">
                      {attention.length}
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-stone-500">A short list of payments, deliveries, messages, or reviews that may need you.</p>
              </div>
            </div>
            {attention.length ? (
              <ul className="mt-5 space-y-2.5">
                {attention.map((a) => (
                  <li key={a.key} className={`flex flex-col items-start justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${a.cls}`}>
                    <p className="min-w-0 flex-1 text-sm leading-5 font-medium">{a.text}</p>
                    <Link
                      href={a.href}
                      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-current bg-white/75 px-3.5 py-2 text-sm font-bold transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                    >
                      {a.cta} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
                <p>You&apos;re all caught up. Nothing needs action right now.</p>
              </div>
            )}
      </section>

      {nextBooking && (
        <section aria-labelledby="upcoming-workshop-title" className="rounded-2xl border border-ochre-200 bg-gradient-to-r from-[#fffaf0] to-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ochre-100 text-ochre-900">
                <CalendarDays size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ochre-900">Upcoming workshop</p>
                  {nextDays !== null && (
                    <span className="rounded-full bg-crimson-700 px-2.5 py-1 text-xs font-bold text-white">
                      {nextDays === 0 ? 'Today' : nextDays === 1 ? 'Tomorrow' : `In ${nextDays} days`}
                    </span>
                  )}
                  {nextBooking.order_status === 'awaiting_payment' && (
                    <span className="rounded-full border border-ochre-300 bg-ochre-50 px-2.5 py-1 text-xs font-semibold text-ochre-900">
                      Payment pending
                    </span>
                  )}
                </div>
                <h2 id="upcoming-workshop-title" className="mt-2 break-words font-serif text-xl font-bold text-brand-900">
                  {nextBooking.product_name}
                </h2>
                <div className="mt-2 space-y-1.5 text-sm text-stone-600">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <CalendarDays size={14} className="text-ochre-800" aria-hidden="true" />
                    {next?.key ? fmtDate(next.key) : 'Confirmed session'}
                    {nextBooking.selected_session?.time_start && (
                      <span>
                        {fmtTime(nextBooking.selected_session.time_start)}
                        {nextBooking.selected_session.time_end ? ` – ${fmtTime(nextBooking.selected_session.time_end)}` : ''}
                      </span>
                    )}
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-ochre-800" aria-hidden="true" />
                    {nextBooking.venue_location || nextBooking.selected_session?.location || 'Artisan Workshop Studio'}
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <UserRound size={14} className="text-ochre-800" aria-hidden="true" />
                    Hosted by <span className="font-semibold text-stone-700">{nextBooking.artisan_name}</span>
                    {nextBooking.artisan_phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={13} aria-hidden="true" />
                        {nextBooking.artisan_phone}
                      </span>
                    )}
                  </p>
                </div>
                {nextBooking.ticket_code && (
                  <p className="mt-3 inline-flex rounded-lg border border-abaca-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-brand-800">
                    Ticket: {nextBooking.ticket_code}
                  </p>
                )}
                {moreUpcoming > 0 && (
                  <p className="mt-2 text-xs font-medium text-ochre-900">
                    +{moreUpcoming} more upcoming booking{moreUpcoming > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <Link
              href="/customer/account/bookings"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-crimson-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700"
            >
              View booking <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      <section aria-label="Order status overview" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value, box, text, num, Icon }) => (
          <Link
            key={label}
            href="/customer/account/orders"
            className={`rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700 ${box} ${value === 0 ? 'opacity-75' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold leading-4 ${text}`}>{label}</p>
              <Icon size={16} className={num} aria-hidden="true" />
            </div>
            <p className={`mt-3 font-serif text-2xl font-bold ${num}`}>{value}</p>
          </Link>
        ))}
      </section>

      <section aria-label="Account summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map(({ label, value, href, Icon }) => {
          const content = (
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs leading-4 text-stone-500">{label}</p>
                <p className="mt-1 truncate font-serif text-lg font-bold text-brand-900">{value}</p>
              </div>
            </div>
          );
          const className = 'rounded-2xl border border-abaca-200/80 bg-white/95 p-4 shadow-sm transition hover:border-ochre-300 hover:bg-[#fffdf8]';
          return href ? (
            <Link key={label} href={href} className={className}>{content}</Link>
          ) : (
            <div key={label} className={className}>{content}</div>
          );
        })}
      </section>

      <nav aria-label="Customer shortcuts" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Workshops & bookings', href: '/customer/account/bookings', Icon: CalendarDays },
          { label: 'All orders', href: '/customer/account/orders', Icon: Package },
          { label: 'Edit profile', href: '/customer/account/profile', Icon: UserRound },
          { label: 'Address book', href: '/customer/account/addresses', Icon: MapPin },
          { label: 'Report an issue', href: '/customer/account/report', Icon: ClipboardList },
          { label: 'Messages', href: '/customer/account/messages', Icon: MessageCircle },
        ].map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-abaca-200 bg-white px-3 py-2 text-center text-xs font-semibold text-brand-800 shadow-sm transition hover:border-ochre-300 hover:bg-ochre-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700"
          >
            <Icon size={15} className="shrink-0 text-ochre-800" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="recent-orders-title" className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <ShoppingBag size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 id="recent-orders-title" className="font-serif text-xl font-bold text-brand-900">
                {activeItems.length ? 'Orders in progress' : 'Recent orders'}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">Follow each item from order to delivery.</p>
            </div>
          </div>
          <Link
            href="/customer/account/orders"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-crimson-800 transition hover:bg-crimson-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-700"
          >
            View all {orders.length > 0 ? `(${orders.length})` : ''}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {recentItems.map((item) => {
            const status = statusOf(item.status);
            const age = ageInDays(item.created_at);
            const isStale = item.status === 'pending' && age >= STALE_DAYS;
            const needsReview = ['delivered', 'received'].includes(item.status) && item.review_rating == null;
            return (
              <Link
                key={item.id}
                href={needsReview ? reviewHref(item) : `/customer/account/orders?order=${item.order_id}#item-${item.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white p-3.5 transition hover:border-ochre-300 hover:bg-[#fffdf8] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
              >
                <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-abaca-100 bg-canvas">
                    {item.image_path ? (
                      <img src={item.image_path} alt={item.product_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ochre-800">
                        <ShoppingBag size={23} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-900 group-hover:text-crimson-800">{item.product_name}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      Made by <span className="font-semibold text-stone-700">{item.artisan_name}</span>
                    </p>
                    {item.selected_variant && (
                      <p className="mt-0.5 truncate text-xs text-stone-500">{item.selected_variant}</p>
                    )}
                    <p className="mt-1 text-xs text-stone-500">
                      Order #{item.order_id} · {new Date(item.created_at).toLocaleDateString('en-PH', { timeZone: TZ })} · {item.payment_method === 'gcash' ? 'GCash' : 'Cash on delivery'}
                    </p>
                    {item.status === 'shipped' && item.tracking_number && (
                      <p className="mt-1 truncate font-mono text-[11px] text-brand-800">
                        {item.courier_name ? `${item.courier_name}: ` : ''}{item.tracking_number}
                      </p>
                    )}
                    {isStale && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-crimson-800">
                        <Clock3 size={12} aria-hidden="true" />
                        No response for {age} days
                      </p>
                    )}
                    {needsReview && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-ochre-900">
                        <Star size={12} aria-hidden="true" />
                        Tap to rate this item
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                  <div className="sm:text-right">
                    <p className="text-sm font-bold text-crimson-800">{peso(item.price * item.quantity)}</p>
                    {item.quantity > 1 && (
                      <p className="mt-0.5 text-[11px] text-stone-500">{item.quantity} × {peso(item.price)}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                </div>
              </Link>
            );
          })}

          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-abaca-300 bg-canvas/60 px-5 py-8 text-center">
              <ShoppingBag size={24} className="mx-auto text-ochre-700" aria-hidden="true" />
              <p className="mt-2 font-semibold text-brand-900">No orders yet</p>
              <p className="mt-1 text-sm text-stone-500">Browse the marketplace to find a craft you love.</p>
              <Link
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-crimson-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-800"
                href="/customer/browse"
              >
                Browse crafts <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="notifications-title" className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
              <Bell size={19} aria-hidden="true" />
            </span>
            <div>
              <h2 id="notifications-title" className="font-serif text-xl font-bold text-brand-900">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-crimson-700 px-2 py-0.5 align-middle text-xs font-bold text-white">
                    {unread}
                  </span>
                )}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">Updates about your orders and messages.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unread > 0 && (
              <form action={markAllRead}>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-ochre-900 transition hover:bg-ochre-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700"
                >
                  Mark all as read
                </button>
              </form>
            )}
            <Link
              href="/customer/account/messages"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-canvas px-3 text-sm font-semibold text-brand-800 transition hover:bg-ochre-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700"
            >
              See all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="space-y-2.5 p-4 sm:p-5">
          {shownNotifications.map((group) => (
            <article
              key={group.id}
              className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                group.unread ? 'border-ochre-200 bg-[#fffaf0]' : 'border-stone-100 bg-white'
              }`}
            >
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${group.unread ? 'bg-crimson-700' : 'bg-stone-200'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-5 ${group.unread ? 'font-semibold text-brand-900' : 'text-stone-600'}`}>
                  {group.message}
                  {group.count > 1 && (
                    <span className="ml-2 inline-flex rounded-full bg-abaca-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-800">
                      ×{group.count}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-stone-500">{relTime(group.latest)}</p>
              </div>
            </article>
          ))}
          {notifications.length === 0 && (
            <div className="rounded-xl border border-dashed border-abaca-300 bg-canvas/60 px-4 py-7 text-center">
              <CheckCircle2 size={22} className="mx-auto text-ochre-700" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-brand-900">You&apos;re all caught up.</p>
              <p className="mt-1 text-xs text-stone-500">New updates will appear here.</p>
            </div>
          )}
          {groups.length > shownNotifications.length && (
            <p className="pt-1 text-center text-xs text-stone-500">
              +{groups.length - shownNotifications.length} older notification{groups.length - shownNotifications.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}