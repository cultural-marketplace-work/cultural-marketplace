'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, LoaderCircle, Save } from 'lucide-react';
import { useArtisanLanguage } from '@/components/ArtisanLanguageProvider';

export interface ArtisanProfileInitialData {
  name: string;
  email: string;
  business_name?: string;
  craft_type?: string;
  phone?: string;
  location?: string;
  bio?: string;
  profile_picture?: string | null;
  preferred_language?: 'en' | 'ceb';
}

const labelClass = 'mb-1.5 block text-xs font-semibold text-stone-600';
const inputClass = 'input !rounded-xl !py-2.5';

export default function ProfileForm({ initial }: { initial: ArtisanProfileInitialData }) {
  const router = useRouter();
  const { t } = useArtisanLanguage();

  const [form, setForm] = useState({
    name: initial.name ?? '',
    business_name: initial.business_name ?? '',
    craft_type: initial.craft_type ?? '',
    phone: initial.phone ?? '',
    location: initial.location ?? '',
    bio: initial.bio ?? '',
    preferred_language: initial.preferred_language ?? 'en',
  });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/artisan/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Save failed.');
      }
      setMsg({ text: t('Profile updated successfully.') });
      router.refresh();
    } catch (err: unknown) {
      setMsg({ text: (err as Error).message || t('Save failed.'), error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-abaca-200/80 bg-white/95 p-5 shadow-sm sm:p-7">
      <div className="border-b border-stone-100 pb-5">
        <h3 className="font-serif text-xl font-bold text-brand-900">{t('Account information')}</h3>
        <p className="mt-1 text-sm leading-5 text-stone-500">{t('The details customers and the marketplace use to recognize your work.')}</p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="ap-language">{t('Language preference')}</label>
          <select
            id="ap-language"
            className={inputClass}
            value={form.preferred_language}
            onChange={(e) => set('preferred_language', e.target.value as 'en' | 'ceb')}
          >
            <option value="en">English — Default</option>
            <option value="ceb">Bisaya (Cebuano)</option>
          </select>
          <p className="mt-1.5 text-xs text-stone-500">{t('Choose the language you are most comfortable using.')}</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="ap-email">{t('Email')}</label>
          <input
            id="ap-email"
            className={`${inputClass} cursor-not-allowed bg-canvas/70 text-stone-500`}
            value={initial.email}
            disabled
          />
          <p className="mt-1.5 text-xs text-stone-500">{t('Contact an administrator if you need to change your email.')}</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="ap-name">{t('Full name')}</label>
          <input
            id="ap-name"
            className={inputClass}
            autoComplete="name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ap-business">{t('Business or organization name')}</label>
          <input
            id="ap-business"
            className={inputClass}
            autoComplete="organization"
            value={form.business_name}
            onChange={(e) => set('business_name', e.target.value)}
            placeholder="e.g. Agusan Woven Heritage Atelier"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ap-craft">{t('Primary craft specialization')}</label>
          <input
            id="ap-craft"
            className={inputClass}
            value={form.craft_type}
            onChange={(e) => set('craft_type', e.target.value)}
            placeholder="e.g. Traditional Banig Weaving"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="ap-phone">{t('Phone number')}</label>
          <input
            id="ap-phone"
            className={inputClass}
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="e.g. 09171234567"
          />
          <p className="mt-1.5 text-xs text-stone-500">{t('Used for courier dispatches and pickup coordination.')}</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="ap-location">{t('Workshop or community location')}</label>
          <input
            id="ap-location"
            className={inputClass}
            autoComplete="address-level2"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Bunawan, Agusan del Sur"
          />
        </div>
      </div>

      <div className="mt-7 border-t border-stone-100 pt-6">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
            <BookOpen size={17} aria-hidden="true" />
          </span>
          <div>
            <h4 className="font-serif text-lg font-bold text-brand-900">{t('Your craft story')}</h4>
            <p className="mt-0.5 text-xs leading-5 text-stone-500">{t('Introduce your community, techniques, and materials to customers.')}</p>
          </div>
        </div>
        <label className={labelClass} htmlFor="ap-bio">{t('Artisan background and cultural story')}</label>
        <textarea
          id="ap-bio"
          className={`${inputClass} min-h-[130px] resize-y leading-relaxed`}
          value={form.bio}
          onChange={(e) => set('bio', e.target.value)}
          placeholder={t('Share your heritage story: your community, your lineage, the techniques and natural materials you use...')}
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        {msg ? (
          <p
            role={msg.error ? 'alert' : 'status'}
            className={`text-sm font-medium ${msg.error ? 'text-crimson-700' : 'text-ochre-800'}`}
          >
            {msg.text}
          </p>
        ) : (
          <p className="text-xs text-stone-400">{t('Remember to save your changes.')}</p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-primary w-full !rounded-xl !py-2.5 sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          {busy ? t('Saving changes…') : t('Save profile')}
        </button>
      </div>
    </div>
  );
}
