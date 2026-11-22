
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ArtisanStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

type ArtisanDisplayStatus = ArtisanStatus | 'not_submitted';

type FilterStatus = 'all' | ArtisanDisplayStatus;

interface ArtisanRow {
  id: number;
  name: string;
  email: string;
  craft_type: string | null;
  location: string | null;
  verification_status: ArtisanStatus;
  application_submitted: boolean;
  productCount: number;
}

const statusStyles: Record<ArtisanDisplayStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  suspended: 'bg-stone-100 text-stone-700 ring-stone-200',
  not_submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
};

function getStatus(a: ArtisanRow): ArtisanDisplayStatus {
  return a.application_submitted
    ? a.verification_status
    : 'not_submitted';
}

export default function ArtisansClient({
  initial,
}: {
  initial: ArtisanRow[];
}) {
  const router = useRouter();

  const [artisans, setArtisans] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  const registered = artisans.filter(
    (a) => !a.application_submitted
  );

  const pending = artisans.filter(
    (a) =>
      a.application_submitted &&
      a.verification_status === 'pending'
  );

  const approved = artisans.filter(
    (a) => a.verification_status === 'approved'
  );

  const rejected = artisans.filter(
    (a) =>
      a.application_submitted &&
      a.verification_status === 'rejected'
  );

  const suspended = artisans.filter(
    (a) =>
      a.application_submitted &&
      a.verification_status === 'suspended'
  );

  const filteredArtisans = useMemo(() => {
    const term = search.trim().toLowerCase();

    return artisans.filter((a) => {
      const matchesSearch =
        !term ||
        [
          a.name,
          a.email,
          a.craft_type ?? '',
          a.location ?? '',
        ].some((value) => value.toLowerCase().includes(term));

      const matchesFilter =
        filter === 'all' || getStatus(a) === filter;

      return matchesSearch && matchesFilter;
    });
  }, [artisans, search, filter]);

  async function setStatus(id: number, status: ArtisanStatus) {
    setBusy(true);
    setBusyId(id);
    setMsg('');

    try {
      const res = await fetch('/api/admin/artisan-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artisan_id: id,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'success') {
        setMsg(data.message ?? 'Unable to update artisan status.');
        return;
      }

      setArtisans((list) =>
        list.map((a) =>
          a.id === id
            ? { ...a, verification_status: status }
            : a
        )
      );

      router.refresh();
    } catch {
      setMsg('Unable to update artisan status. Please try again.');
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  }

  function ArtisanCard({ artisan }: { artisan: ArtisanRow }) {
    const status = getStatus(artisan);
    const statusStyle = statusStyles[status];

    const isPending = status === 'pending';
    const isApproved = status === 'approved';
    const isRestricted =
      status === 'rejected' || status === 'suspended';

    return (
      <article className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/artisans/${artisan.id}`}
                className="break-words font-semibold text-stone-800 transition hover:text-brand-700 hover:underline"
              >
                {artisan.name}
              </Link>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyle}`}
              >
                {status === 'not_submitted'
                  ? 'Not verified'
                  : status}
              </span>
            </div>

            <p className="mt-1 break-all text-sm text-stone-500">
              {artisan.email}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500 sm:text-sm">
              <span>
                <span className="font-medium text-stone-700">
                  Craft:
                </span>{' '}
                {artisan.craft_type || 'Not specified'}
              </span>

              <span>
                <span className="font-medium text-stone-700">
                  Location:
                </span>{' '}
                {artisan.location || 'Not specified'}
              </span>

              <span>
                <span className="font-medium text-stone-700">
                  Products:
                </span>{' '}
                {artisan.productCount}
              </span>
            </div>

            {isPending && (
              <p className="mt-3 text-xs font-medium text-amber-700">
                This application is awaiting verification review.
              </p>
            )}

            {status === 'not_submitted' && (
              <p className="mt-3 text-xs text-blue-700">
                The artisan has registered but has not submitted a
                verification application.
              </p>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[150px] sm:flex sm:flex-wrap sm:justify-end">
            <Link
              href={`/admin/artisans/${artisan.id}`}
              className="btn-outline flex min-h-10 items-center justify-center px-3 py-2 text-center text-xs font-semibold sm:flex-none"
            >
              Manage profile
            </Link>

            {isPending && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus(artisan.id, 'approved')}
                  className="btn-primary min-h-10 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === artisan.id ? 'Updating...' : 'Approve'}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus(artisan.id, 'rejected')}
                  className="btn-danger min-h-10 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}

            {isApproved && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus(artisan.id, 'suspended')}
                className="btn-outline min-h-10 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suspend
              </button>
            )}

            {isRestricted && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setStatus(artisan.id, 'approved')}
                className="btn-primary min-h-10 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                Restore
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="mt-6 min-w-0 space-y-6 pb-8">
      {/* Page introduction */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              Administration
            </p>

            <h2 className="mt-1 font-serif text-xl font-bold text-brand-900 sm:text-2xl">
              Artisan Management
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-stone-500">
              Manage artisan accounts, review verification applications,
              and monitor registered cultural craft providers.
            </p>
          </div>

          <div className="rounded-xl bg-brand-50 px-4 py-3 sm:min-w-[125px]">
            <p className="text-xs font-medium text-brand-700">
              Total artisans
            </p>

            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-900">
              {artisans.length}
            </p>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-stone-500 sm:text-sm">
              Not submitted
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          </div>

          <p className="mt-2 text-2xl font-bold tabular-nums text-stone-800">
            {registered.length}
          </p>

          <p className="mt-1 text-xs text-stone-400">
            Registered accounts
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-stone-500 sm:text-sm">
              Pending
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          </div>

          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-700">
            {pending.length}
          </p>

          <p className="mt-1 text-xs text-stone-400">
            Awaiting review
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-stone-500 sm:text-sm">
              Approved
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>

          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700">
            {approved.length}
          </p>

          <p className="mt-1 text-xs text-stone-400">
            Verified artisans
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-stone-500 sm:text-sm">
              Restricted
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          </div>

          <p className="mt-2 text-2xl font-bold tabular-nums text-stone-700">
            {rejected.length + suspended.length}
          </p>

          <p className="mt-1 text-xs text-stone-400">
            Rejected or suspended
          </p>
        </div>
      </section>

      {/* Search and filters */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="artisan-search"
              className="mb-1.5 block text-xs font-semibold text-stone-600"
            >
              Search artisans
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              </span>

              <input
                id="artisan-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, craft, or location..."
                className="min-h-11 w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="sm:w-56">
            <label
              htmlFor="artisan-filter"
              className="mb-1.5 block text-xs font-semibold text-stone-600"
            >
              Verification status
            </label>

            <select
              id="artisan-filter"
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as FilterStatus)
              }
              className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            >
              <option value="all">All artisans</option>
              <option value="not_submitted">Not submitted</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <p className="text-xs text-stone-500">
            Showing{' '}
            <span className="font-semibold text-stone-700">
              {filteredArtisans.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-stone-700">
              {artisans.length}
            </span>{' '}
            artisans
          </p>

          {(search || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Error message */}
      {msg && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span className="font-bold">!</span>
          <p>{msg}</p>
        </div>
      )}

      {/* Artisan list */}
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg font-bold text-brand-900">
              Artisan accounts
            </h3>

            <p className="mt-0.5 text-xs text-stone-500">
              Select an artisan to view and manage their profile.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {filteredArtisans.map((artisan) => (
            <ArtisanCard key={artisan.id} artisan={artisan} />
          ))}
        </div>

        {filteredArtisans.length === 0 && (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </div>

            <h4 className="mt-3 font-semibold text-stone-800">
              No artisans found
            </h4>

            <p className="mt-1 text-sm text-stone-500">
              Try another search term or change the verification filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              className="mt-4 text-sm font-semibold text-brand-700 hover:underline"
            >
              Clear search and filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
