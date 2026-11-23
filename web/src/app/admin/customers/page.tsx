
import { listCustomers } from '@/lib/db';
import CustomersClient from './CustomersClient';
import { UsersRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const customers = await listCustomers();

  return (
    <div className="mx-auto max-w-7xl font-sans">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-9">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.12]"
          style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
        />
        <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ochre-200">
              <UsersRound size={15} aria-hidden="true" />
              Community directory
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">Customers</h1>
            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Manage customer accounts and keep contact details and order history easy to review.
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-ochre-100">
            {customers.length} {customers.length === 1 ? 'customer account' : 'customer accounts'}
          </div>
        </div>
      </header>
    <div className="min-w-0">


      <CustomersClient
  initial={customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    location: c.location,
    profile_picture: c.profile_picture,
    order_count: c.order_count,
    status: c.status,
  }))}
      />
    </div>
    </div>
  );
}
