import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { listAddresses } from '@/lib/db';
import AddressesClient from './AddressesClient';

export const dynamic = 'force-dynamic';

export default async function CustomerAddressesPage() {
  const session = await getSession();
  if (!session || session.role !== 'customer') redirect('/auth/login?next=/customer/account/addresses');

  const addresses = await listAddresses(session.id);
  return (
    <main className="min-h-screen bg-[#FCF9F4] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-6 shadow-sm sm:p-8">
          <div aria-hidden="true" className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#F8EEDC] opacity-70" />
          <div aria-hidden="true" className="absolute -right-2 bottom-0 h-24 w-24 rounded-full border-[14px] border-[#F3E5CD] opacity-50" />
          <div className="relative z-10">
            <h1 className="font-serif text-3xl font-bold text-[#3D3028] sm:text-4xl">Address book</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#71675F]">
              Save and manage the addresses you use for your handcrafted orders.
            </p>
          </div>
        </section>
        <AddressesClient
          initial={addresses.map((a) => ({
            id: a.id, label: a.label, full_name: a.full_name, phone: a.phone,
            address: a.address, landmark: a.landmark, is_default: a.is_default,
          }))}
        />
      </div>
    </main>
  );
}
