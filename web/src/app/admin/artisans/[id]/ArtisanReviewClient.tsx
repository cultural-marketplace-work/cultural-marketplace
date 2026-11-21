'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RuleResult, VerificationDecision } from '@/lib/verificationRules';
import { LogoLoadingOverlay } from '@/components/LogoLoading';

interface EvidenceItem {
  key: string;
  label: string;
  submitted: boolean;
  url: string | null;
  urlError?: boolean;
  mediaType?: string | null;
}

interface Props {
  artisan: {
    id: number; name: string; email: string; phone: string | null; location: string | null;
    craft_type: string | null; business_name: string | null; bio: string | null; status: string; application_submitted: boolean;
    id_number: string | null; id_type: string | null; dob: string | null; id_expiry_date: string | null; id_expiry_checked: boolean;
    has_id_docs: boolean; has_proof: boolean;
    indigenous_affiliation: string | null;
    face_matched: boolean | null; face_confidence: number | null; duplicate_face_match: boolean | null;
    liveness_status: 'passed' | 'manual_review' | null; liveness_challenges: string[]; liveness_verified_at: string | null;
    registration_notes: string | null;
    verification_decision: VerificationDecision;
  };
  productCount: number;
  rules: RuleResult[];
  ruleSummary: { canApprove: boolean; text: string };
  evidence: EvidenceItem[];
}

const RULE_MARK = { pass: '✓', review: '?', fail: '✗' } as const;
const RULE_STYLE = {
  pass: 'bg-green-50 text-green-800 border border-green-200 font-semibold',
  review: 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold',
  fail: 'bg-crimson-50 text-crimson-800 border border-crimson-200',
} as const;

function formatDateOnly(value: string | null): string {
  if (!value) return '—';

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const numeric = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = Number(numeric[3]);
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  return value;
}

export default function ArtisanReviewClient({ artisan, productCount, rules, ruleSummary, evidence }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(artisan);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [zoom, setZoom] = useState<EvidenceItem | null>(null);

  async function save() {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/admin/artisans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update', id: artisan.id,
        name: form.name, phone: form.phone, location: form.location,
        craft_type: form.craft_type, business_name: form.business_name, bio: form.bio,
      }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(data.status === 'success' ? 'Saved.' : data.message ?? 'Save failed.');
    router.refresh();
  }

  async function setStatus(status: string) {
    setBusy(true);
    await fetch('/api/admin/artisan-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artisan_id: artisan.id, status, rule_snapshot: rules.map((r) => `${r.id}:${r.status}`).join(',') }),
    });
    setBusy(false);
    setForm((f) => ({ ...f, status }));
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete ${artisan.name}'s verification application? Their artisan account will remain active, but submitted verification documents and application results will be removed. This cannot be undone.`)) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/artisans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_application', id: artisan.id }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        setMsg(data.message ?? 'Could not delete verification application.');
        setBusy(false);
        return;
      }
      setMsg(data.warning
        ? `Verification application deleted. ${data.warning}`
        : 'Verification application deleted. The artisan account was preserved.');
      setBusy(false);
      router.refresh();
    } catch {
      setMsg('Unable to delete the verification application. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      {busy && <LogoLoadingOverlay message="Processing verification…" />}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h2 className="font-serif text-lg font-bold text-brand-900">Profile details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs text-stone-500">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-stone-500">Email</label><input className="input bg-stone-50" value={form.email} disabled /></div>
          <div><label className="mb-1 block text-xs text-stone-500">Phone</label><input className="input" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-stone-500">Craft type</label><input className="input" value={form.craft_type ?? ''} onChange={(e) => setForm({ ...form, craft_type: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-stone-500">Business name</label><input className="input" value={form.business_name ?? ''} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs text-stone-500">Location</label><input className="input" value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        </div>
        <div><label className="mb-1 block text-xs text-stone-500">Bio</label><textarea className="input h-20" value={form.bio ?? ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
        <button className="btn-primary" disabled={busy} onClick={save}>Save changes</button>
        {msg && <p className="text-sm text-stone-600">{msg}</p>}
      </div>

      <div className="space-y-4">
        {/* Deterministic verification checklist (Objective 2) */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-brand-900">Verification checklist</h2>
            <span className={`badge ${artisan.verification_decision === 'auto_approved'
              ? 'bg-green-50 text-green-800 border border-green-200 font-semibold'
              : 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'}`}>
              {artisan.verification_decision === 'auto_approved' ? 'Automatically approved' : 'Manual review'}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">{ruleSummary.text}</p>
          <ul className="mt-3 space-y-1.5">
            {rules.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 flex h-5 w-8 shrink-0 items-center justify-center rounded text-xs font-bold ${RULE_STYLE[r.status]}`}>
                  {RULE_MARK[r.status]}
                </span>
                <span className="min-w-0">
                  <span className="font-medium text-stone-700">{r.id} · {r.label}</span>
                  <span className="block text-xs text-stone-400">{r.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Evidence viewer — signed URLs, tap to zoom */}
        <div className="card p-5">
          <h2 className="font-serif text-lg font-bold text-brand-900">Submitted evidence</h2>
          <p className="mt-1 text-xs text-stone-500">Private documents, viewable by admins only (links expire in 5 minutes).</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {evidence.map((e) => (
              <div key={e.key} className="rounded-xl border border-stone-200 p-2 text-center">
                <p className="mb-1 text-[11px] font-medium text-stone-500">{e.label}</p>
                {e.url ? (
                  <button type="button" onClick={() => setZoom(e)} className="block w-full">
                    {e.mediaType?.startsWith('video/')
                      ? <video src={e.url} className="h-20 w-full rounded bg-black object-contain" muted playsInline />
                      : <img src={e.url} alt={e.label} className="h-20 w-full rounded object-cover" />}
                  </button>
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded bg-stone-50 text-xl text-stone-300">
                    {e.urlError
                      ? <span className="text-xs text-amber-700">Preview unavailable</span>
                      : e.submitted ? '🔒' : '—'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <dl className="space-y-1 text-sm text-stone-600">
            <div className="flex justify-between"><dt>Status</dt><dd><span className="badge bg-stone-100 capitalize">{form.status}</span></dd></div>
            <div className="flex justify-between"><dt>ID type</dt><dd>{artisan.id_type ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>ID expiry</dt><dd>{artisan.id_expiry_date ? formatDateOnly(artisan.id_expiry_date) : (artisan.id_expiry_checked ? 'No expiry shown by OCR' : 'Manual review required')}</dd></div>
            <div className="flex justify-between"><dt>ID number</dt><dd className="font-mono text-xs">{form.id_number ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Liveness</dt><dd>{artisan.liveness_status === 'passed' ? 'Browser challenges passed — review required' : 'Manual review'}</dd></div>
            <div className="flex justify-between"><dt>Face-to-ID</dt><dd>{artisan.face_matched === true ? `Match (${Math.round((artisan.face_confidence ?? 0) * 100)}%)` : artisan.face_matched === false ? 'Below threshold' : 'Manual review'}</dd></div>
            <div className="flex justify-between"><dt>Duplicate face</dt><dd>{artisan.duplicate_face_match === false ? 'No match found' : artisan.duplicate_face_match === true ? 'Possible duplicate' : 'Not checked'}</dd></div>
            <div className="flex justify-between"><dt>Challenges</dt><dd>{artisan.liveness_challenges.length ? artisan.liveness_challenges.map((challenge) => challenge === 'blink_twice' ? 'Blink twice' : challenge === 'turn_both_sides' ? 'Turn both ways' : challenge).join(', ') : '—'}</dd></div>
            {artisan.liveness_verified_at && <div className="flex justify-between"><dt>Liveness time</dt><dd>{formatDateOnly(artisan.liveness_verified_at)}</dd></div>}
            <div className="flex justify-between"><dt>Indigenous affiliation</dt><dd>{artisan.indigenous_affiliation ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Date of birth</dt><dd>{formatDateOnly(form.dob)}</dd></div>
            <div className="flex justify-between"><dt>Products</dt><dd>{productCount}</dd></div>
          </dl>
          {artisan.registration_notes && (
            <p className="mt-3 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">{artisan.registration_notes}</p>
          )}
          {!artisan.application_submitted && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This artisan has registered but has not submitted verification. Approval and rejection are unavailable until an application is submitted.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {artisan.application_submitted && form.status !== 'approved' && <button className="btn-primary px-3 py-1 text-xs" disabled={busy} onClick={() => setStatus('approved')}>Approve</button>}
            {artisan.application_submitted && form.status !== 'suspended' && <button className="btn-outline px-3 py-1 text-xs" disabled={busy} onClick={() => setStatus('suspended')}>Suspend</button>}
            {artisan.application_submitted && form.status !== 'rejected' && <button className="btn-outline px-3 py-1 text-xs" disabled={busy} onClick={() => setStatus('rejected')}>Reject</button>}
            <button className="btn-danger px-3 py-1 text-xs" disabled={busy} onClick={remove}>Delete Verification</button>
          </div>
        </div>
      </div>

      {/* Full-size evidence modal */}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setZoom(null)}>
          <div className="max-h-full max-w-2xl overflow-auto rounded-xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-sm font-semibold text-stone-700">{zoom.label}</p>
            {zoom.mediaType?.startsWith('video/')
              ? <video src={zoom.url ?? ''} className="max-h-[70vh] max-w-full rounded-lg" controls playsInline />
              : <img src={zoom.url ?? ''} alt={zoom.label} className="max-h-[70vh] rounded-lg" />}
            <div className="mt-2 text-right">
              <button className="btn-outline px-3 py-1 text-xs" onClick={() => setZoom(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
