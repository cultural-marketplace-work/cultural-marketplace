import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listArtisanProducts, listArtisanOrders, listNotifications, getArtisan } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ArtisanDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan/dashboard');

  const profile = await getArtisan(session.id);
  const isVerified = profile?.verification_status === 'approved';
  const [products, orders, notifications] = isVerified
    ? await Promise.all([
        listArtisanProducts(session.id),
        listArtisanOrders(session.id),
        listNotifications(session.id, 'artisan'),
      ])
    : [[], [], []];
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold text-brand-900">Artisan portal</h1>
            <p className="mt-1 text-stone-500">
              {profile?.business_name ?? profile?.name ?? session.name}
              {isVerified && <span className="badge ml-2 bg-ochre-100 text-ochre-900 border border-ochre-300 font-semibold">✔ Verified</span>}
            </p>
          </div>
          {isVerified
            ? <Link className="btn-primary" href="/artisan/products/new">+ Add product</Link>
            : <span className="btn-primary cursor-not-allowed opacity-50" aria-disabled="true" title="Available after artisan verification">+ Add product</span>}
        </div>

        {!isVerified ? (
          <section className="card mt-8 max-w-3xl p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-ochre-800">Artisan account</p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-brand-900">Your account is registered</h2>
            <dl className="mt-5 grid gap-3 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Account Status</dt>
                <dd className="font-semibold text-stone-900">Registered</dd>
              </div>
              <div>
                <dt className="text-stone-500">Artisan Status</dt>
                <dd className="font-semibold text-stone-900">
                  {profile?.verification_status === 'pending' && profile.application_submitted ? 'Verification Pending' : 'Not Verified'}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-6 text-stone-600">
              Complete artisan verification to unlock product, order, workshop, and community management. You can browse the marketplace and update your profile while your account is unverified.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-primary" href="/artisan-verification">Continue verification</Link>
              <Link className="btn-outline" href="/artisan/profile">Edit profile</Link>
              <Link className="btn-outline" href="/">Browse marketplace</Link>
            </div>
            <h3 className="mt-8 font-serif text-lg font-bold text-brand-900">Artisan tools</h3>
            <div className="mt-3 flex flex-wrap gap-3" aria-label="Disabled artisan tools">
              {['Orders', 'Bookings', 'Experiences', 'Reviews', 'Analytics', 'Messages', 'Notifications'].map((label) => (
                <span key={label} className="btn-outline cursor-not-allowed opacity-50" aria-disabled="true" title="Available after artisan verification">
                  {label}
                </span>
              ))}
            </div>
          </section>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <div className="card p-5"><p className="text-sm text-stone-500">Products</p><p className="mt-1 text-3xl font-bold text-brand-700">{products.length}</p></div>
              <div className="card p-5"><p className="text-sm text-stone-500">Pending orders</p><p className="mt-1 text-3xl font-bold text-brand-700">{pendingOrders.length}</p></div>
              <div className="card p-5"><p className="text-sm text-stone-500">Total orders</p><p className="mt-1 text-3xl font-bold text-brand-700">{orders.length}</p></div>
              <div className="card p-5"><p className="text-sm text-stone-500">Notifications</p><p className="mt-1 text-3xl font-bold text-brand-700">{unread}</p></div>
            </div>

            <h2 className="mt-10 font-serif text-2xl font-bold text-brand-900">Recent orders</h2>
            <div className="mt-4 space-y-3">
              {orders.slice(0, 6).map((o) => (
                <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-stone-800">
                      {o.product_name} × {o.quantity}
                      {o.selected_variant ? ` (${o.selected_variant})` : ''}
                    </p>
                    <p className="text-sm text-stone-500">
                      Order #{o.order_id} · {o.customer_name ?? 'Customer'} · {o.order?.payment_method === 'gcash' ? 'GCash' : 'COD'}
                    </p>
                  </div>
                  <span className="badge bg-stone-100 capitalize text-stone-600">{o.status.replace(/_/g, ' ')}</span>
                </div>
              ))}
              {orders.length === 0 && <p className="text-stone-500">No orders yet.</p>}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-outline" href="/artisan/orders">Manage orders</Link>
              <Link className="btn-outline" href="/artisan/bookings">Bookings</Link>
              <Link className="btn-outline" href="/artisan/experiences">Experiences</Link>
              <Link className="btn-outline" href="/artisan/reviews">Reviews</Link>
              <Link className="btn-outline" href="/artisan/analytics">Analytics</Link>
              <Link className="btn-outline" href="/artisan/profile">Profile</Link>
              <Link className="btn-outline" href="/artisan/messages">Messages</Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
