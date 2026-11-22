
'use client';

import { useMemo, useState } from 'react';

interface Row {
  id: number;
  reporter: string;
  type: string;
  reported_id: number;
  reported_name: string;
  reason: string;
  status: string;
  action_taken: string | null;
  created: string;
}

type ReportAction =
  | 'investigate'
  | 'resolve'
  | 'warn'
  | 'suspend-listing'
  | 'suspend-account';

type StatusFilter = 'all' | 'pending' | 'investigating' | 'resolved';
type TypeFilter = 'all' | 'product' | 'artisan' | 'experience';

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  investigating: 'bg-blue-50 text-blue-800 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const typeIcon: Record<string, string> = {
  product: '📦',
  artisan: '🧑‍🎨',
  experience: '🧑‍🏫',
};

export default function ReportsClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    investigating: rows.filter((r) => r.status === 'investigating').length,
    resolved: rows.filter((r) => r.status === 'resolved').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchesSearch =
        !query ||
        r.reporter.toLowerCase().includes(query) ||
        r.reported_name.toLowerCase().includes(query) ||
        r.reason.toLowerCase().includes(query) ||
        r.type.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'all' || r.status === statusFilter;

      const matchesType =
        typeFilter === 'all' || r.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rows, search, statusFilter, typeFilter]);

  async function act(id: number, action: ReportAction) {
    const report = rows.find((r) => r.id === id);
    if (!report || busyId !== null) return;

    if (action === 'suspend-listing') {
      const confirmed = window.confirm(
        `Are you sure you want to suspend "${report.reported_name}"?`
      );
      if (!confirmed) return;
    }

    if (action === 'suspend-account') {
      const confirmed = window.confirm(
        `Are you sure you want to suspend the account associated with "${report.reported_name}"?`
      );
      if (!confirmed) return;
    }

    setBusyId(id);
    setMsg('');

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: id, action }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setMsg(data.message ?? 'Unable to complete the action. Please try again.');
        return;
      }

      setRows((current) =>
        current.map((r) => {
          if (r.id !== id) return r;

          if (action === 'investigate') {
            return { ...r, status: 'investigating' };
          }

          if (action === 'resolve') {
            return {
              ...r,
              status: 'resolved',
              action_taken: 'Resolved by admin',
            };
          }

          if (action === 'warn') {
            return {
              ...r,
              status: 'investigating',
              action_taken: 'Warning sent',
            };
          }

          if (action === 'suspend-listing') {
            return {
              ...r,
              status: 'resolved',
              action_taken: 'Listing suspended',
            };
          }

          if (action === 'suspend-account') {
            return {
              ...r,
              status: 'resolved',
              action_taken: 'Account suspended',
            };
          }

          return r;
        })
      );
    } catch {
      setMsg('A network error occurred. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Total reports',
            value: stats.total,
            color: 'text-[#3D3028]',
          },
          {
            label: 'Pending',
            value: stats.pending,
            color: 'text-amber-700',
          },
          {
            label: 'Investigating',
            value: stats.investigating,
            color: 'text-blue-700',
          },
          {
            label: 'Resolved',
            value: stats.resolved,
            color: 'text-emerald-700',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-[#71675F]">
              {item.label}
            </p>
            <p className={`mt-2 text-2xl font-bold ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1">
            <label
              htmlFor="report-search"
              className="mb-1.5 block text-xs font-semibold text-[#71675F]"
            >
              Search reports
            </label>
            <input
              id="report-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reporter, listing, or reason..."
              className="w-full rounded-lg border border-[#D6D0C9] bg-[#FCF9F4] px-3 py-2.5 text-sm text-[#3D3028] outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
            />
          </div>

          <div className="w-full lg:w-48">
            <label
              htmlFor="report-status"
              className="mb-1.5 block text-xs font-semibold text-[#71675F]"
            >
              Status
            </label>
            <select
              id="report-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StatusFilter)
              }
              className="w-full rounded-lg border border-[#D6D0C9] bg-[#FCF9F4] px-3 py-2.5 text-sm text-[#3D3028] outline-none focus:border-[#8B0000]"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="w-full lg:w-48">
            <label
              htmlFor="report-type"
              className="mb-1.5 block text-xs font-semibold text-[#71675F]"
            >
              Report type
            </label>
            <select
              id="report-type"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as TypeFilter)
              }
              className="w-full rounded-lg border border-[#D6D0C9] bg-[#FCF9F4] px-3 py-2.5 text-sm text-[#3D3028] outline-none focus:border-[#8B0000]"
            >
              <option value="all">All types</option>
              <option value="product">Product</option>
              <option value="artisan">Artisan</option>
              <option value="experience">Experience</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8DCCB] pt-3">
          <p className="text-xs text-[#71675F]">
            Showing <strong>{filteredRows.length}</strong> of{' '}
            <strong>{rows.length}</strong> reports
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-[#8B0000] hover:underline"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Error message */}
      {msg && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {msg}
        </div>
      )}

      {/* Report cards */}
      <div className="space-y-4">
        {filteredRows.map((r) => (
          <article
            key={r.id}
            className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">
                    {typeIcon[r.type] ?? '📋'}
                  </span>
                  <h2 className="break-words font-semibold text-[#3D3028]">
                    {r.reported_name}
                  </h2>
                  <span className="rounded-full border border-[#E8DCCB] bg-[#FCF9F4] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#71675F]">
                    {r.type}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[#71675F]">
                  Report #{r.id} · Reported by {r.reporter}
                </p>
                <p className="mt-1 text-xs text-[#9A8F85]">
                  {r.created}
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                  statusStyle[r.status] ??
                  'border-[#D6D0C9] bg-[#F5F2ED] text-[#71675F]'
                }`}
              >
                {r.status}
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-[#E8DCCB] bg-[#FCF9F4] p-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8B0000]">
                Report reason
              </p>
              <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[#3D3028]">
                {r.reason}
              </p>
            </div>

            {r.action_taken && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#F5F2ED] px-3 py-2.5">
                <span className="text-sm">✓</span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#71675F]">
                    Action taken
                  </p>
                  <p className="mt-0.5 text-sm text-[#3D3028]">
                    {r.action_taken}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E8DCCB] pt-4">
              {r.status === 'pending' && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => act(r.id, 'investigate')}
                  className="rounded-lg border border-[#D6D0C9] px-3 py-2 text-xs font-semibold text-[#3D3028] transition hover:bg-[#F5F2ED] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === r.id ? 'Processing...' : 'Investigate'}
                </button>
              )}

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => act(r.id, 'warn')}
                className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send warning
              </button>

              {r.type === 'product' && r.status !== 'resolved' && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => act(r.id, 'suspend-listing')}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Suspend listing
                </button>
              )}

              {r.type === 'artisan' && r.status !== 'resolved' && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => act(r.id, 'suspend-account')}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Suspend account
                </button>
              )}

              {r.status !== 'resolved' && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => act(r.id, 'resolve')}
                  className="rounded-lg bg-[#8B0000] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Resolve report
                </button>
              )}
            </div>
          </article>
        ))}

        {filteredRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#D6D0C9] bg-white px-4 py-12 text-center">
            <p className="text-3xl">📋</p>
            <p className="mt-3 font-semibold text-[#3D3028]">
              No reports found
            </p>
            <p className="mt-1 text-sm text-[#71675F]">
              Try changing your search or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
