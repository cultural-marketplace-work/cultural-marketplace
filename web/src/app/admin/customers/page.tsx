
import { listCustomers } from '@/lib/db';
import CustomersClient from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const customers = await listCustomers();

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-1">
        <h1 className="font-sculpted text-2xl font-bold text-charcoal-900">
          Customer Management
        </h1>
        <p className="text-sm text-stone-500">
          Manage customer accounts, review their order activity, and maintain
          customer information.
        </p>
      </div>

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
  );
}
