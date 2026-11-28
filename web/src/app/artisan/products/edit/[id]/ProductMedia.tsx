'use client';

import { useRef, useState } from 'react';
import { compressImage } from '@/lib/imageCompress';
import { AlertCircle, Camera, Image as ImageIcon, LoaderCircle, Plus, Trash2, Upload, X } from 'lucide-react';

// Product media manager shown on the edit page (needs the product to exist).
// Main image and gallery images with automatic client-side canvas compression.
export default function ProductMedia({
  productId, initialMain, initialGallery,
}: {
  productId: number;
  initialMain: string | null;
  initialGallery: string[] | null;
}) {
  const [main, setMain] = useState<string | null>(initialMain);
  const [gallery, setGallery] = useState<string[]>(initialGallery ?? []);
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState('');
  const mainInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  async function upload(
    file: File,
    kind: 'main' | 'gallery',
    clearBusyOnFinish = true,
    progressLabel?: string,
  ): Promise<boolean> {
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return false;
    }

    try {
      setBusy(progressLabel ?? `Optimizing ${kind === 'main' ? 'cover' : 'gallery'} photo…`);
      const compressedFile = await compressImage(file, 1200, 1200, 0.8);
      setBusy(kind === 'main' ? 'Uploading cover photo…' : 'Adding photo to gallery…');

      const formData = new FormData();
      formData.append('productId', String(productId));
      formData.append('kind', kind);
      formData.append('file', compressedFile);

      const response = await fetch(`/api/artisan/products/${productId}/media`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        setError(data.message || 'The photo could not be uploaded. Please try again.');
        return false;
      }

      if (kind === 'main') {
        setMain(data.image_path);
      } else if (Array.isArray(data.product_gallery)) {
        setGallery(data.product_gallery);
      }
      return true;
    } catch (cause) {
      console.error('[product-media] upload failed:', cause);
      setError('The photo could not be uploaded. Check your connection and try again.');
      return false;
    } finally {
      if (clearBusyOnFinish) setBusy('');
    }
  }

  async function handleGalleryFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    try {
      for (let index = 0; index < files.length; index++) {
        const uploaded = await upload(
          files[index],
          'gallery',
          false,
          `Preparing photo ${index + 1} of ${files.length}…`,
        );
        if (!uploaded) break;
      }
    } finally {
      setBusy('');
    }
  }

  async function removeMain() {
    setError('');
    setBusy('Removing cover photo…');
    try {
      const response = await fetch(`/api/artisan/products/${productId}/media?productId=${productId}&kind=main-remove`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('The cover photo could not be removed.');
      setMain(null);
    } catch (cause) {
      console.error('[product-media] failed to remove cover photo:', cause);
      setError(cause instanceof Error ? cause.message : 'The cover photo could not be removed.');
    } finally {
      setBusy('');
    }
  }

  async function removeGallery(url: string) {
    setError('');
    setBusy('Removing gallery photo…');
    try {
      const response = await fetch(`/api/artisan/products/${productId}/media?productId=${productId}&url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'The gallery photo could not be removed.');
      }
      setGallery(data.product_gallery ?? []);
    } catch (cause) {
      console.error('[product-media] failed to remove gallery photo:', cause);
      setError(cause instanceof Error ? cause.message : 'The gallery photo could not be removed.');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-abaca-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ochre-50 text-ochre-800">
            <Camera size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Photo story</h2>
            <p className="mt-0.5 text-xs leading-5 text-stone-500">Show the details and care behind your creation.</p>
          </div>
        </div>
        <span className="badge border border-abaca-200 bg-canvas text-stone-600">No fixed photo limit</span>
      </header>

      <div className="space-y-5 p-4 sm:p-6">
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        {busy && (
          <p role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-ochre-200 bg-ochre-50/70 px-4 py-3 text-sm font-medium text-ochre-900">
            <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
            {busy}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <section aria-labelledby="cover-photo-title" className="rounded-2xl border border-abaca-200/70 bg-canvas/70 p-4">
            <div className="mb-3">
              <h3 id="cover-photo-title" className="text-sm font-bold text-brand-900">Cover photo</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">This is the first photo buyers see in the marketplace.</p>
            </div>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-abaca-200 bg-white">
              {main ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={main} alt="Current cover photo for this creation" className="h-full w-full object-cover" />
              ) : (
                <div className="px-5 text-center">
                  <ImageIcon size={28} aria-hidden="true" className="mx-auto text-abaca-500" />
                  <p className="mt-2 text-sm font-semibold text-stone-700">No cover photo yet</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">Choose a clear, well-lit photo of your craft.</p>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary min-h-10 px-3 text-xs"
                disabled={!!busy}
                onClick={() => mainInput.current?.click()}
              >
                <Upload size={15} aria-hidden="true" />
                {main ? 'Replace cover photo' : 'Upload cover photo'}
              </button>
              {main && (
                <button
                  type="button"
                  className="btn-outline min-h-10 px-3 text-xs text-red-700 hover:border-red-300 hover:bg-red-50"
                  disabled={!!busy}
                  onClick={() => void removeMain()}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-stone-500">JPEG, PNG, or WebP. Photos are optimized before upload.</p>
            <input
              ref={mainInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose a cover photo"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file, 'main');
                event.target.value = '';
              }}
            />
          </section>

          <section aria-labelledby="gallery-title" className="rounded-2xl border border-abaca-200/70 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="gallery-title" className="text-sm font-bold text-brand-900">Gallery</h3>
                <p className="mt-1 text-xs leading-5 text-stone-500">Add close-ups, materials, and different angles.</p>
              </div>
              <span className="badge border border-abaca-200 bg-canvas text-stone-600">{gallery.length} photos</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((url, index) => (
                <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-abaca-200 bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Gallery photo ${index + 1}`} className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]" />
                  <button
                    type="button"
                    onClick={() => void removeGallery(url)}
                    disabled={!!busy}
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-red-700 shadow-sm transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                    aria-label={`Remove gallery photo ${index + 1}`}
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {gallery.length === 0 && (
                <div className="col-span-2 flex aspect-[2/1] flex-col items-center justify-center rounded-xl border border-dashed border-abaca-300 bg-canvas/60 px-4 text-center sm:col-span-3">
                  <ImageIcon size={23} aria-hidden="true" className="text-abaca-500" />
                  <p className="mt-2 text-sm font-semibold text-stone-700">Your gallery is ready for more views</p>
                  <p className="mt-1 text-xs text-stone-500">A few photos help buyers appreciate your craft.</p>
                </div>
              )}
              <button
                type="button"
                className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-abaca-300 bg-canvas/50 text-ochre-800 transition hover:border-ochre-500 hover:bg-ochre-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-600"
                onClick={() => galleryInput.current?.click()}
                disabled={!!busy}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Plus size={19} aria-hidden="true" />
                </span>
                <span className="mt-2 text-xs font-semibold">Add photos</span>
              </button>
            </div>
            <input
              ref={galleryInput}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              aria-label="Choose gallery photos"
              className="hidden"
              onChange={(event) => {
                void handleGalleryFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </section>
        </div>
      </div>
    </section>
  );
}
