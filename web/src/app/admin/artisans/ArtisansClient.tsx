'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ArtisanStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

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

export default function ArtisansClient({ initial }: { initial: ArtisanRow[] }) {
  const router = useRouter();
  const [artisans, setArtisans] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const registered = artisans.filter((a) => !a.application_submitted);
  const pending = artisans.filter((a) => a.application_submitted && a.verification_status === 'pending');
  const approved = artisans.filter((a) => a.verification_status === 'approved');
  const other = artisans.filter((a) => a.application_submitted && (a.verification_status === 'rejected' || a.verification_status === 'suspended'));

  async function setStatus(id: number, status: ArtisanStatus) {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/artisan-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artisan_id: id, status }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        setMsg(data.message ?? 'Action failed.');
        return;
      }

      setArtisans((list) => list.map((a) => (a.id === id ? { ...a, verification_status: status } : a)));
      router.refresh();
    } catch {
      setMsg('Unable to update artisan status. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {msg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}

      <section>
        <h2 className="font-serif text-xl font-bold text-brand-900">Registered accounts — verification not submitted ({registered.length})</h2>
        <div className="mt-3 space-y-3">
          {registered.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/artisans/${a.id}`} className="font-semibold text-stone-800 hover:text-brand-700 hover:underline">{a.name}</Link>
                <p className="text-sm text-stone-500">{a.email} · {a.craft_type ?? '—'} · {a.location ?? '—'}</p>
                <span className="badge mt-1 bg-stone-100 text-stone-700">Registered · Not verified</span>
              </div>
              <Link href={`/admin/artisans/${a.id}`} className="btn-outline px-3 py-1 text-xs">Manage profile</Link>
            </div>
          ))}
          {registered.length === 0 && <p className="text-sm text-stone-500">No artisans are waiting to submit verification.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold text-brand-900">Pending applications ({pending.length})</h2>
        <div className="mt-3 space-y-3">
          {pending.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/artisans/${a.id}`} className="font-semibold text-stone-800 hover:text-brand-700 hover:underline">{a.name}</Link>
                <p className="text-sm text-stone-500">{a.email} · {a.craft_type ?? '—'} · {a.location ?? '—'}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/artisans/${a.id}`} className="btn-outline px-3 py-1 text-xs">Manage profile</Link>
                <button className="btn-primary px-3 py-1 text-xs" disabled={busy} onClick={() => setStatus(a.id, 'approved')}>Approve</button>
                <button className="btn-danger px-3 py-1 text-xs" disabled={busy} onClick={() => setStatus(a.id, 'rejected')}>Reject</button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-sm text-stone-500">No pending applications.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold text-brand-900">Approved artisans ({approved.length})</h2>
        <div className="mt-3 space-y-3">
          {approved.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/artisans/${a.id}`} className="font-semibold text-stone-800 hover:text-brand-700 hover:underline">{a.name}</Link>
                <p className="text-sm text-stone-500">{a.email} · {a.productCount} product{a.productCount === 1 ? '' : 's'}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/artisans/${a.id}`} className="btn-outline px-3 py-1 text-xs">Manage profile</Link>
                <button className="btn-outline px-3 py-1 text-xs" disabled={busy} onClick={() => setStatus(a.id, 'suspended')}>Suspend</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold text-brand-900">Rejected and suspended artisans ({other.length})</h2>
        <div className="mt-3 space-y-3">
          {other.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/artisans/${a.id}`} className="font-semibold text-stone-800 hover:text-brand-700 hover:underline">{a.name}</Link>
                <p className="text-sm text-stone-500">{a.email} · {a.craft_type ?? '—'} · {a.location ?? '—'} · {a.productCount} product{a.productCount === 1 ? '' : 's'}</p>
                <span className="badge mt-1 bg-stone-100 capitalize text-stone-700">{a.verification_status}</span>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/artisans/${a.id}`} className="btn-outline px-3 py-1 text-xs">Manage profile</Link>
                <button className="btn-primary px-3 py-1 text-xs" disabled={busy} onClick={() => setStatus(a.id, 'approved')}>Restore</button>
              </div>
            </div>
          ))}
          {other.length === 0 && <p className="text-sm text-stone-500">No rejected or suspended artisans.</p>}
        </div>
      </section>
    </div>
  );
}
