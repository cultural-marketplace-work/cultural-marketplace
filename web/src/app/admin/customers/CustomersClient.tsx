
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  order_count: number;
  status: string;
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

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setMsg(data.message ?? 'Action failed.');
        return;
      }

      if (action === 'delete') {
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

      router.refresh();
    } catch {
      setMsg('Unable to complete the action. Please try again.');
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

  return (
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
