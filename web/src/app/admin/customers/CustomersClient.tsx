'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  MapPin,
  Mail,
  Package,
  PencilLine,
  Phone,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';

interface Row {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  order_count: number;
  status: string;
}

type CustomerAction = 'update' | 'toggle' | 'delete';
type EditableFields = Pick<Row, 'name' | 'email' | 'phone' | 'location'>;

const buttonBase = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export default function CustomersClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [warning, setWarning] = useState('');
  const [query, setQuery] = useState('');

  async function act(action: CustomerAction, id: number, fields?: Partial<EditableFields>) {
    setBusy(true);
    setMsg('');
    setWarning('');
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, ...fields }),
      });
      const data = await res.json() as { status?: string; message?: string; warning?: string };
      if (!res.ok || data.status !== 'success') {
        setMsg(data.message ?? 'Could not complete the action. Please try again.');
        return;
      }

      if (action === 'delete') {
        setRows((current) => current.filter((row) => row.id !== id));
        setWarning(data.warning ?? '');
      } else if (action === 'toggle') {
        setRows((current) => current.map((row) => (
          row.id === id
            ? { ...row, status: row.status === 'active' ? 'disabled' : 'active' }
            : row
        )));
      } else if (action === 'update' && fields) {
        setRows((current) => current.map((row) => (row.id === id ? { ...row, ...fields } : row)));
        setEditing(null);
      }

      if (action !== 'delete') router.refresh();
    } catch {
      setMsg('Unable to complete the action. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((customer) => [
    customer.id,
    customer.name,
    customer.email,
    customer.phone ?? '',
    customer.location ?? '',
  ].some((value) => String(value).toLowerCase().includes(normalizedQuery)));

  const activeCount = rows.filter((customer) => customer.status === 'active').length;
  const disabledCount = rows.filter((customer) => customer.status === 'disabled').length;
  const orderCount = rows.reduce((total, customer) => total + customer.order_count, 0);

  return (
    <div className="mt-6 space-y-5">
      <section aria-label="Customer account summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total customers', value: rows.length, icon: UsersRound },
          { label: 'Active accounts', value: activeCount, icon: CheckCircle2 },
          { label: 'Disabled accounts', value: disabledCount, icon: Ban },
          { label: 'Orders placed', value: orderCount, icon: ShoppingBag },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-abaca-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-500">{label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                <Icon size={18} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-brand-900">{value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      {msg && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-900">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="flex-1">{msg}</p>
          <button type="button" onClick={() => setMsg('')} aria-label="Dismiss error" className="rounded p-0.5 hover:bg-crimson-100">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {warning && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="flex-1">{warning}</p>
          <button type="button" onClick={() => setWarning('')} aria-label="Dismiss notice" className="rounded p-0.5 hover:bg-amber-100">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-abaca-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
        <label htmlFor="customer-search" className="mb-2 block text-sm font-semibold text-stone-700">
          Find a customer
        </label>
        <div className="relative max-w-2xl">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            id="customer-search"
            type="search"
            className="input w-full rounded-xl !py-3 !pl-10"
            placeholder="Search by name, email, phone, location, or customer ID"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p aria-live="polite" className="mt-2 text-xs text-stone-500">
          {normalizedQuery
            ? `${filteredRows.length} matching ${filteredRows.length === 1 ? 'customer' : 'customers'}`
            : `Showing ${rows.length} ${rows.length === 1 ? 'customer account' : 'customer accounts'}`}
        </p>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-abaca-300 bg-white/70 px-6 py-12 text-center">
          <UsersRound size={28} className="mx-auto text-ochre-700" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-xl font-bold text-brand-900">No customer accounts yet</h2>
          <p className="mt-1 text-sm text-stone-500">Customer accounts will appear here when someone registers.</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-abaca-300 bg-white/70 px-6 py-12 text-center">
          <Search size={26} className="mx-auto text-ochre-700" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-xl font-bold text-brand-900">No customers match that search</h2>
          <p className="mt-1 text-sm text-stone-500">Try a different name, email, phone number, location, or customer ID.</p>
          <button type="button" onClick={() => setQuery('')} className={`${buttonBase} mt-4 border border-abaca-300 bg-white text-brand-800 hover:bg-ochre-50 focus-visible:outline-ochre-700`}>
            Clear search
          </button>
        </div>
      ) : (
        <section aria-label="Customer accounts" className="space-y-3">
          {filteredRows.map((customer) => {
            const isEditing = editing?.id === customer.id;
            const isDisabled = customer.status === 'disabled';
            return (
              <article
                key={customer.id}
                aria-busy={busy}
                className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm transition hover:border-abaca-300 hover:shadow-md"
              >
                {isEditing && editing ? (
                  <form
                    className="p-5 sm:p-6"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void act('update', customer.id, {
                        name: editing.name,
                        email: editing.email,
                        phone: editing.phone ?? '',
                        location: editing.location ?? '',
                      });
                    }}
                  >
                    <div className="mb-5 flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                        <PencilLine size={18} aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="font-serif text-lg font-bold text-brand-900">Edit customer details</h2>
                        <p className="mt-0.5 text-sm text-stone-500">Update contact information. Order history will remain unchanged.</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-stone-700">Name</span>
                        <input
                          className="input w-full rounded-xl"
                          maxLength={100}
                          autoComplete="name"
                          required
                          value={editing.name}
                          onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-stone-700">Email</span>
                        <input
                          className="input w-full rounded-xl"
                          type="email"
                          maxLength={100}
                          autoComplete="email"
                          required
                          value={editing.email}
                          onChange={(event) => setEditing({ ...editing, email: event.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-stone-700">Phone</span>
                        <input
                          className="input w-full rounded-xl"
                          type="tel"
                          maxLength={30}
                          autoComplete="tel"
                          value={editing.phone ?? ''}
                          onChange={(event) => setEditing({ ...editing, phone: event.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-stone-700">Location</span>
                        <input
                          className="input w-full rounded-xl"
                          maxLength={100}
                          autoComplete="address-level2"
                          value={editing.location ?? ''}
                          onChange={(event) => setEditing({ ...editing, location: event.target.value })}
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                      <button
                        type="submit"
                        className={`${buttonBase} bg-crimson-700 text-white hover:bg-crimson-800 focus-visible:outline-crimson-700`}
                        disabled={busy}
                      >
                        {busy ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        className={`${buttonBase} border border-abaca-300 bg-white text-stone-700 hover:bg-canvas focus-visible:outline-ochre-700`}
                        disabled={busy}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4b1717] to-[#9E2A2B] font-serif text-xl font-bold text-white">
                        {customer.name.trim().charAt(0).toUpperCase() || <UserRound size={19} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate font-semibold text-brand-900">{customer.name}</h2>
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            isDisabled
                              ? 'border-crimson-200 bg-crimson-50 text-crimson-800'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          }`}>
                            {isDisabled ? <Ban size={12} aria-hidden="true" /> : <CheckCircle2 size={12} aria-hidden="true" />}
                            {isDisabled ? 'Disabled' : 'Active'}
                          </span>
                          <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-medium text-stone-600">
                            ID #{customer.id}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5 text-sm text-stone-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Mail size={14} className="shrink-0 text-ochre-800" aria-hidden="true" />
                            <span className="break-all">{customer.email}</span>
                          </span>
                          {customer.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone size={14} className="shrink-0 text-ochre-800" aria-hidden="true" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={14} className="shrink-0 text-ochre-800" aria-hidden="true" />
                              {customer.location}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
                          <Package size={14} className="text-ochre-800" aria-hidden="true" />
                          {customer.order_count} {customer.order_count === 1 ? 'order' : 'orders'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                      <button
                        type="button"
                        className={`${buttonBase} border border-abaca-300 bg-white text-brand-800 hover:border-ochre-400 hover:bg-ochre-50 focus-visible:outline-ochre-700`}
                        disabled={busy}
                        onClick={() => setEditing({ ...customer })}
                      >
                        <PencilLine size={15} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${buttonBase} border border-abaca-300 bg-white text-stone-700 hover:bg-canvas focus-visible:outline-ochre-700`}
                        disabled={busy}
                        onClick={() => void act('toggle', customer.id)}
                      >
                        {isDisabled
                          ? <><CheckCircle2 size={15} aria-hidden="true" /> Enable</>
                          : <><Ban size={15} aria-hidden="true" /> Disable</>}
                      </button>
                      <button
                        type="button"
                        className={`${buttonBase} border border-crimson-200 bg-white text-crimson-700 hover:bg-crimson-50 focus-visible:outline-crimson-700`}
                        disabled={busy}
                        onClick={() => {
                          const confirmed = confirm(
                            `Delete ${customer.name}'s account and personal data? Order and sales records will remain anonymized for history. This cannot be undone.`,
                          );
                          if (confirmed) void act('delete', customer.id);
                        }}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
