'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, CreditCard, Edit3, Package, Search, Tag, WandSparkles } from 'lucide-react';

export interface Row {
  id: number; name: string; price: number; stock: number;
  status: string; has_tutorial: boolean; nfc_tag_id: string | null;
}

type Filter = 'all' | 'active' | 'inactive' | 'workshops';

export default function ProductsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((row) => row.status === 'active').length,
    inactive: rows.filter((row) => row.status !== 'active').length,
    workshops: rows.filter((row) => row.has_tutorial).length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter = filter === 'all'
        || (filter === 'workshops' && row.has_tutorial)
        || (filter === 'active' && row.status === 'active')
        || (filter === 'inactive' && row.status !== 'active');
      const matchesQuery = !normalizedQuery ||
        [row.name, row.nfc_tag_id ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, rows]);

  async function toggle(id: number) {
    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`/api/artisan/products/${id}/toggle`, { method: 'POST' });
      if (!response.ok) throw new Error('The creation status could not be updated. Please try again.');
      setRows((currentRows) => currentRows.map((row) => (
        row.id === id ? { ...row, status: row.status === 'active' ? 'inactive' : 'active' } : row
      )));
      router.refresh();
    } catch (cause) {
      console.error('[artisan-products] failed to change creation status:', cause);
      setError(cause instanceof Error ? cause.message : 'The creation status could not be updated. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section aria-label="Creation summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: 'all' as const, label: 'All creations', value: counts.all, note: 'In your collection', Icon: Package },
          { key: 'active' as const, label: 'Published', value: counts.active, note: 'Visible in the marketplace', Icon: CheckCircle2 },
          { key: 'inactive' as const, label: 'Unpublished', value: counts.inactive, note: 'Only you can see these', Icon: WandSparkles },
          { key: 'workshops' as const, label: 'With workshops', value: counts.workshops, note: 'Share your knowledge', Icon: BookOpen },
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
      </section>

      <section aria-label="Creation list" className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Your collection</h2>
            <p className="mt-1 text-xs text-stone-500">{filteredRows.length} {filteredRows.length === 1 ? 'creation' : 'creations'} shown</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search creations</span>
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              className="input min-h-11 pl-10"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creations or NFC tag"
            />
          </label>
        </div>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        {filteredRows.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm transition hover:border-ochre-300 hover:shadow-md">
            <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                  <Package size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-base font-bold text-brand-900">{p.name}</h3>
                    <span className={`badge border capitalize ${p.status === 'active' ? 'border-ochre-300 bg-ochre-100 text-ochre-900' : 'border-stone-200 bg-stone-100 text-stone-600'}`}>
                      {p.status === 'active' ? 'Published' : 'Unpublished'}
                    </span>
                    {p.has_tutorial && <span className="badge border border-abaca-300 bg-canvas text-brand-700">Workshop</span>}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <p className="flex items-center gap-2 text-stone-700">
                      <CreditCard size={15} aria-hidden="true" className="shrink-0 text-ochre-800" />
                      <span className="font-semibold">₱{p.price.toFixed(2)}</span>
                    </p>
                    <p className="flex items-center gap-2 text-stone-700">
                      <Package size={15} aria-hidden="true" className="shrink-0 text-ochre-800" />
                      <span>{p.stock} {p.stock === 1 ? 'piece' : 'pieces'} available</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-start gap-2 rounded-xl border border-abaca-100 bg-canvas/70 p-3 text-xs sm:min-w-[220px]">
                <Tag size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-ochre-800" />
                <div className="min-w-0">
                  <p className="font-semibold text-stone-700">NFC craft tag</p>
                  {p.nfc_tag_id ? (
                    <p className="mt-1 break-all font-mono text-stone-500">Registered · {p.nfc_tag_id}</p>
                  ) : (
                    <p className="mt-1 text-stone-500">Not registered yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-abaca-100 bg-canvas/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs leading-5 text-stone-500">
                {p.has_tutorial ? 'This creation also shares a traditional workshop.' : 'Manage listing details and availability.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-outline min-h-10 px-3 text-xs"
                  disabled={busyId === p.id}
                  onClick={() => void toggle(p.id)}
                >
                  {busyId === p.id ? 'Saving…' : p.status === 'active' ? 'Unpublish' : 'Publish'}
                </button>
                <Link className="btn-outline min-h-10 px-3 text-xs" href={`/artisan/products/edit/${p.id}`}>
                  <Edit3 size={14} aria-hidden="true" />
                  Edit creation
                </Link>
                {!p.nfc_tag_id && (
                  <Link className="btn-primary min-h-10 px-3 text-xs" href={`/artisan/products/${p.id}/nfc`}>
                    <Tag size={14} aria-hidden="true" />
                    Register NFC
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}

        {rows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-12 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <Package size={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-900">Your first creation starts here</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
              Share your craft with the community by adding a piece to your collection.
            </p>
            <Link href="/artisan/products/new" className="btn-primary mt-5">Add a creation</Link>
          </div>
        )}
        {rows.length > 0 && filteredRows.length === 0 && (
          <div className="rounded-2xl border border-abaca-200/80 bg-white/90 px-6 py-10 text-center">
            <Search size={22} aria-hidden="true" className="mx-auto text-stone-400" />
            <h3 className="mt-3 font-semibold text-brand-900">No matching creations</h3>
            <p className="mt-1 text-sm text-stone-500">Try another search or choose a different group.</p>
            <button type="button" className="btn-outline mt-4" onClick={() => { setQuery(''); setFilter('all'); }}>
              Show all creations
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
