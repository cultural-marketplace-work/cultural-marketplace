'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

export interface ExperienceRow {
  id: number;
  name: string;
  price: number;
  fee_type: string;
  capacity: number | null;
  booked_count: number;
  status: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  dates: Array<{ date: string; time_start: string; time_end: string; location?: string }>;
}

type Filter = 'all' | 'needs_dates' | 'sold_out';

export default function ExperiencesClient({ initial }: { initial: ExperienceRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<number, { type: 'success' | 'error'; message: string }>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const summary = useMemo(() => ({
    workshops: rows.length,
    sessions: rows.reduce((total, row) => total + row.dates.length, 0),
    reserved: rows.reduce((total, row) => total + row.booked_count, 0),
    needsDates: rows.filter((row) => row.dates.length === 0).length,
    soldOut: rows.filter((row) => row.capacity !== null && row.booked_count >= row.capacity).length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const needsDates = row.dates.length === 0;
      const soldOut = row.capacity !== null && row.booked_count >= row.capacity;
      const matchesFilter = filter === 'all'
        || (filter === 'needs_dates' && needsDates)
        || (filter === 'sold_out' && soldOut);
      const matchesQuery = !normalizedQuery ||
        [row.name, row.location ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, rows]);

  async function saveDates(id: number, dates: ExperienceRow['dates']) {
    setBusyId(id);
    setSaveStatus((current) => ({ ...current, [id]: { type: 'success', message: '' } }));

    try {
      const response = await fetch('/api/artisan/tutorial-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: id, dates }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        setSaveStatus((current) => ({
          ...current,
          [id]: { type: 'error', message: data.message ?? 'Could not save the schedule. Please try again.' },
        }));
        return;
      }
      setSaveStatus((current) => ({
        ...current,
        [id]: { type: 'success', message: 'Session schedule saved.' },
      }));
    } catch (cause) {
      console.error('[artisan-experiences] failed to save session dates:', cause);
      setSaveStatus((current) => ({
        ...current,
        [id]: { type: 'error', message: 'Could not save the schedule. Check your connection and try again.' },
      }));
    } finally {
      setBusyId(null);
    }
  }

  function updateRowDates(id: number, dates: ExperienceRow['dates']) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, dates } : row)));
  }

  function addSession(row: ExperienceRow) {
    const newSession = {
      date: new Date().toISOString().split('T')[0],
      time_start: '09:00',
      time_end: '11:00',
      location: row.location ?? '',
    };
    updateRowDates(row.id, [...row.dates, newSession]);
  }

  return (
    <div className="space-y-6">
      <section aria-label="Workshop overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: 'all' as const, label: 'Workshops', value: summary.workshops, note: 'Open to learners', Icon: BookOpen },
          { key: 'needs_dates' as const, label: 'Need dates', value: summary.needsDates, note: 'Add a session schedule', Icon: CalendarDays },
          { key: 'sold_out' as const, label: 'Fully booked', value: summary.soldOut, note: 'At capacity', Icon: CheckCircle2 },
        ].map(({ key, label, value, note, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${filter === key ? 'border-ochre-400 bg-ochre-50/80' : 'border-abaca-200/80 bg-white/90'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ochre-800 shadow-sm">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="font-serif text-3xl font-bold text-brand-900">{value}</span>
            </div>
            <p className="mt-3 text-sm font-bold text-stone-800">{label}</p>
            <p className="mt-1 text-xs text-stone-500">{note}</p>
          </button>
        ))}
        <div className="rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ochre-800 shadow-sm">
              <Users size={19} aria-hidden="true" />
            </span>
            <span className="font-serif text-3xl font-bold text-brand-900">{summary.reserved}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-stone-800">Seats reserved</p>
          <p className="mt-1 text-xs text-stone-500">Across your workshops</p>
        </div>
      </section>

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Your workshops</h2>
            <p className="mt-1 text-xs text-stone-500">
              {filteredRows.length} {filteredRows.length === 1 ? 'workshop' : 'workshops'} shown
            </p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search workshops</span>
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              className="input min-h-11 pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workshops or venues"
            />
          </label>
        </div>
      )}

      {filteredRows.map((row) => {
        const isFree = row.fee_type === 'free' || row.price === 0;
        const isBusy = busyId === row.id;
        const statusMessage = saveStatus[row.id];
        const isFull = row.capacity !== null && row.booked_count >= row.capacity;
        const seatsLeft = row.capacity !== null ? Math.max(0, row.capacity - row.booked_count) : null;

        return (
          <article key={row.id} className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
            <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                  <BookOpen size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words font-serif text-xl font-bold text-brand-900">{row.name}</h2>
                    <span className={`badge border ${isFree ? 'border-ochre-300 bg-ochre-100 text-ochre-900' : 'border-abaca-200 bg-canvas text-stone-700'}`}>
                      {isFree ? 'Free workshop' : `₱${row.price.toFixed(2)} / learner`}
                    </span>
                    <span className={`badge border capitalize ${row.status === 'accept_bookings' ? 'border-green-200 bg-green-50 text-green-800' : 'border-abaca-200 bg-canvas text-stone-600'}`}>
                      {row.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                    <CalendarDays size={15} aria-hidden="true" className="shrink-0 text-ochre-800" />
                    {row.dates.length} scheduled {row.dates.length === 1 ? 'session' : 'sessions'}
                    <span aria-hidden="true" className="text-stone-300">•</span>
                    <Users size={15} aria-hidden="true" className="shrink-0 text-ochre-800" />
                    {row.booked_count} {row.booked_count === 1 ? 'seat' : 'seats'} reserved
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link href={`/artisan/tutorial-attendees/${row.id}`} className="btn-outline min-h-10 px-3 text-xs">
                  <Users size={14} aria-hidden="true" />
                  Attendees ({row.booked_count})
                </Link>
                <Link href={`/artisan/products/${row.id}/edit`} className="btn-outline min-h-10 px-3 text-xs">
                  Edit workshop
                </Link>
                <Link
                  href={`/customer/browse/${row.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline min-h-10 px-3 text-xs"
                >
                  Preview <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 border-t border-abaca-100 bg-canvas/60 px-4 py-3 text-sm sm:grid-cols-2 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <Users size={16} aria-hidden="true" className="shrink-0 text-ochre-800" />
                <span className="text-stone-700">
                  Capacity: <strong className="font-semibold">{row.capacity ?? 'Open'}</strong>
                </span>
                {row.capacity !== null && (
                  <span className={`badge border text-[10px] ${isFull ? 'border-crimson-200 bg-crimson-50 text-crimson-700' : 'border-ochre-300 bg-ochre-50 text-ochre-900'}`}>
                    {isFull ? 'Fully booked' : `${seatsLeft} seats left`}
                  </span>
                )}
              </div>
              {row.location ? (
                <div className="flex min-w-0 items-center gap-2 text-stone-700">
                  <MapPin size={16} aria-hidden="true" className="shrink-0 text-ochre-800" />
                  <span className="truncate">{row.location}</span>
                  {row.lat !== null && row.lng !== null && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Map
                    </a>
                  )}
                </div>
              ) : (
                <Link href={`/artisan/products/${row.id}/edit`} className="flex items-center gap-2 text-xs font-semibold text-ochre-800 hover:underline">
                  <MapPin size={16} aria-hidden="true" />
                  Add a workshop venue
                </Link>
              )}
            </div>

            <section aria-label={`Schedule for ${row.name}`} className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-brand-900">Session schedule</h3>
                  <p className="mt-1 text-xs text-stone-500">Add dates and times so learners can choose when to join.</p>
                </div>
                <button
                  type="button"
                  onClick={() => addSession(row)}
                  className="btn-outline min-h-10 px-3 text-xs"
                  disabled={isBusy}
                >
                  <Plus size={15} aria-hidden="true" />
                  Add session
                </button>
              </div>

              {row.dates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-abaca-300 bg-canvas/60 px-5 py-8 text-center">
                  <CalendarDays size={23} aria-hidden="true" className="mx-auto text-ochre-800" />
                  <p className="mt-2 text-sm font-semibold text-stone-700">No sessions scheduled yet</p>
                  <p className="mt-1 text-xs text-stone-500">Add your first date to let learners book a place.</p>
                  <button
                    type="button"
                    onClick={() => addSession(row)}
                    className="btn-primary mt-4 min-h-10 px-3 text-xs"
                    disabled={isBusy}
                  >
                    <Plus size={14} aria-hidden="true" /> Add first session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {row.dates.map((date, index) => {
                    const datePrefix = `workshop-${row.id}-session-${index}`;
                    return (
                      <fieldset
                        key={`${row.id}-${index}`}
                        className="grid gap-3 rounded-xl border border-abaca-200 bg-canvas/50 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_0.8fr_0.8fr_1.5fr_auto] lg:items-end"
                      >
                        <legend className="sr-only">Session {index + 1}</legend>
                        <div>
                          <label htmlFor={`${datePrefix}-date`} className="mb-1.5 block text-xs font-semibold text-stone-600">Date</label>
                          <input
                            id={`${datePrefix}-date`}
                            type="date"
                            className="input min-h-10 py-2"
                            value={date.date}
                            disabled={isBusy}
                            onChange={(event) => updateRowDates(row.id, row.dates.map((item, itemIndex) => (
                              itemIndex === index ? { ...item, date: event.target.value } : item
                            )))}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${datePrefix}-start`} className="mb-1.5 block text-xs font-semibold text-stone-600">Starts</label>
                          <input
                            id={`${datePrefix}-start`}
                            type="time"
                            className="input min-h-10 py-2"
                            value={date.time_start}
                            disabled={isBusy}
                            onChange={(event) => updateRowDates(row.id, row.dates.map((item, itemIndex) => (
                              itemIndex === index ? { ...item, time_start: event.target.value } : item
                            )))}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${datePrefix}-end`} className="mb-1.5 block text-xs font-semibold text-stone-600">Ends</label>
                          <input
                            id={`${datePrefix}-end`}
                            type="time"
                            className="input min-h-10 py-2"
                            value={date.time_end}
                            disabled={isBusy}
                            onChange={(event) => updateRowDates(row.id, row.dates.map((item, itemIndex) => (
                              itemIndex === index ? { ...item, time_end: event.target.value } : item
                            )))}
                          />
                        </div>
                        <div>
                          <label htmlFor={`${datePrefix}-venue`} className="mb-1.5 block text-xs font-semibold text-stone-600">Venue for this session</label>
                          <input
                            id={`${datePrefix}-venue`}
                            className="input min-h-10 py-2"
                            placeholder={row.location || 'Studio, room, or meeting place'}
                            value={date.location ?? ''}
                            disabled={isBusy}
                            onChange={(event) => updateRowDates(row.id, row.dates.map((item, itemIndex) => (
                              itemIndex === index ? { ...item, location: event.target.value } : item
                            )))}
                          />
                        </div>
                        <button
                          type="button"
                          className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
                          title="Remove session"
                          aria-label={`Remove session ${index + 1}`}
                          disabled={isBusy}
                          onClick={() => updateRowDates(row.id, row.dates.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          <span className="lg:hidden">Remove</span>
                        </button>
                      </fieldset>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-abaca-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {statusMessage?.message && (
                    <p
                      role={statusMessage.type === 'error' ? 'alert' : 'status'}
                      className={`flex items-center gap-2 text-sm font-semibold ${statusMessage.type === 'success' ? 'text-green-800' : 'text-red-700'}`}
                    >
                      {statusMessage.type === 'success'
                        ? <CheckCircle2 size={16} aria-hidden="true" />
                        : <AlertCircle size={16} aria-hidden="true" />}
                      {statusMessage.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    className="btn-outline min-h-10 px-3 text-xs"
                    onClick={() => addSession(row)}
                    disabled={isBusy}
                  >
                    <Plus size={14} aria-hidden="true" /> Add another session
                  </button>
                  <button
                    type="button"
                    className="btn-primary min-h-10 px-4 text-xs"
                    disabled={isBusy}
                    onClick={() => void saveDates(row.id, row.dates)}
                  >
                    {isBusy ? <Clock3 size={15} className="animate-pulse" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                    {isBusy ? 'Saving schedule…' : 'Save schedule'}
                  </button>
                </div>
              </div>
            </section>
          </article>
        );
      })}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-12 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
            <BookOpen size={24} aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-serif text-xl font-bold text-brand-900">Share your craft through a workshop</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            Turn a creation into a learning experience by enabling “Offer a live workshop” in its details.
          </p>
          <Link href="/artisan/products/new" className="btn-primary mt-5 min-h-10">
            Create a bookable craft <Plus size={15} aria-hidden="true" />
          </Link>
        </div>
      )}
      {rows.length > 0 && filteredRows.length === 0 && (
        <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-10 text-center">
          <Search size={22} aria-hidden="true" className="mx-auto text-stone-400" />
          <h2 className="mt-3 font-semibold text-brand-900">No matching workshops</h2>
          <p className="mt-1 text-sm text-stone-500">Try another search or choose a different workshop group.</p>
          <button type="button" className="btn-outline mt-4" onClick={() => { setQuery(''); setFilter('all'); }}>
            Show all workshops
          </button>
        </div>
      )}
    </div>
  );
}
