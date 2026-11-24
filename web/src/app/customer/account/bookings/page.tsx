import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUser, listCustomerBookings } from '@/lib/db';
import CustomerBookingsClient from './CustomerBookingsClient';

export const dynamic = 'force-dynamic';

export default async function CustomerBookingsPage() {
  const session = await getSession();
  if (!session || session.role !== 'customer') redirect('/auth/login?next=/customer/account/bookings');

  const [bookings, user] = await Promise.all([
    listCustomerBookings(session.id),
    getUser(session.id),
  ]);

  return (
    <main className="min-h-screen bg-[#FCF9F4] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-6 shadow-sm sm:p-8">
          <div aria-hidden="true" className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#F8EEDC] opacity-70" />
          <div aria-hidden="true" className="absolute -right-2 bottom-0 h-24 w-24 rounded-full border-[14px] border-[#F3E5CD] opacity-50" />
          <div className="relative z-10">
            <h1 className="mt-3 font-serif text-3xl font-bold text-[#3D3028] sm:text-4xl">
              My Workshops &amp; Experiences
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#71675F]">
              Your admission tickets, scheduled sessions, and live venue navigation for in-person heritage workshops.
            </p>
          </div>
        </section>

        <CustomerBookingsClient initial={bookings} customerName={user?.name || session.name} />
      </div>
    </main>
  );
}
