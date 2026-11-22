
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  Search,
  ShieldAlert,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

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

interface ArtisanSectionProps {
  title: string;
  description: string;
  count: number;
  icon: LucideIcon;
  children: React.ReactNode;
}

const statusStyles: Record<ArtisanStatus | 'registered', string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  suspended: 'border-stone-200 bg-stone-100 text-stone-700',
  registered: 'border-stone-200 bg-stone-100 text-stone-700',
};

function ArtisanSection({ title, description, count, icon: Icon, children }: ArtisanSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-lg font-bold text-brand-900">{title}</h2>
            <p className="mt-0.5 text-sm text-stone-500">{description}</p>
          </div>
        </div>
        <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-canvas px-3 py-1 text-sm font-bold text-brand-800">
          {count}
        </span>
      </div>
      <div className="divide-y divide-stone-100">{children}</div>
    </section>
  );
}

function ArtisanCard({
  artisan,
  busy,
  actions,
}: {
  artisan: ArtisanRow;
  busy: boolean;
  actions: React.ReactNode;
}) {
  const status = artisan.application_submitted ? artisan.verification_status : 'registered';
  const statusLabel = !artisan.application_submitted
    ? 'Verification not submitted'
    : artisan.verification_status === 'pending'
      ? 'Pending review'
      : artisan.verification_status.charAt(0).toUpperCase() + artisan.verification_status.slice(1);

  return (
    <article aria-busy={busy} className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[#fffdf8] sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4b1717] to-[#9E2A2B] font-serif text-lg font-bold text-white">
          {artisan.name.trim().charAt(0).toUpperCase() || <UserRound size={18} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/artisans/${artisan.id}`}
              className="truncate font-semibold text-brand-900 underline-offset-4 hover:text-brand-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700"
            >
              {artisan.name}
            </Link>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}>
              {status === 'approved' ? <CheckCircle2 size={12} aria-hidden="true" /> : null}
              {status === 'pending' ? <Clock3 size={12} aria-hidden="true" /> : null}
              {status === 'rejected' || status === 'suspended' ? <ShieldAlert size={12} aria-hidden="true" /> : null}
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 break-all text-sm text-stone-500">{artisan.email}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
            {artisan.craft_type && <span>{artisan.craft_type}</span>}
            {artisan.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} aria-hidden="true" />
                {artisan.location}
              </span>
            )}
            {artisan.productCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Package size={12} aria-hidden="true" />
                {artisan.productCount} {artisan.productCount === 1 ? 'product' : 'products'}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
    </article>
  );
}

export default function ArtisansClient({ initial }: { initial: ArtisanRow[] }) {
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
  const [query, setQuery] = useState('');

  const registered = artisans.filter((a) => !a.application_submitted);
  const pending = artisans.filter((a) => a.application_submitted && a.verification_status === 'pending');
  const approved = artisans.filter((a) => a.verification_status === 'approved');
  const other = artisans.filter((a) => a.application_submitted && (a.verification_status === 'rejected' || a.verification_status === 'suspended'));
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (artisan: ArtisanRow) => [
    artisan.name,
    artisan.email,
    artisan.craft_type ?? '',
    artisan.location ?? '',
  ].some((value) => value.toLowerCase().includes(normalizedQuery));

  const filteredGroups = {
    registered: registered.filter(matchesQuery),
    pending: pending.filter(matchesQuery),
    approved: approved.filter(matchesQuery),
    other: other.filter(matchesQuery),
  };
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
        setMsg(data.message ?? 'Action failed. Please try again.');
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
      setMsg('Unable to update artisan status. Check your connection and try again.');
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  }

  const profileLinkClass = 'inline-flex min-h-10 items-center justify-center rounded-xl border border-abaca-300 bg-white px-3.5 py-2 text-sm font-semibold text-brand-800 transition hover:border-ochre-400 hover:bg-ochre-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-700';
  const actionClass = 'inline-flex min-h-10 items-center justify-center rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  return (
    <div className="mt-6 space-y-6">
      <section aria-label="Artisan account summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total artisan accounts', value: artisans.length, icon: Users },
          { label: 'Verification not submitted', value: registered.length, icon: UserRound },
          { label: 'Pending applications', value: pending.length, icon: Clock3 },
          { label: 'Approved artisans', value: approved.length, icon: BadgeCheck },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-abaca-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-500">{label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                <Icon size={18} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-brand-900">{value}</p>
          </article>
        ))}
      </section>

      {msg && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="flex-1">{msg}</p>
          <button type="button" onClick={() => setMsg('')} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-red-100">
            <X size={16} aria-hidden="true" />
          </button>
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
      )}

      <section className="rounded-2xl border border-abaca-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
        <label htmlFor="artisan-search" className="mb-2 block text-sm font-semibold text-stone-700">
          Find an artisan
        </label>
        <div className="relative max-w-2xl">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            id="artisan-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, craft, or location"
            className="input w-full rounded-xl !py-3 !pl-10"
          />
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
        <p aria-live="polite" className="mt-2 text-xs text-stone-500">
          {normalizedQuery
            ? `${Object.values(filteredGroups).reduce((total, group) => total + group.length, 0)} matching accounts`
            : `${artisans.length} artisan ${artisans.length === 1 ? 'account' : 'accounts'}`}
        </p>
      </section>

      {artisans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-abaca-300 bg-white/70 px-6 py-12 text-center">
          <Users size={28} className="mx-auto text-ochre-700" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-xl font-bold text-brand-900">No artisan accounts yet</h2>
          <p className="mt-1 text-sm text-stone-500">Artisan accounts will appear here when someone registers.</p>
        </div>
      ) : Object.values(filteredGroups).every((group) => group.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-abaca-300 bg-white/70 px-6 py-12 text-center">
          <Search size={26} className="mx-auto text-ochre-700" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-xl font-bold text-brand-900">No artisan accounts match that search</h2>
          <p className="mt-1 text-sm text-stone-500">Try another name, email, craft, or location.</p>
          <button type="button" onClick={() => setQuery('')} className={`${profileLinkClass} mt-4`}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.registered.length > 0 && (
            <ArtisanSection
              title="Registered accounts"
              description="Accounts that have not submitted artisan verification yet."
              count={filteredGroups.registered.length}
              icon={UserRound}
            >
              {filteredGroups.registered.map((artisan) => (
                <ArtisanCard key={artisan.id} artisan={artisan} busy={busy} actions={
                  <Link href={`/admin/artisans/${artisan.id}`} className={profileLinkClass}>Manage profile</Link>
                } />
              ))}
            </ArtisanSection>
          )}

          {filteredGroups.pending.length > 0 && (
            <ArtisanSection
              title="Pending applications"
              description="Review the artisan’s documents and verification details before deciding."
              count={filteredGroups.pending.length}
              icon={Clock3}
            >
              {filteredGroups.pending.map((artisan) => (
                <ArtisanCard key={artisan.id} artisan={artisan} busy={busy} actions={
                  <>
                    <Link href={`/admin/artisans/${artisan.id}`} className={profileLinkClass}>Review profile</Link>
                    <button
                      type="button"
                      className={`${actionClass} bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700`}
                      disabled={busy}
                      onClick={() => setStatus(artisan.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className={`${actionClass} border border-red-200 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-red-700`}
                      disabled={busy}
                      onClick={() => setStatus(artisan.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </>
                } />
              ))}
            </ArtisanSection>
          )}

          {filteredGroups.approved.length > 0 && (
            <ArtisanSection
              title="Approved artisans"
              description="Active artisan accounts with access to the marketplace tools."
              count={filteredGroups.approved.length}
              icon={CheckCircle2}
            >
              {filteredGroups.approved.map((artisan) => (
                <ArtisanCard key={artisan.id} artisan={artisan} busy={busy} actions={
                  <>
                    <Link href={`/admin/artisans/${artisan.id}`} className={profileLinkClass}>Manage profile</Link>
                    <button
                      type="button"
                      className={`${actionClass} border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 focus-visible:outline-stone-700`}
                      disabled={busy}
                      onClick={() => setStatus(artisan.id, 'suspended')}
                    >
                      Suspend
                    </button>
                  </>
                } />
              ))}
            </ArtisanSection>
          )}

          {filteredGroups.other.length > 0 && (
            <ArtisanSection
              title="Rejected and suspended artisans"
              description="Accounts that need a status change before artisan tools are available."
              count={filteredGroups.other.length}
              icon={ShieldAlert}
            >
              {filteredGroups.other.map((artisan) => (
                <ArtisanCard key={artisan.id} artisan={artisan} busy={busy} actions={
                  <>
                    <Link href={`/admin/artisans/${artisan.id}`} className={profileLinkClass}>Manage profile</Link>
                    <button
                      type="button"
                      className={`${actionClass} bg-brand-800 text-white hover:bg-brand-900 focus-visible:outline-brand-800`}
                      disabled={busy}
                      onClick={() => setStatus(artisan.id, 'approved')}
                    >
                      Restore access
                    </button>
                  </>
                } />
              ))}
            </ArtisanSection>
          )}
        </div>
      )}
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
