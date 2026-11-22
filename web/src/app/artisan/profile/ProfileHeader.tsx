'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Camera, LoaderCircle, ShieldCheck } from 'lucide-react';
import { compressImage } from '@/lib/imageCompress';
import { useArtisanLanguage } from '@/components/ArtisanLanguageProvider';

export default function ProfileHeader({
  artisanId,
  name,
  businessName,
  profilePicture,
}: {
  artisanId: number;
  name: string;
  businessName: string;
  profilePicture: string | null;
}) {
  const router = useRouter();
  const { t } = useArtisanLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  async function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setUploading(true);
    setMsg(null);

    try {
      const compressed = await compressImage(file, 800, 800, 0.85);
      const fd = new FormData();
      fd.append('file', compressed);

      const res = await fetch('/api/artisan/profile/photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to upload photo.');
      }

      if (typeof data.profile_picture !== 'string') {
        throw new Error('Photo uploaded, but the updated profile image could not be loaded.');
      }

      URL.revokeObjectURL(previewUrl);
      setPreview(data.profile_picture);
      setMsg({ text: t('Photo updated.') });
      router.refresh();
    } catch (err: unknown) {
      URL.revokeObjectURL(previewUrl);
      setPreview(profilePicture);
      setMsg({ text: (err as Error).message || 'Failed to upload photo.', error: true });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const photo = preview || profilePicture;

  return (
    <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#4b1717] via-[#7f2422] to-[#9E2A2B] px-6 py-7 text-white shadow-lg sm:px-9 sm:py-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-[0.12]"
        style={{ backgroundImage: "url('/images/kalinga-weave.svg')", backgroundSize: '240px' }}
      />
      <div aria-hidden="true" className="absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -right-8 -top-20 -z-10 h-56 w-56 rounded-full border border-white/10" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-ochre-300 bg-white/10 shadow-md sm:h-28 sm:w-28">
          {photo ? (
            <img src={photo} alt={`${name}'s profile`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-4xl font-bold text-ochre-200">
              {name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/65 text-[11px] font-semibold text-white">
              <LoaderCircle size={19} className="animate-spin" aria-hidden="true" />
              {t('Uploading')}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ochre-200">
            <ShieldCheck size={14} aria-hidden="true" />
            {t('Artisan profile')}
          </p>
          <h1 className="mt-2 break-words font-serif text-2xl font-bold leading-tight sm:text-3xl">{businessName}</h1>
          <p className="mt-1 text-sm font-medium text-white/80">{name}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            {t('Manage your public identity and share the story behind your craft.')}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onSelect}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-ochre-300 px-3.5 py-2.5 text-xs font-bold text-charcoal-950 transition hover:bg-ochre-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
              {uploading ? t('Uploading…') : t('Change photo')}
            </button>

            <Link
              href={`/artisans/${artisanId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              {t('View public profile')} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {msg && (
            <p role={msg.error ? 'alert' : 'status'} className={`mt-3 text-xs font-semibold ${msg.error ? 'text-red-100' : 'text-ochre-100'}`}>
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}