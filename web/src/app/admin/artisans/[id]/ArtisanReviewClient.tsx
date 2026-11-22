'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Eye,
  FileImage,
  FileText,
  ImageOff,
  MapPin,
  Package,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
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

type ActionStatus = 'approved' | 'rejected' | 'suspended';
type Message = { tone: 'success' | 'error'; text: string };

const RULE_MARK = { pass: Check, review: CircleHelp, fail: X } as const;
const RULE_STYLE = {
  pass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  review: 'border-amber-200 bg-amber-50 text-amber-800',
  fail: 'border-crimson-200 bg-crimson-50 text-crimson-800',
} as const;

const statusStyles: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-crimson-200 bg-crimson-50 text-crimson-800',
  suspended: 'border-stone-200 bg-stone-100 text-stone-700',
};

const fieldClass = 'input w-full rounded-xl';
const actionBaseClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

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

function displayStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ArtisanReviewClient({ artisan, productCount, rules, ruleSummary, evidence }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(artisan);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [zoom, setZoom] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    if (!zoom) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setZoom(null);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/artisans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: artisan.id,
          name: form.name,
          phone: form.phone,
          location: form.location,
          craft_type: form.craft_type,
          business_name: form.business_name,
          bio: form.bio,
        }),
      });
      const data = await res.json() as { status?: string; message?: string };
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message ?? 'Could not save profile changes.');
      }
      setMessage({ tone: 'success', text: 'Profile changes saved.' });
      router.refresh();
    } catch (error: unknown) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not save profile changes. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: ActionStatus) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/artisan-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artisan_id: artisan.id,
          status,
          rule_snapshot: rules.map((rule) => `${rule.id}:${rule.status}`).join(','),
        }),
      });
      const data = await res.json() as { status?: string; message?: string };
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message ?? `Could not ${status} this artisan.`);
      }

      setForm((current) => ({ ...current, status }));
      setMessage({ tone: 'success', text: `Application status updated to ${displayStatus(status)}.` });
      router.refresh();
    } catch (error: unknown) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Could not update the application status. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const confirmed = confirm(
      `Delete ${artisan.name}'s verification application? Their artisan account will remain active, but submitted verification documents and application results will be removed. This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/artisans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_application', id: artisan.id }),
      });
      const data = await res.json() as { status?: string; message?: string; warning?: string };
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message ?? 'Could not delete the verification application.');
      }
      setMessage({
        tone: data.warning ? 'error' : 'success',
        text: data.warning
          ? `Verification application deleted. ${data.warning}`
          : 'Verification application deleted. The artisan account was preserved.',
      });
      router.refresh();
    } catch (error: unknown) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Unable to delete the verification application. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  const statusTone = statusStyles[form.status] ?? statusStyles.pending;
  const livenessLabel = artisan.liveness_status === 'passed'
    ? 'Browser challenges passed — review required'
    : 'Manual review';
  const faceLabel = artisan.face_matched === true
    ? `Match (${Math.round((artisan.face_confidence ?? 0) * 100)}%)`
    : artisan.face_matched === false
      ? 'Below threshold'
      : 'Manual review';
  const duplicateFaceLabel = artisan.duplicate_face_match === false
    ? 'No match found'
    : artisan.duplicate_face_match === true
      ? 'Possible duplicate'
      : 'Not checked';
  const challenges = artisan.liveness_challenges.map((challenge) => (
    challenge === 'blink_twice' ? 'Blink twice' : challenge === 'turn_both_sides' ? 'Turn both ways' : challenge
  )).join(', ');
  const reviewFields = [
    { label: 'ID type', value: artisan.id_type ?? '—', icon: FileText },
    {
      label: 'ID expiry',
      value: artisan.id_expiry_date
        ? formatDateOnly(artisan.id_expiry_date)
        : artisan.id_expiry_checked ? 'No expiry shown by OCR' : 'Manual review required',
      icon: CalendarDays,
    },
    { label: 'ID number', value: form.id_number ?? '—', icon: BadgeCheck, mono: true },
    { label: 'Liveness', value: livenessLabel, icon: ClipboardCheck },
    { label: 'Face-to-ID', value: faceLabel, icon: BadgeCheck },
    { label: 'Duplicate face', value: duplicateFaceLabel, icon: ShieldAlert },
    { label: 'Challenges', value: challenges || '—', icon: ClipboardCheck },
    ...(artisan.liveness_verified_at
      ? [{ label: 'Liveness time', value: formatDateOnly(artisan.liveness_verified_at), icon: CalendarDays }]
      : []),
    { label: 'Indigenous affiliation', value: artisan.indigenous_affiliation ?? '—', icon: UserRound },
    { label: 'Date of birth', value: formatDateOnly(form.dob), icon: CalendarDays },
    { label: 'Products', value: String(productCount), icon: Package },
  ];

  return (
    <>
      {busy && <LogoLoadingOverlay message="Processing verification…" />}

      {message && (
        <div
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            message.tone === 'error'
              ? 'border-crimson-200 bg-crimson-50 text-crimson-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {message.tone === 'error'
            ? <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            : <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
          <p className="flex-1">{message.text}</p>
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-black/5">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white shadow-sm">
          <div className="border-b border-stone-100 bg-gradient-to-r from-[#fffaf0] to-white px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ochre-100 text-ochre-900">
                <UserRound size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-serif text-xl font-bold text-brand-900">Profile details</h2>
                <p className="mt-1 text-sm leading-5 text-stone-500">Review and update the artisan’s contact and business information.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="artisan-review-name" className="mb-1.5 block text-sm font-semibold text-stone-700">Name</label>
                <input id="artisan-review-name" className={fieldClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div>
                <label htmlFor="artisan-review-email" className="mb-1.5 block text-sm font-semibold text-stone-700">Email</label>
                <input id="artisan-review-email" type="email" className={`${fieldClass} cursor-not-allowed bg-canvas text-stone-500`} value={form.email} disabled />
              </div>
              <div>
                <label htmlFor="artisan-review-phone" className="mb-1.5 block text-sm font-semibold text-stone-700">Phone</label>
                <input id="artisan-review-phone" type="tel" className={fieldClass} value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div>
                <label htmlFor="artisan-review-craft" className="mb-1.5 block text-sm font-semibold text-stone-700">Craft type</label>
                <input id="artisan-review-craft" className={fieldClass} value={form.craft_type ?? ''} onChange={(event) => setForm({ ...form, craft_type: event.target.value })} />
              </div>
              <div>
                <label htmlFor="artisan-review-business" className="mb-1.5 block text-sm font-semibold text-stone-700">Business name</label>
                <input id="artisan-review-business" className={fieldClass} value={form.business_name ?? ''} onChange={(event) => setForm({ ...form, business_name: event.target.value })} />
              </div>
              <div>
                <label htmlFor="artisan-review-location" className="mb-1.5 block text-sm font-semibold text-stone-700">Location</label>
                <input id="artisan-review-location" className={fieldClass} value={form.location ?? ''} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="artisan-review-bio" className="mb-1.5 block text-sm font-semibold text-stone-700">Bio</label>
              <textarea id="artisan-review-bio" className={`${fieldClass} min-h-28 resize-y`} value={form.bio ?? ''} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </div>
            <div className="flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-stone-500">Changes update the artisan’s public profile.</p>
              <button
                type="button"
                className={`${actionBaseClass} bg-crimson-700 text-white hover:bg-crimson-800 focus-visible:outline-crimson-700`}
                disabled={busy}
                onClick={save}
              >
                <Check size={16} aria-hidden="true" />
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-abaca-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                  <ClipboardCheck size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-serif text-lg font-bold text-brand-900">Verification checklist</h2>
                  <p className="mt-1 text-sm leading-5 text-stone-500">Automated checks and items that need admin attention.</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                artisan.verification_decision === 'auto_approved'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}>
                {artisan.verification_decision === 'auto_approved'
                  ? <CheckCircle2 size={14} aria-hidden="true" />
                  : <CircleHelp size={14} aria-hidden="true" />}
                {artisan.verification_decision === 'auto_approved' ? 'Automatically approved' : 'Manual review'}
              </span>
            </div>
            <p className="mt-4 rounded-xl bg-canvas px-3.5 py-3 text-sm leading-5 text-stone-600">{ruleSummary.text}</p>
            <ul className="mt-4 space-y-3">
              {rules.map((rule) => {
                const Mark = RULE_MARK[rule.status];
                return (
                  <li key={rule.id} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${RULE_STYLE[rule.status]}`}>
                      <Mark size={13} strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5 text-stone-800">{rule.id} · {rule.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-stone-500">{rule.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-abaca-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                <FileImage size={19} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-bold text-brand-900">Submitted evidence</h2>
                <p className="mt-1 text-sm leading-5 text-stone-500">Private files are visible to admins only. Secure links expire after 5 minutes.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {evidence.map((item) => (
                <article key={item.key} className="overflow-hidden rounded-xl border border-abaca-200 bg-[#fffdf8]">
                  <div className="flex min-h-10 items-center border-b border-abaca-100 px-3 py-2">
                    <p className="line-clamp-2 text-xs font-semibold leading-4 text-stone-700">{item.label}</p>
                  </div>
                  {item.url ? (
                    <button
                      type="button"
                      onClick={() => setZoom(item)}
                      aria-label={`Open ${item.label} preview`}
                      className="group relative block w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson-700"
                    >
                      {item.mediaType?.startsWith('video/')
                        ? <video src={item.url} className="h-28 w-full bg-charcoal-950 object-contain" muted playsInline />
                        : <img src={item.url} alt={item.label} className="h-28 w-full object-cover transition duration-200 group-hover:scale-[1.03]" />}
                      <span className="absolute inset-0 flex items-center justify-center bg-charcoal-950/0 text-white transition group-hover:bg-charcoal-950/30">
                        <Eye size={20} className="opacity-0 drop-shadow transition group-hover:opacity-100" aria-hidden="true" />
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-28 flex-col items-center justify-center gap-1.5 px-2 text-center">
                      {item.urlError ? (
                        <>
                          <ImageOff size={20} className="text-amber-700" aria-hidden="true" />
                          <span className="text-[11px] font-medium text-amber-800">Preview unavailable</span>
                        </>
                      ) : item.submitted ? (
                        <>
                          <FileText size={20} className="text-stone-400" aria-hidden="true" />
                          <span className="text-[11px] text-stone-500">File could not be opened</span>
                        </>
                      ) : (
                        <>
                          <ImageOff size={20} className="text-stone-300" aria-hidden="true" />
                          <span className="text-[11px] text-stone-500">Not submitted</span>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
                  <BadgeCheck size={19} aria-hidden="true" />
                </span>
                <h2 className="font-serif text-lg font-bold text-brand-900">Review details</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>{displayStatus(form.status)}</span>
            </div>

            <dl className="grid gap-px bg-stone-100 sm:grid-cols-2">
              {reviewFields.map(({ label, value, icon: Icon, mono }) => (
                <div key={label} className="min-w-0 bg-white px-4 py-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <Icon size={13} aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className={`mt-1 break-words text-sm text-stone-800 ${mono ? 'font-mono' : ''}`}>{value}</dd>
                </div>
              ))}
            </dl>

            {artisan.registration_notes && (
              <div className="mx-4 mt-4 rounded-xl border border-abaca-200 bg-canvas p-3.5 sm:mx-5">
                <p className="text-xs font-semibold text-stone-600">Registration notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-stone-700">{artisan.registration_notes}</p>
              </div>
            )}

            {!artisan.application_submitted && (
              <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-5 text-amber-900 sm:mx-5">
                <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>This artisan has registered but has not submitted verification. Approval and rejection are unavailable until an application is submitted.</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-stone-100 px-4 py-4 sm:px-5">
              {artisan.application_submitted && form.status !== 'approved' && (
                <button
                  type="button"
                  className={`${actionBaseClass} bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700`}
                  disabled={busy}
                  onClick={() => setStatus('approved')}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Approve
                </button>
              )}
              {artisan.application_submitted && form.status !== 'suspended' && (
                <button
                  type="button"
                  className={`${actionBaseClass} border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 focus-visible:outline-stone-700`}
                  disabled={busy}
                  onClick={() => setStatus('suspended')}
                >
                  Suspend
                </button>
              )}
              {artisan.application_submitted && form.status !== 'rejected' && (
                <button
                  type="button"
                  className={`${actionBaseClass} border border-crimson-200 bg-white text-crimson-700 hover:bg-crimson-50 focus-visible:outline-crimson-700`}
                  disabled={busy}
                  onClick={() => setStatus('rejected')}
                >
                  Reject
                </button>
              )}
              <button
                type="button"
                className={`${actionBaseClass} border border-red-200 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-red-700`}
                disabled={busy}
                onClick={remove}
              >
                <Trash2 size={15} aria-hidden="true" />
                Delete verification
              </button>
            </div>
          </section>
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/75 p-4 backdrop-blur-sm"
          onClick={() => setZoom(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${zoom.label} preview`}
            className="max-h-full w-full max-w-4xl overflow-auto rounded-2xl border border-white/15 bg-white p-3 shadow-2xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-serif text-lg font-bold text-brand-900">{zoom.label}</h2>
              <button
                type="button"
                onClick={() => setZoom(null)}
                aria-label="Close preview"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-stone-600 transition hover:bg-canvas hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre-700"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {zoom.mediaType?.startsWith('video/')
              ? <video src={zoom.url ?? ''} className="mx-auto max-h-[72vh] max-w-full rounded-xl bg-charcoal-950" controls playsInline />
              : <img src={zoom.url ?? ''} alt={zoom.label} className="mx-auto max-h-[72vh] rounded-xl object-contain" />}
          </section>
        </div>
      )}
    </>
  );
}
