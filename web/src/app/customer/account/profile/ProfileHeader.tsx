'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { compressImage } from '@/lib/imageCompress';

type UploadMessage = { text: string; error?: boolean } | null;

export default function ProfileHeader({
  name,
  profilePicture,
}: {
  name: string;
  profilePicture: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<UploadMessage>(null);

  async function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setUploading(true);
    setMsg(null);

    try {
      const compressed = await compressImage(file, 800, 800, 0.85);
      const formData = new FormData();
      formData.append('file', compressed);

      const res = await fetch('/api/customer/profile/photo', { method: 'POST', body: formData });
      const data = await res.json() as { status?: string; message?: string; profile_picture?: string };
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to upload photo.');
      }
      if (!data.profile_picture) {
        throw new Error('Photo uploaded, but the updated profile image could not be loaded.');
      }

      URL.revokeObjectURL(previewUrl);
      setPreview(data.profile_picture);
      setMsg({ text: 'Profile photo updated.' });
      router.refresh();
    } catch (error: unknown) {
      URL.revokeObjectURL(previewUrl);
      setPreview(null);
      setMsg({
        text: error instanceof Error ? error.message : 'Failed to upload photo. Please try again.',
        error: true,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const photo = preview || profilePicture;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#E8DCCB] bg-white p-5 shadow-sm sm:p-8">
      <div aria-hidden="true" className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#F8EEDC] opacity-70" />
      <div aria-hidden="true" className="absolute -right-2 bottom-0 h-24 w-24 rounded-full border-[14px] border-[#F3E5CD] opacity-50" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-[#D6B56D] bg-[#F5EBDD] shadow-sm sm:h-28 sm:w-28">
          {photo ? (
            <img src={photo} alt={`${name}'s profile`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-4xl font-bold text-[#80500D]">
              {name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#3D3028]/75 text-xs font-semibold text-white">
              <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
              Uploading…
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#80500D]">
            <ShieldCheck size={14} aria-hidden="true" />
            Customer profile
          </p>
          <h1 className="mt-2 break-words font-serif text-3xl font-bold leading-tight text-[#3D3028] sm:text-4xl">My profile</h1>
          <p className="mt-1 text-sm font-medium text-[#5A4030]">{name}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#71675F]">
            Update your personal details and the photo shown on your customer account.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Choose a profile photo"
              onChange={onSelect}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#8B0000] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#6F0000] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6B56D]"
            >
              {uploading ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
              {uploading ? 'Uploading…' : 'Change profile photo'}
            </button>
            <Link
              href="/customer/account/dashboard"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#D8C8B5] bg-white px-4 py-2.5 text-sm font-semibold text-[#5A4030] transition hover:bg-[#FFF5E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B0000]"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to dashboard
            </Link>
          </div>
          <p className="mt-2 text-xs text-[#8A7D71]">JPEG, PNG, or WebP · up to 8 MB</p>

          {msg && (
            <p
              role={msg.error ? 'alert' : 'status'}
              className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                msg.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {!msg.error && <CheckCircle2 size={15} aria-hidden="true" />}
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
