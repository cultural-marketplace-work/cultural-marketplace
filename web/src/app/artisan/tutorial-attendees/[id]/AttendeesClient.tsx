'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  Ticket,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';

interface Row {
  order_item_id: number;
  customer: string;
  attendee: string | null;
  attendee_for?: string | null;
  ticket: string | null;
  status: string;
  session_date: string | null;
  session_start: string | null;
  session_end: string | null;
}

type Filter = 'all' | 'pending' | 'attended' | 'no_show';

export default function AttendeesClient({
  initial,
  sessionLabel,
}: {
  initial: Row[];
  sessionLabel: string | null;
}) {
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((row) => row.status === 'pending' || row.status === 'confirmed').length,
    attended: rows.filter((row) => row.status === 'attended').length,
    no_show: rows.filter((row) => row.status === 'no_show').length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter = filter === 'all'
        || (filter === 'pending' && ['pending', 'confirmed'].includes(row.status))
        || row.status === filter;
      const matchesQuery = !normalizedQuery
        || [row.customer, row.attendee ?? '', row.ticket ?? '', row.session_date ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, rows]);

  function formatSessionDate(value: string) {
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  async function mark(orderItemId: number, present: boolean) {
    setBusyId(orderItemId);
    setError('');
    try {
      const response = await fetch('/api/artisan/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_item_id: orderItemId, present }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message ?? 'Attendance could not be updated. Please try again.');
      }
      setRows((currentRows) => currentRows.map((row) => (
        row.order_item_id === orderItemId
          ? { ...row, status: present ? 'attended' : 'no_show' }
          : row
      )));
    } catch (cause) {
      console.error('[artisan-attendees] failed to update attendance:', cause);
      setError(cause instanceof Error ? cause.message : 'Attendance could not be updated. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: 'All learners', count: counts.all },
    { key: 'pending', label: 'Awaiting check-in', count: counts.pending },
    { key: 'attended', label: 'Present', count: counts.attended },
    { key: 'no_show', label: 'Absent', count: counts.no_show },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="Attendance summary" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Registered learners', value: counts.all, note: sessionLabel ? 'For this session' : 'For this workshop', Icon: Users },
          { label: 'Checked in', value: counts.attended, note: 'Marked present', Icon: CheckCircle2 },
          { label: 'Awaiting check-in', value: counts.pending, note: 'Still to welcome', Icon: Clock3 },
        ].map(({ label, value, note, Icon }) => (
          <div key={label} className="rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="font-serif text-3xl font-bold text-brand-900">{value}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-stone-800">{label}</p>
            <p className="mt-1 text-xs text-stone-500">{note}</p>
          </div>
        ))}
      </section>

      <section aria-label="Learner roster" className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-brand-900">Learner roster</h2>
              <p className="mt-1 text-xs text-stone-500">
                {sessionLabel && <>{sessionLabel} · </>}
                {filteredRows.length} {filteredRows.length === 1 ? 'learner' : 'learners'} shown
              </p>
            </div>
            <label className="relative block w-full sm:max-w-sm">
              <span className="sr-only">Search learners</span>
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                className="input min-h-11 pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search learner or ticket"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter learners by attendance">
            {filters.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${filter === key ? 'border-brand-700 bg-brand-700 text-white' : 'border-abaca-200 bg-white text-stone-600 hover:bg-canvas'}`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === key ? 'bg-white/15' : 'bg-canvas'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle size={16} aria-hidden="true" />
            {error}
          </p>
        )}

        {filteredRows.map((row) => {
          const attended = row.status === 'attended';
          const noShow = row.status === 'no_show';
          return (
            <article key={row.order_item_id} className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5 ${attended ? 'border-green-200 bg-green-50/40' : noShow ? 'border-stone-200 bg-canvas/70' : 'border-abaca-200/80 bg-white/95'}`}>
              <div className="flex min-w-0 items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${attended ? 'bg-green-100 text-green-800' : 'bg-ochre-50 text-ochre-800'}`}>
                  <UserRound size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-brand-900">{row.attendee ?? row.customer}</h3>
                    {row.attendee_for === 'others' && (
                      <span className="badge border border-ochre-300 bg-ochre-100 text-[10px] text-ochre-900">Guest / group</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    Booked by <span className="font-medium text-stone-700">{row.customer}</span>
                  </p>
                  <p className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-stone-600">
                    <CalendarDays size={14} aria-hidden="true" className="text-ochre-800" />
                    <span>
                      {row.session_date ? formatSessionDate(row.session_date) : 'Session date not recorded'}
                      {row.session_start && ` · ${row.session_start}`}
                      {row.session_end && `–${row.session_end}`}
                    </span>
                  </p>
                  {row.ticket && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-abaca-200 bg-canvas px-2.5 py-1 font-mono text-xs font-bold text-brand-800">
                      <Ticket size={13} aria-hidden="true" />
                      {row.ticket}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-abaca-100 pt-3 sm:border-0 sm:pt-0">
                <span className={`badge border capitalize ${attended ? 'border-green-200 bg-green-100 text-green-800' : noShow ? 'border-stone-200 bg-stone-100 text-stone-700' : 'border-ochre-300 bg-ochre-100 text-ochre-900'}`}>
                  {attended ? 'Present' : noShow ? 'Absent' : row.status.replace(/_/g, ' ')}
                </span>
                {!attended && (
                  <button
                    type="button"
                    className="btn-primary min-h-10 px-3 text-xs"
                    disabled={busyId === row.order_item_id}
                    onClick={() => void mark(row.order_item_id, true)}
                  >
                    <CheckCircle2 size={15} aria-hidden="true" />
                    {busyId === row.order_item_id ? 'Saving…' : 'Mark present'}
                  </button>
                )}
                {!noShow && (
                  <button
                    type="button"
                    className="btn-outline min-h-10 px-3 text-xs"
                    disabled={busyId === row.order_item_id}
                    onClick={() => void mark(row.order_item_id, false)}
                  >
                    <XCircle size={15} aria-hidden="true" />
                    {busyId === row.order_item_id ? 'Saving…' : 'Mark absent'}
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-12 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <Users size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-900">
              {sessionLabel ? 'No learners booked for this session yet' : 'No learners booked yet'}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {sessionLabel ? 'Bookings for this session will appear here when learners reserve a place.' : 'Workshop bookings will appear here when learners reserve a place.'}
            </p>
          </div>
        )}
        {rows.length > 0 && filteredRows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-10 text-center">
            <Search size={22} aria-hidden="true" className="mx-auto text-stone-400" />
            <h3 className="mt-3 font-semibold text-brand-900">No learners match this view</h3>
            <p className="mt-1 text-sm text-stone-500">Try another search or attendance filter.</p>
          </div>
        )}
      </section>
    </div>
  );
}
