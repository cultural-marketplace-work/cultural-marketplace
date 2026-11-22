import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CircleUserRound,
  ClipboardList,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { getSession } from '@/lib/auth';
import { listArtisanProducts, listArtisanOrders, listNotifications, getArtisan } from '@/lib/db';
import { getArtisanTranslator } from '@/lib/artisanI18n';

export const dynamic = 'force-dynamic';

const ORDER_STATUS_STYLE: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  processing: 'border-blue-200 bg-blue-50 text-blue-800',
  shipped: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  delivered: 'border-green-200 bg-green-50 text-green-800',
  cancelled: 'border-stone-200 bg-stone-100 text-stone-600',
};

export default async function ArtisanDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/dashboard');

  const profile = await getArtisan(session.id);
  const { t } = await getArtisanTranslator(session.id);
  const isVerified = profile?.verification_status === 'approved';
  const [products, orders, notifications] = isVerified
    ? await Promise.all([
        listArtisanProducts(session.id),
        listArtisanOrders(session.id),
        listNotifications(session.id, 'artisan'),
      ])
    : [[], [], []];
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const unread = notifications.filter((notification) => !notification.is_read).length;
  const displayName = profile?.business_name || profile?.name || session.name;
  const applicationPending = profile?.verification_status === 'pending' && profile.application_submitted;
  const verificationSummary = applicationPending
    ? t('Verification under review')
    : profile?.verification_status === 'rejected'
      ? t('Changes requested')
      : t('Verification not completed');

  return (
    <div className="mx-auto max-w-7xl">
      {isVerified ? (
        <>
          <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 opacity-[0.12]"
              style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
            />
            <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute -right-8 -top-20 -z-10 h-56 w-56 rounded-full border border-white/10" />
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-ochre-200">
                  <Sparkles size={14} aria-hidden="true" />
                  {t('Artisan workspace')}
                </p>
                <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">
                  {t('Welcome back')}, {displayName}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                  {t('Your craft business at a glance. Manage your creations, orders, and community from here.')}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-ochre-200/30 bg-black/10 px-3 py-1.5 text-xs font-semibold text-ochre-100">
                  <ShieldCheck size={15} aria-hidden="true" />
                  {t('Verified artisan')}
                </span>
              </div>
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-ochre-300 px-4 py-3 text-sm font-bold text-charcoal-950 shadow-sm transition hover:bg-ochre-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                href="/artisan/products/new"
              >
                <Plus size={17} aria-hidden="true" />
                {t('Add a creation')}
              </Link>
            </div>
          </section>

          <section aria-label={t('Business summary')} className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: t('Creations'), value: products.length, href: '/artisan/products', Icon: Package, note: t('In your collection') },
              { label: t('Pending orders'), value: pendingOrders.length, href: '/artisan/orders', Icon: ClipboardList, note: t('Need your attention') },
              { label: t('Total orders'), value: orders.length, href: '/artisan/orders', Icon: ShoppingBag, note: t('Across your shop') },
              { label: t('Unread updates'), value: unread, href: '/artisan/notifications', Icon: Bell, note: t('Community and shop') },
            ].map(({ label, value, href, Icon, note }) => (
              <Link
                key={label}
                href={href}
                className="group rounded-2xl border border-abaca-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-ochre-400 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <ArrowRight size={16} className="mt-1 text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-700" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-medium text-stone-500">{label}</p>
                <p className="mt-1 font-serif text-3xl font-bold text-brand-900">{value}</p>
                <p className="mt-1 text-xs text-stone-400">{note}</p>
              </Link>
            ))}
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.8fr)]">
            <section aria-labelledby="recent-orders-title">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">{t('Your shop')}</p>
                  <h2 id="recent-orders-title" className="mt-1 font-serif text-2xl font-bold text-brand-900">{t('Recent orders')}</h2>
                </div>
                <Link href="/artisan/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900">
                  {t('View all')} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
                {orders.slice(0, 6).map((order, index) => (
                  <div
                    key={order.id}
                    className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 ${
                      index > 0 ? 'border-t border-stone-100' : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-brand-700">
                        <ShoppingBag size={18} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-800">
                          {order.product_name} <span className="font-normal text-stone-500">× {order.quantity}</span>
                          {order.selected_variant ? ` · ${order.selected_variant}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">
                          {t('Order')} #{order.order_id} <span className="mx-1 text-stone-300">•</span>
                          {order.customer_name ?? t('Customer')} <span className="mx-1 text-stone-300">•</span>
                          {order.order?.payment_method === 'gcash' ? 'GCash' : t('Cash on delivery')}
                        </p>
                      </div>
                    </div>
                    <span className={`badge shrink-0 border capitalize ${ORDER_STATUS_STYLE[order.status] ?? 'border-stone-200 bg-stone-50 text-stone-600'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="px-6 py-10 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
                      <ShoppingBag size={22} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-serif text-lg font-bold text-brand-900">{t('Your next order starts with a creation')}</h3>
                    <p className="mt-1 text-sm text-stone-500">{t('Add a craft to your shop and share it with the community.')}</p>
                    <Link href="/artisan/products/new" className="btn-primary mt-4">
                      <Plus size={16} aria-hidden="true" /> {t('Add a creation')}
                    </Link>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              {unread > 0 && (
                <Link href="/artisan/notifications" className="flex items-start gap-3 rounded-2xl border border-ochre-200 bg-ochre-50/80 p-4 transition hover:bg-ochre-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ochre-800">
                    <Bell size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-brand-900">{unread} {t(unread === 1 ? 'unread update' : 'unread updates')}</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-600">{t('Open your notifications to catch up.')}</span>
                  </span>
                </Link>
              )}
              <section className="rounded-2xl border border-abaca-200/80 bg-white/95 p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">{t('Quick access')}</p>
                <h2 className="mt-1 font-serif text-xl font-bold text-brand-900">{t('Keep your shop moving')}</h2>
                <div className="mt-4 divide-y divide-stone-100">
                  {[
                    { label: t('Manage creations'), hint: t('Update your craft listings'), href: '/artisan/products', Icon: Package },
                    { label: t('Review orders'), hint: t('Prepare and track purchases'), href: '/artisan/orders', Icon: ClipboardList },
                    { label: t('Plan an experience'), hint: t('Share a workshop or tradition'), href: '/artisan/experiences', Icon: CalendarDays },
                    { label: t('Update your profile'), hint: t('Tell your story to customers'), href: '/artisan/profile', Icon: CircleUserRound },
                  ].map(({ label, hint, href, Icon }) => (
                    <Link key={href} href={href} className="group flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-brand-700 transition group-hover:bg-ochre-100">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-stone-800">{label}</span>
                        <span className="mt-0.5 block text-xs text-stone-500">{hint}</span>
                      </span>
                      <ArrowRight size={15} className="text-stone-300 transition group-hover:translate-x-1 group-hover:text-brand-700" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
              <div className="rounded-2xl border border-brand-900/10 bg-gradient-to-br from-[#fffaf0] to-[#f6ead8] p-5">
                <p className="font-serif text-base font-bold text-brand-900">{t('Made with heritage')}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {t('Every craft and experience helps keep local knowledge and tradition thriving.')}
                </p>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-[1.75rem] border border-abaca-200/80 bg-gradient-to-br from-white via-[#fffaf1] to-[#f2e5d1] px-6 py-7 shadow-sm sm:px-9 sm:py-9">
            <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-ochre-300/50" />
            <div aria-hidden="true" className="absolute -right-5 -top-12 h-44 w-44 rounded-full border border-brand-700/10" />
            <div className="relative max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ochre-800">{t('Artisan workspace')}</p>
              <h1 className="mt-2 font-serif text-3xl font-bold text-brand-900 sm:text-4xl">{t('Welcome')}, {displayName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
                {t('Your account is ready. Complete artisan verification to open your shop and share your craft with the marketplace.')}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-ochre-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-ochre-900">
                {applicationPending && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                {!applicationPending && <ShieldCheck size={14} aria-hidden="true" />}
                {verificationSummary}
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
            <section className="rounded-2xl border border-abaca-200/80 bg-white/95 p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
                  {applicationPending ? <Check size={23} aria-hidden="true" /> : <ShieldCheck size={23} aria-hidden="true" />}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">
                    {applicationPending ? t('Application received') : t('Your next step')}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-brand-900">
                    {applicationPending ? t('Your verification is in review') : t('Verify your artisan account')}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {applicationPending
                      ? t('Your application has been submitted. An administrator will review your identity and craft evidence before your shop tools are unlocked.')
                      : t('Submit your identity documents, a production photo or video, and two distinct product samples to request artisan approval.')}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 rounded-xl bg-canvas/80 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-stone-500">{t('Account')}</p>
                  <p className="mt-1 font-semibold text-stone-800">{t('Registered')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-stone-500">{t('Artisan verification')}</p>
                  <p className="mt-1 font-semibold text-stone-800">
                    {applicationPending ? t('Pending review') : verificationSummary}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn-primary" href="/artisan-verification">
                  {applicationPending ? t('View verification') : t('Continue verification')}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link className="btn-outline" href="/artisan/profile">{t('Edit profile')}</Link>
              </div>
            </section>

            <aside className="rounded-2xl border border-abaca-200/80 bg-white/95 p-6 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">{t('Available now')}</p>
              <h2 className="mt-1 font-serif text-xl font-bold text-brand-900">{t('Your account tools')}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {t('You can update your profile and explore the marketplace while verification is pending.')}
              </p>
              <div className="mt-4 grid gap-2">
                <Link href="/artisan/profile" className="group flex items-center justify-between rounded-xl border border-stone-200 px-3 py-3 text-sm font-semibold text-stone-700 transition hover:border-ochre-300 hover:bg-ochre-50">
                  <span className="flex items-center gap-2"><CircleUserRound size={17} className="text-ochre-800" /> {t('Edit your profile')}</span>
                  <ArrowRight size={15} className="text-stone-400 transition group-hover:translate-x-1" />
                </Link>
                <Link href="/" className="group flex items-center justify-between rounded-xl border border-stone-200 px-3 py-3 text-sm font-semibold text-stone-700 transition hover:border-ochre-300 hover:bg-ochre-50">
                  <span className="flex items-center gap-2"><ShoppingBag size={17} className="text-ochre-800" /> {t('Browse marketplace')}</span>
                  <ArrowRight size={15} className="text-stone-400 transition group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="mt-5 border-t border-stone-100 pt-4">
                <p className="text-xs font-semibold text-stone-700">{t('After approval, you can')}</p>
                <ul className="mt-2 space-y-2 text-xs text-stone-500">
                  {['List and manage creations', 'Receive and fulfill orders', 'Host workshops and experiences'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check size={14} className="mt-0.5 shrink-0 text-ochre-700" aria-hidden="true" /> {t(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
