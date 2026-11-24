'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Save, UserRound } from 'lucide-react';

export interface ProfileInitialData {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  profile_picture?: string | null;
}

type ProfileMessage = { text: string; error?: boolean } | null;

const labelClass = 'mb-1.5 block text-sm font-semibold text-[#3D3028]';
const fieldClass = 'w-full rounded-xl border border-[#E8DCCB] bg-white px-3 py-2.5 text-sm text-[#3D3028] outline-none transition placeholder:text-[#A69B90] focus:border-[#B78B45] focus:ring-2 focus:ring-[#D6B56D]/20';

export default function ProfileForm({ initial }: { initial: ProfileInitialData }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: initial.name,
    phone: initial.phone ?? '',
    location: initial.location ?? '',
    bio: initial.bio ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<ProfileMessage>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/customer/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { status?: string; message?: string };
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Could not save your profile.');
      }
      setMsg({ text: 'Your profile details were saved.' });
      router.refresh();
    } catch (error: unknown) {
      setMsg({
        text: error instanceof Error ? error.message : 'Could not save your profile. Please try again.',
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="border-b border-[#F0E8DD] bg-gradient-to-r from-[#FFFDFA] to-white px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3DE] text-[#80500D]">
            <UserRound size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#3D3028]">Personal details</h2>
            <p className="mt-1 text-sm leading-5 text-[#71675F]">Keep your contact information current for orders and workshop bookings.</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="customer-profile-email" className={labelClass}>Email address</label>
            <input
              id="customer-profile-email"
              type="email"
              className={`${fieldClass} cursor-not-allowed bg-[#FAF7F1] text-[#8A7D71]`}
              value={initial.email}
              disabled
            />
            <p className="mt-1.5 text-xs leading-5 text-[#8A7D71]">Your login email cannot be changed here.</p>
          </div>

          <div>
            <label htmlFor="customer-profile-name" className={labelClass}>Full name</label>
            <input
              id="customer-profile-name"
              className={fieldClass}
              autoComplete="name"
              maxLength={100}
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="customer-profile-phone" className={labelClass}>Phone number</label>
            <input
              id="customer-profile-phone"
              type="tel"
              className={fieldClass}
              autoComplete="tel"
              maxLength={30}
              value={form.phone}
              onChange={(event) => set('phone', event.target.value)}
              placeholder="09XXXXXXXXX"
            />
            <p className="mt-1.5 text-xs leading-5 text-[#8A7D71]">Used for delivery updates and workshop contact.</p>
          </div>

          <div>
            <label htmlFor="customer-profile-location" className={labelClass}>Location or city</label>
            <input
              id="customer-profile-location"
              className={fieldClass}
              autoComplete="address-level2"
              maxLength={100}
              value={form.location}
              onChange={(event) => set('location', event.target.value)}
              placeholder="e.g. Prosperidad, Agusan del Sur"
            />
          </div>
        </div>

        <div>
          <label htmlFor="customer-profile-bio" className={labelClass}>About you</label>
          <textarea
            id="customer-profile-bio"
            className={`${fieldClass} min-h-28 resize-y`}
            maxLength={1000}
            value={form.bio}
            onChange={(event) => set('bio', event.target.value)}
            placeholder="Share a little about yourself or your interest in Indigenous crafts and cultural heritage."
          />
          <p className="mt-1.5 text-right text-xs text-[#8A7D71]">{form.bio.length}/1000</p>
        </div>

        {msg && (
          <div
            role={msg.error ? 'alert' : 'status'}
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
              msg.error
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            {msg.error
              ? <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              : <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />}
            <p>{msg.text}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-[#F0E8DD] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#71675F]">Your email is kept as your login and contact address.</p>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#6F0000] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B56D]"
            disabled={busy}
          >
            {busy ? 'Saving…' : <><Save size={16} aria-hidden="true" /> Save profile</>}
          </button>
        </div>
      </div>
    </form>
  );
}
