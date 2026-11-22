
'use client';

import { useMemo, useState } from 'react';
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
  profile_picture: string | null;
}

type FilterStatus = 'all' | 'active' | 'disabled';

export default function CustomersClient({ initial }: { initial: Row[] }) {
  const router = useRouter();

  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [warning, setWarning] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    disabled: rows.filter((r) => r.status === 'disabled').length,
    orders: rows.reduce((sum, r) => sum + Number(r.order_count || 0), 0),
  }), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((customer) => {
      const matchesStatus =
        filter === 'all' || customer.status === filter;

      const matchesSearch = [
        customer.id,
        customer.name,
        customer.email,
        customer.phone ?? '',
        customer.location ?? '',
      ].some((value) =>
        String(value).toLowerCase().includes(normalizedQuery)
      );

  async function act(action: CustomerAction, id: number, fields?: Partial<EditableFields>) {
      return matchesStatus && matchesSearch;
    });
  }, [rows, query, filter]);

  async function act(
    action: string,
    id: number,
    fields?: Record<string, string>
  ) {
    setBusy(true);
    setBusyId(id);
    setMsg('');
    setWarning('');

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, ...fields }),
      });
      const data = await res.json() as { status?: string; message?: string; warning?: string };

      const data = await res.json();

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
        setRows((current) => current.filter((r) => r.id !== id));
        setEditing(null);
        setWarning(data.warning ?? 'Customer account was processed successfully.');
      }

      if (action === 'toggle') {
        setRows((current) =>
          current.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: r.status === 'active' ? 'disabled' : 'active',
                }
              : r
          )
        );
      }

      if (action === 'update') {
        setRows((current) =>
          current.map((r) =>
            r.id === id ? { ...r, ...fields } : r
          )
        );
        setEditing(null);
        setMsg('Customer information updated successfully.');
      }

      if (action !== 'delete') router.refresh();
      router.refresh();
    } catch {
      setMsg('Unable to complete the action. Check your connection and try again.');
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  }

  function startEditing(customer: Row) {
    setMsg('');
    setWarning('');
    setEditing({ ...customer });
  }

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
    <div className="mt-6 space-y-6">

      {/* Feedback */}
      {msg && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>!</span>
          <p>{msg}</p>
        </div>
      )}

      {warning && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>!</span>
          <p>{warning}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Total customers"
          value={stats.total}
          icon="👥"
          description="Registered accounts"
        />
        <StatCard
          label="Active customers"
          value={stats.active}
          icon="✓"
          description="Enabled accounts"
        />
        <StatCard
          label="Disabled customers"
          value={stats.disabled}
          icon="⊘"
          description="Restricted accounts"
        />
        <StatCard
          label="Total orders"
          value={stats.orders}
          icon="▤"
          description="Orders associated with customers"
        />
      </div>

      {/* Search and filters */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-stone-800">
              Customer directory
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Search and manage registered customer accounts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-0 sm:w-72">
              <span className="sr-only">Search customers</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                ⌕
              </span>
              <input
                type="search"
                className="input w-full pl-9"
                placeholder="Search customers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <select
              className="input w-full sm:w-40"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterStatus)}
              aria-label="Filter customers by status"
            >
              <option value="all">All customers</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <p className="text-xs text-stone-500">
            Showing <strong className="text-stone-700">{filteredRows.length}</strong> of{' '}
            <strong className="text-stone-700">{rows.length}</strong> customers
          </p>

          {(query || filter !== 'all') && (
            <button
              type="button"
              className="text-xs font-semibold text-brand-800 hover:underline"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Customer list */}
      <section className="space-y-3">
        {filteredRows.map((customer) => (
          <article
            key={customer.id}
            className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 sm:p-5"
          >
            {editing?.id === customer.id ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-stone-800">
                      Edit customer
                    </h3>
                    <p className="text-xs text-stone-500">
                      Customer ID: #{customer.id}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Editing
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <EditField
                    label="Full name"
                    value={editing.name}
                    onChange={(value) =>
                      setEditing({ ...editing, name: value })
                    }
                    maxLength={100}
                  />
                  <EditField
                    label="Email address"
                    type="email"
                    value={editing.email}
                    onChange={(value) =>
                      setEditing({ ...editing, email: value })
                    }
                    maxLength={100}
                  />
                  <EditField
                    label="Phone number"
                    value={editing.phone ?? ''}
                    onChange={(value) =>
                      setEditing({ ...editing, phone: value })
                    }
                    maxLength={30}
                  />
                  <EditField
                    label="Location"
                    value={editing.location ?? ''}
                    onChange={(value) =>
                      setEditing({ ...editing, location: value })
                    }
                    maxLength={100}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-3">
                  <button
                    type="button"
                    className="btn-outline px-4 py-2 text-sm"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary px-4 py-2 text-sm"
                    disabled={busy || !editing.name.trim() || !editing.email.trim()}
                    onClick={() =>
                      act('update', customer.id, {
                        name: editing.name.trim(),
                        email: editing.email.trim(),
                        phone: editing.phone ?? '',
                        location: editing.location ?? '',
                      })
                    }
                  >
                    {busy && busyId === customer.id ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
  {/* Customer information */}
  <div className="flex min-w-0 items-start gap-3">
    {customer.profile_picture ? (
      <img
        src={customer.profile_picture}
        alt={`${customer.name}'s profile`}
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
    ) : (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-900">
        {customer.name.trim().charAt(0).toUpperCase() || '?'}
      </div>
    )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-semibold text-stone-800">
                        {customer.name}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          customer.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {customer.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <p className="mt-1 break-all text-sm text-stone-500">
                      {customer.email}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                      <span>Customer #{customer.id}</span>
                      <span>{customer.phone || 'No phone number'}</span>
                      <span>{customer.location || 'No location'}</span>
                    </div>
                  </div>
                </div>

                {/* Order count and actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3 lg:justify-end lg:border-0 lg:pt-0">
                  <div className="min-w-24">
                    <p className="text-lg font-bold tabular-nums text-stone-800">
                      {customer.order_count}
                    </p>
                    <p className="text-xs text-stone-500">
                      {customer.order_count === 1 ? 'Order' : 'Orders'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-outline px-3 py-2 text-xs"
                      disabled={busy}
                      onClick={() => startEditing(customer)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn-outline px-3 py-2 text-xs"
                      disabled={busy}
                      onClick={() => act('toggle', customer.id)}
                    >
                      {busy && busyId === customer.id
                        ? 'Please wait...'
                        : customer.status === 'active'
                          ? 'Disable'
                          : 'Enable'}
                    </button>

                    <button
                      type="button"
                      className="btn-danger px-3 py-2 text-xs"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            `Delete ${customer.name}'s account and personal data? Historical order and sales records will be retained according to the existing deletion process. This action cannot be undone.`
                          )
                        ) {
                          act('delete', customer.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>
        ))}

        {/* Empty states */}
        {filteredRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
            <div className="text-3xl text-stone-300">♙</div>
            <h3 className="mt-3 font-semibold text-stone-700">
              {rows.length === 0
                ? 'No customers yet'
                : 'No matching customers'}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {rows.length === 0
                ? 'Registered customer accounts will appear here.'
                : 'Try another search term or change the status filter.'}
            </p>
            {rows.length > 0 && (
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-brand-800 hover:underline"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Reset search and filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-stone-500 sm:text-sm">
          {label}
        </p>
        <span className="text-lg text-brand-800">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-stone-900">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-stone-400">{description}</p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength: number;
}) {
  return (
    <label className="block min-w-0 space-y-1 text-sm text-stone-600">
      <span>{label}</span>
      <input
        className="input w-full"
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
