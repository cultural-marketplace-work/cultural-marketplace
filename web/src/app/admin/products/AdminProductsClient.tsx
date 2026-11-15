'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = { id: number; name: string; price: number; status: string; artisan: string; category: string | null; order_count: number };
type Summary = {
  total: number;
  active: number;
  recent: Array<{ order_id: number; customer_name: string | null; quantity: number; status: string; purchase_type: string; created_at: string }>;
};

export default function AdminProductsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', price: '', category: '', status: 'active' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [summaries, setSummaries] = useState<Record<number, Summary | 'loading' | 'error'>>({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  function startEdit(p: Row) {
    setOpenId(null);
    setEditId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      category: p.category ?? '',
      status: p.status === 'inactive' ? 'inactive' : 'active',
    });
    setMsg(null);
  }

  async function save(id: number) {
    const row = rows.find((r) => r.id === id);
    const locked = (row?.order_count ?? 0) > 0;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        locked
          ? { status: form.status }
          : { name: form.name, price: Number(form.price), category: form.category, status: form.status }
      ),
    });
    const data = await res.json();
    setBusy(false);
    if (data.status === 'success') {
      setRows((l) =>
        l.map((r) =>
          r.id !== id
            ? r
            : locked
              ? { ...r, status: form.status }
              : { ...r, name: form.name.trim(), price: Number(form.price), category: form.category.trim() || null, status: form.status }
        )
      );
      setEditId(null);
      setMsg({ text: 'Product updated.' });
      router.refresh();
    } else {
      setMsg({ text: data.message ?? 'Update failed.', error: true });
    }
  }

  async function remove(p: Row) {
    if (!window.confirm(`Permanently delete "${p.name}"? This removes it from the database and cannot be undone.`)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
    const data = await res.json();
    setBusy(false);
    if (data.status === 'success') {
      setRows((l) => l.filter((x) => x.id !== p.id));
      setMsg({ text: 'Product deleted.' });
      router.refresh();
    } else {
      setMsg({ text: data.message ?? 'Delete failed.', error: true });
    }
  }

  async function toggleDetails(id: number) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setEditId(null);
    setOpenId(id);
    setSummaries((s) => ({ ...s, [id]: 'loading' }));
    try {
      const res = await fetch(`/api/admin/products/${id}/orders`);
      const data = await res.json();
      setSummaries((s) => ({ ...s, [id]: data.status === 'success' ? data.summary : 'error' }));
    } catch {
      setSummaries((s) => ({ ...s, [id]: 'error' }));
    }
  }

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!q || r.name.toLowerCase().includes(q) || r.artisan.toLowerCase().includes(q) || (r.category ?? '').toLowerCase().includes(q))
  );

  const stats = [
    { label: 'Total products', value: rows.length },
    { label: 'Active', value: rows.filter((r) => r.status === 'active').length },
    { label: 'Inactive', value: rows.filter((r) => r.status !== 'active').length },
    { label: 'With orders', value: rows.filter((r) => r.order_count > 0).length },
  ];

  const btn = 'rounded-md border px-3 py-1 text-xs font-medium transition disabled:opacity-50';
  const label = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#3D3028]';

  return (
    <div className="mt-5 space-y-5">
      {/* SUMMARY STRIP */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[#D6D0C9] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#71675F]">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#8B0000]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#D6D0C9] bg-white p-3 shadow-sm">
        <input
          className="input !w-full sm:!w-72 text-sm"
          placeholder="Search product, artisan or category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-1.5">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                statusFilter === f
                  ? 'border-[#8B0000] bg-[#8B0000] text-white'
                  : 'border-[#D6D0C9] bg-white text-[#3D3028] hover:bg-[#FFF5E4]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="ml-auto text-xs text-[#71675F]">
          Showing <b className="text-[#3D3028]">{visible.length}</b> of {rows.length}
        </p>
      </div>

      {msg && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${msg.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#D6B56D] bg-[#FFF9EF] text-[#9A681D]'}`}>
          {msg.text}
        </p>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-[#D6D0C9] bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-[#E8DCCB] bg-[#FCF9F4] text-[11px] uppercase tracking-wider text-[#71675F]">
            <tr>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Artisan</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Orders</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-b border-[#F0E8DC] hover:bg-[#FFFBF4]">
                  <td className="px-4 py-3 font-semibold text-[#3D3028]">{p.name}</td>
                  <td className="px-4 py-3 text-[#71675F]">{p.artisan}</td>
                  <td className="px-4 py-3 text-[#71675F]">{p.category ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-[#3D3028]">₱{p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.order_count > 0 ? 'bg-[#FFF5E4] text-[#9A681D]' : 'bg-stone-100 text-stone-500'}`}>
                      {p.order_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${p.status === 'active' ? 'border-[#D6B56D] bg-[#FFF5E4] text-[#9A681D]' : 'border-stone-200 bg-stone-100 text-stone-500'}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button className={`${btn} border-[#D6B56D] bg-white text-[#9A681D] hover:bg-[#FFF5E4]`} disabled={busy} onClick={() => startEdit(p)}>
                        {p.order_count > 0 ? 'Edit status' : 'Edit'}
                      </button>
                      <button className={`${btn} border-[#D6D0C9] bg-white text-[#3D3028] hover:bg-stone-50`} onClick={() => toggleDetails(p.id)}>
                        {openId === p.id ? 'Hide orders' : 'Orders'}
                      </button>
                      <button className={`${btn} border-[#D9A6A6] bg-[#FCEEEE] text-[#8B0000] hover:bg-[#F8DEDE]`} disabled={busy} onClick={() => remove(p)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>

                {/* EDIT PANEL */}
                {editId === p.id && (
                  <tr className="border-b border-[#F0E8DC] bg-[#FCF9F4]">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className={label}>Product name</label>
                          <input className="input text-sm" value={form.name} disabled={p.order_count > 0} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                          <label className={label}>Category</label>
                          <input className="input text-sm" value={form.category} disabled={p.order_count > 0} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                        </div>
                        <div>
                          <label className={label}>Price (₱)</label>
                          <input className="input text-sm" type="number" min="0" step="0.01" value={form.price} disabled={p.order_count > 0} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                        </div>
                        <div>
                          <label className={label}>Status</label>
                          <select className="input text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                          </select>
                        </div>
                      </div>
                      {p.order_count > 0 && (
                        <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
                          🔒 This product has {p.order_count} order{p.order_count === 1 ? '' : 's'}. Only the status can be changed.
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button className="btn-primary px-4 py-1.5 text-xs" disabled={busy} onClick={() => save(p.id)}>
                          {busy ? 'Saving…' : 'Save changes'}
                        </button>
                        <button className="btn-outline px-4 py-1.5 text-xs" disabled={busy} onClick={() => setEditId(null)}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* ORDER HISTORY PANEL */}
                {openId === p.id && (() => {
                  const s = summaries[p.id];
                  return (
                    <tr className="border-b border-[#F0E8DC] bg-[#FCF9F4]">
                      <td colSpan={7} className="px-4 py-4 text-sm">
                        {s === 'loading' || s === undefined ? (
                          <p className="text-stone-500">Loading order history…</p>
                        ) : s === 'error' ? (
                          <p className="text-red-700">Could not load order history.</p>
                        ) : s.total === 0 ? (
                          <p className="font-medium text-[#9A681D]">No orders yet. This product can be edited or deleted freely.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="font-medium text-[#3D3028]">
                              {s.total} order{s.total === 1 ? '' : 's'} · {s.active} still active
                              <span className="ml-2 text-xs font-normal text-red-700">Cannot be deleted; set to inactive instead.</span>
                            </p>
                            <ul className="space-y-1 text-xs text-[#71675F]">
                              {s.recent.map((r, i) => (
                                <li key={i}>
                                  Order #{r.order_id} · {r.customer_name ?? 'Customer'} · ×{r.quantity} · {r.purchase_type} ·{' '}
                                  <span className="capitalize">{r.status.replace(/_/g, ' ')}</span> · {new Date(r.created_at).toLocaleDateString()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })()}
              </Fragment>
            ))}

            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#71675F]">
                  No products match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}