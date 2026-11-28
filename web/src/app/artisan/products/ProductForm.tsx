'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  CircleHelp,
  MapPin,
  Package,
  Plus,
  Save,
  Trash2,
  LoaderCircle,
  X,
} from 'lucide-react';
import type { Variation, TutorialDate } from '@/lib/types';
import type { LocationData } from '@/components/MapPinPicker';
import { LogoLoadingOverlay } from '@/components/LogoLoading';
import { compressImage } from '@/lib/imageCompress';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MapPinPicker = dynamic(() => import('@/components/MapPinPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center gap-2 rounded-xl border border-abaca-200 bg-canvas text-sm text-stone-600">
      <MapPin size={18} className="text-ochre-800" aria-hidden="true" />
      Loading the workshop map…
    </div>
  ),
});

interface FormState {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  category: string;
  has_tutorial: boolean;
  tutorial_title: string;
  tutorial_description: string;
  tutorial_price: string;
  tutorial_capacity: string;
  tutorial_fee_type: 'paid' | 'free';
  tutorial_location: string;
  tutorial_lat: number | null;
  tutorial_lng: number | null;
  materials_used: string;
}

const STANDARD_VARIATION_TYPES = [
  { type: 'size', typeLabel: 'Size' },
  { type: 'color', typeLabel: 'Color' },
  { type: 'material', typeLabel: 'Material' },
  { type: 'pattern', typeLabel: 'Pattern' },
  { type: 'others', typeLabel: 'Other' },
];

export default function ProductForm({
  mode,
  productId,
  categories,
  initial,
  initialHasVariations,
  initialVariations,
  initialTutorialDates,
  tutorialManagedSeparately = false,
}: {
  mode: 'create' | 'edit';
  productId?: number;
  categories: Array<{ id: number; name: string }>;
  initial?: Partial<FormState>;
  initialHasVariations?: boolean;
  initialVariations?: Variation[];
  initialTutorialDates?: TutorialDate[];
  tutorialManagedSeparately?: boolean;
}) {
  const initialCat = (initial?.category ?? '').trim();
  const legacyCat =
    initialCat && !categories.some((c) => c.name.toLowerCase() === initialCat.toLowerCase())
      ? initialCat
      : null;
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    category: '',
    has_tutorial: false,
    tutorial_title: '',
    tutorial_description: '',
    tutorial_price: '',
    tutorial_capacity: '',
    tutorial_fee_type: 'paid',
    tutorial_location: '',
    tutorial_lat: 8.1752,
    tutorial_lng: 125.9934,
    materials_used: '',
    ...initial,
  });

  const [hasVariations, setHasVariations] = useState(initialHasVariations ?? false);
  const [variations, setVariations] = useState<Variation[]>(initialVariations ?? []);
  const [variationPhotoFiles, setVariationPhotoFiles] = useState<Array<File | null>>(
    () => initialVariations?.map(() => null) ?? []
  );
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [tutorialDates, setTutorialDates] = useState<TutorialDate[]>(
    initialTutorialDates && initialTutorialDates.length > 0
      ? initialTutorialDates
      : [
          {
            date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
            time_start: '09:00',
            time_end: '12:00',
            location: initial?.tutorial_location ?? '',
          },
        ]
  );

  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);
  const [hasUploadedCover, setHasUploadedCover] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<File[]>([]);
  const [tutorialPromptOpen, setTutorialPromptOpen] = useState(false);
  const tutorialPromptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tutorialPromptOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const dialog = tutorialPromptRef.current;
    document.body.style.overflow = 'hidden';
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setTutorialPromptOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      window.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [tutorialPromptOpen]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addSessionDate() {
    setTutorialDates((prev) => [
      ...prev,
      {
        date: new Date(Date.now() + 86400000 * (prev.length + 3)).toISOString().split('T')[0],
        time_start: '09:00',
        time_end: '12:00',
        location: form.tutorial_location || '',
      },
    ]);
  }

  function updateSessionDate(index: number, patch: Partial<TutorialDate>) {
    setTutorialDates((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeSessionDate(index: number) {
    setTutorialDates((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLocationPin(loc: LocationData) {
    setForm((f) => ({
      ...f,
      tutorial_lat: loc.lat,
      tutorial_lng: loc.lng,
      tutorial_location: loc.locationName,
    }));
  }

  async function uploadProductPhoto(
    productId: number,
    file: File,
    kind: 'main' | 'gallery' | 'variation',
    variationIndex?: number
  ): Promise<string> {
    const compressedFile = await compressImage(file, 1200, 1200, 0.8);
    if (compressedFile.size > MAX_UPLOAD_BYTES) {
      throw new Error(`${file.name} is still larger than 8 MB after compression.`);
    }

    const formData = new FormData();
    formData.append('productId', String(productId));
    formData.append('kind', kind);
    if (kind === 'variation' && variationIndex != null) {
      formData.append('variationIndex', String(variationIndex));
    }
    formData.append('file', compressedFile);
    const response = await fetch(`/api/artisan/products/${productId}/media`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json() as {
      status?: string;
      message?: string;
      url?: string;
    };
    if (!response.ok || data.status !== 'success') {
      throw new Error(data.message || `Could not upload ${file.name}.`);
    }
    if (!data.url) {
      throw new Error(`The photo ${file.name} uploaded but its address could not be confirmed.`);
    }
    return data.url;
  }

  async function uploadVariationPhotos(productId: number, formIndexes: number[]) {
    for (const [variationIndex, formIndex] of formIndexes.entries()) {
      const photo = variationPhotoFiles[formIndex];
      if (!photo) continue;

      const imagePath = await uploadProductPhoto(productId, photo, 'variation', variationIndex);
      setVariations((current) => current.map((variation, index) => (
        index === formIndex ? { ...variation, image_path: imagePath } : variation
      )));
      setVariationPhotoFiles((current) => current.map((file, index) => (
        index === formIndex ? null : file
      )));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setSaved(false);

    const validVariationEntries = hasVariations
      ? variations
          .map((variation, index) => ({ variation, index }))
          .filter(({ variation }) => variation.name?.trim() && (variation.typeLabel || '').trim())
      : [];
    const validVariations = hasVariations
      ? validVariationEntries.map(({ variation }) => variation)
      : null;

    if (hasVariations && (!validVariations || validVariations.length === 0)) {
      setError('Please add at least one complete variation option with a name and type label, or uncheck variations.');
      setBusy(false);
      return;
    }

    const effectiveCategory = isCustomCategory ? customCategory.trim() : form.category;
    if (!effectiveCategory) {
      setError('Please select or enter a category.');
      setBusy(false);
      return;
    }

    const {
      has_tutorial,
      tutorial_title,
      tutorial_description,
      tutorial_price: formTutorialPrice,
      tutorial_capacity,
      tutorial_fee_type,
      tutorial_location,
      tutorial_lat,
      tutorial_lng,
      ...creationFields
    } = form;
    const payload: Record<string, unknown> = {
      ...creationFields,
      ...(tutorialManagedSeparately ? {} : {
        has_tutorial,
        tutorial_title,
        tutorial_description,
        tutorial_price:
          has_tutorial && formTutorialPrice !== ''
            ? Number(formTutorialPrice)
            : null,
        tutorial_capacity:
          has_tutorial && tutorial_capacity !== ''
            ? Number(tutorial_capacity)
            : null,
        tutorial_fee_type,
        tutorial_location: has_tutorial ? tutorial_location || null : null,
        tutorial_lat: has_tutorial ? tutorial_lat : null,
        tutorial_lng: has_tutorial ? tutorial_lng : null,
        tutorial_dates: has_tutorial ? tutorialDates : null,
      }),
      category: effectiveCategory,
      price: Number(form.price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      has_variations: hasVariations,
      variations_data: validVariations,
      materials_used: form.materials_used ? form.materials_used.trim() : null,
    };

    try {
      if (mode === 'create') {
        let savedProductId = createdProductId;
        if (savedProductId == null) {
          const res = await fetch('/api/artisan/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || data.status !== 'success') {
            throw new Error(data.message || 'Could not save your creation. Please check the details and try again.');
          }
          savedProductId = Number(data.id);
          if (!Number.isSafeInteger(savedProductId) || savedProductId <= 0) {
            throw new Error('Your product was saved, but its ID could not be confirmed. Refresh your products page before trying again.');
          }
          setCreatedProductId(savedProductId);
        } else {
          const res = await fetch(`/api/artisan/products/${savedProductId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok || data.status !== 'success') {
            throw new Error(data.message || 'Could not save your product changes.');
          }
        }

        let photosToUpload = [...galleryPhotos];
        if (!hasUploadedCover && photosToUpload.length > 0) {
          await uploadProductPhoto(savedProductId, photosToUpload[0], 'main');
          setHasUploadedCover(true);
          photosToUpload = photosToUpload.slice(1);
          setGalleryPhotos(photosToUpload);
        }
        for (const photo of photosToUpload) {
          await uploadProductPhoto(savedProductId, photo, 'gallery');
          setGalleryPhotos((current) => current.filter((item) => item !== photo));
        }
        await uploadVariationPhotos(savedProductId, validVariationEntries.map(({ index }) => index));
        setSaved(true);
        setTutorialPromptOpen(true);
      } else {
        if (productId == null) {
          throw new Error('The product ID is missing. Refresh the page and try again.');
        }
        const res = await fetch(`/api/artisan/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data.status !== 'success') {
          throw new Error(data.message || 'Could not save your changes. Please try again.');
        }
        await uploadVariationPhotos(productId, validVariationEntries.map(({ index }) => index));
        if (tutorialManagedSeparately) {
          setSaved(true);
          router.refresh();
        } else {
          router.push('/artisan/products');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onChangeCapture={() => {
        if (mode === 'create') setSaved(false);
      }}
      aria-busy={busy}
      className="mt-6 space-y-5"
    >
      {busy && (
        <LogoLoadingOverlay
          message={mode === 'create' ? 'Saving product and photos…' : 'Saving product…'}
        />
      )}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800">
          <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">
              {mode === 'create' && createdProductId ? 'Product created; changes or photo uploads need attention' : "We couldn't save this listing"}
            </p>
            <p className="mt-0.5 leading-5">{error}</p>
          </div>
        </div>
      )}
      {saved && (
        <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {mode === 'create' ? 'Product details and photos saved.' : 'Product details saved.'}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-gradient-to-r from-white to-[#fffaf0] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">
            <Package size={13} className="mr-1 inline" aria-hidden="true" />
            {mode === 'create' ? 'Step 1 · Product details' : 'Product details'}
          </p>
          <p className="mt-1 text-sm leading-5 text-stone-600">
            {mode === 'create'
              ? 'Add the information buyers need. You can add photos after saving.'
              : 'Update the details buyers see in the marketplace.'}
          </p>
        </div>
        {mode === 'create' && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-ochre-300 bg-white px-3 py-1.5 text-xs font-semibold text-ochre-900">
            <Camera size={14} aria-hidden="true" /> Photos come next
          </span>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        <div className="flex items-start gap-3 border-b border-stone-100 bg-canvas/70 px-4 py-4 sm:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ochre-100 font-serif text-sm font-bold text-ochre-900">1</span>
          <div>
            <h2 className="font-serif text-lg font-bold text-brand-900">About your creation</h2>
            <p className="mt-0.5 text-xs leading-5 text-stone-500">Use a clear name and describe what makes this handmade item special.</p>
          </div>
        </div>
        <div className="space-y-5 p-4 sm:p-6">
        <div>
          <label htmlFor="product-name" className="mb-1.5 block text-sm font-semibold text-stone-700">Name of your creation <span className="text-crimson-700">*</span></label>
          <input id="product-name" className="input min-h-11" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="For example: Handwoven abaca basket" required />
          <p className="mt-1.5 text-xs text-stone-500">Choose a name that will help buyers recognize your craft.</p>
        </div>
        <div>
          <label htmlFor="product-description" className="mb-1.5 block text-sm font-semibold text-stone-700">Tell buyers about it</label>
          <textarea id="product-description" className="input min-h-28 resize-y leading-6" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe how it is made, how it can be used, and what buyers should know." />
          <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-stone-500">
            <CircleHelp size={14} className="mt-0.5 shrink-0 text-ochre-800" aria-hidden="true" />
            Share only cultural knowledge and details that you and your community are comfortable making public.
          </p>
        </div>
        <div>
          <label htmlFor="product-materials" className="mb-1.5 block text-sm font-semibold text-stone-700">
            Materials used <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <input
            id="product-materials"
            className="input min-h-11"
            value={form.materials_used}
            onChange={(e) => set('materials_used', e.target.value)}
            placeholder="For example: abaca fiber, bamboo, natural dyes"
          />
          <p className="mt-1.5 text-xs text-stone-500">Name the materials used to make this item.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="product-price" className="mb-1.5 block text-sm font-semibold text-stone-700">Price per item <span className="text-crimson-700">*</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-stone-500">₱</span>
              <input id="product-price" className="input min-h-11 pl-8" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0.00" required />
            </div>
          </div>
          <div>
            <label htmlFor="product-stock" className="mb-1.5 block text-sm font-semibold text-stone-700">How many are available? <span className="text-crimson-700">*</span></label>
            <input id="product-stock" className="input min-h-11" type="number" min="0" step="1" inputMode="numeric" value={form.stock_quantity} onChange={(e) => set('stock_quantity', e.target.value)} placeholder="0" required />
          </div>
          <div>
            <label htmlFor="product-category" className="mb-1.5 block text-sm font-semibold text-stone-700">Choose a category <span className="text-crimson-700">*</span></label>
            <select
              id="product-category"
              className={`input ${(form.category || isCustomCategory) ? 'border-ochre-400' : 'border-stone-300'}`}
              value={isCustomCategory ? '__other__' : form.category}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__other__') {
                  setIsCustomCategory(true);
                  set('category', '__other__');
                } else {
                  setIsCustomCategory(false);
                  set('category', val);
                }
              }}
              required={!isCustomCategory}
            >
              <option value="" disabled>Select the closest match…</option>
              {legacyCat && <option value={legacyCat}>{legacyCat} (legacy — please update)</option>}
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__other__">Other — enter a new category</option>
            </select>
            {isCustomCategory && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  className="input min-h-11 text-sm border-brand-400 bg-brand-50/40"
                  aria-label="New category name"
                  placeholder="Type the category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                />
                <p className="text-xs leading-5 text-brand-700">
                  This category will be available for other listings too.
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        <div className="flex items-start gap-3 border-b border-stone-100 bg-canvas/70 px-4 py-4 sm:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ochre-100 font-serif text-sm font-bold text-ochre-900">2</span>
          <div>
            <h2 className="font-serif text-lg font-bold text-brand-900">Options for this creation</h2>
            <p className="mt-0.5 text-xs leading-5 text-stone-500">Optional · Add choices such as size, color, material, or pattern.</p>
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-abaca-200 bg-white px-4 py-3.5 transition hover:border-ochre-400 hover:bg-ochre-50/40">
          <input className="mt-0.5 h-5 w-5 shrink-0 accent-crimson-600" type="checkbox" checked={hasVariations} onChange={(e) => setHasVariations(e.target.checked)} />
          <span>
            <span className="block text-sm font-semibold text-stone-800">Buyers can choose different options</span>
            <span className="mt-0.5 block text-xs leading-5 text-stone-500">For example, a small or large size, or different colors and patterns.</span>
          </span>
        </label>
        {hasVariations && (
          <div className="space-y-3">
            <p className="rounded-xl bg-canvas px-4 py-3 text-xs leading-5 text-stone-600">
              Add one row for each choice buyers can select. You can also enter your own option type, such as wood finish or bead pattern.
            </p>
            {variations.map((v, idx) => {
              const standardTypes = ['size', 'color', 'material', 'pattern', 'others'];
              const isStandard = standardTypes.includes(v.type);
              const isCustom = !isStandard || v.type === 'custom';
              const customTypesInUse = Array.from(
                new Map(
                  variations
                    .filter((x) => !standardTypes.includes(x.type) && x.typeLabel?.trim())
                    .map((x) => [x.typeLabel.toLowerCase(), { type: x.type, typeLabel: x.typeLabel }])
                ).values()
              );

              return (
                <div key={idx} className="flex flex-wrap items-end gap-3 rounded-xl border border-abaca-200 bg-[#fffdf8] p-3 shadow-sm sm:p-4">
                  <div className="flex-1 min-w-[130px]">
                    <label htmlFor={`variation-type-${idx}`} className="block text-xs font-semibold text-stone-700">Option type</label>
                    <select
                      id={`variation-type-${idx}`}
                      className="input mt-1.5 min-h-11 w-full bg-white text-sm"
                      value={isStandard ? v.type : (customTypesInUse.some((ct) => ct.type === v.type) ? v.type : 'custom')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, type: 'custom', typeLabel: '' } : x)));
                        } else {
                          const std = STANDARD_VARIATION_TYPES.find((x) => x.type === val);
                          if (std) {
                            setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, type: std.type, typeLabel: std.typeLabel } : x)));
                          } else {
                            const cst = customTypesInUse.find((x) => x.type === val);
                            if (cst) {
                              setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, type: cst.type, typeLabel: cst.typeLabel } : x)));
                            }
                          }
                        }
                      }}
                    >
                      <optgroup label="Common option types">
                        {STANDARD_VARIATION_TYPES.map((t) => (
                          <option key={t.type} value={t.type}>{t.typeLabel}</option>
                        ))}
                      </optgroup>
                      {customTypesInUse.length > 0 && (
                        <optgroup label="Your Custom Types">
                          {customTypesInUse.map((ct) => (
                            <option key={ct.type} value={ct.type}>{ct.typeLabel}</option>
                          ))}
                        </optgroup>
                      )}
                      <option value="custom">Add my own option type</option>
                    </select>
                  </div>

                  {isCustom && (
                    <div className="flex-1 min-w-[120px]">
                      <label htmlFor={`variation-custom-type-${idx}`} className="block text-xs font-semibold text-brand-700">Name this option type <span className="text-crimson-700">*</span></label>
                      <input
                        id={`variation-custom-type-${idx}`}
                        className="input mt-1.5 min-h-11 w-full border-brand-400 bg-brand-50/40 text-sm"
                        placeholder="e.g. Wood Finish"
                        value={v.typeLabel}
                        onChange={(e) => {
                          const label = e.target.value;
                          const slug = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                          setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, type: slug || 'custom', typeLabel: label } : x)));
                        }}
                        required
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-[110px]">
                    <label htmlFor={`variation-value-${idx}`} className="block text-xs font-semibold text-stone-700">Choice name <span className="text-crimson-700">*</span></label>
                    <input
                      id={`variation-value-${idx}`}
                      className="input mt-1.5 min-h-11 w-full bg-white text-sm"
                      placeholder={isCustom ? 'For example: mahogany' : 'For example: small or red'}
                      value={v.name}
                      onChange={(e) => setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                      required
                    />
                  </div>

                  <div className="w-24 sm:w-20">
                    <label htmlFor={`variation-stock-${idx}`} className="block text-xs font-semibold text-stone-700">Available</label>
                    <input
                      id={`variation-stock-${idx}`}
                      className="input mt-1.5 min-h-11 w-full bg-white text-sm"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={v.stock}
                      onChange={(e) => setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, stock: Math.max(0, Number(e.target.value)) } : x)))}
                    />
                  </div>

                  <div className="w-28 sm:w-24">
                    <label htmlFor={`variation-price-${idx}`} className="block text-xs font-semibold text-stone-700">Extra price (₱)</label>
                    <input
                      id={`variation-price-${idx}`}
                      className="input mt-1.5 min-h-11 w-full bg-white text-sm"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={v.price}
                      onChange={(e) => setVariations((vs) => vs.map((x, i) => (i === idx ? { ...x, price: Math.max(0, Number(e.target.value)) } : x)))}
                    />
                  </div>

                  <div className="w-full border-t border-abaca-100 pt-3">
                    <label htmlFor={`variation-photo-${idx}`} className="block text-xs font-semibold text-stone-700">
                      Photo for this choice <span className="font-normal text-stone-500">(optional)</span>
                    </label>
                    <input
                      id={`variation-photo-${idx}`}
                      className="input mt-1.5 min-h-11 bg-white text-sm"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        event.currentTarget.value = '';
                        if (file && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                          setError('Choose a JPEG, PNG, or WebP photo for each variation.');
                          return;
                        }
                        setError('');
                        setVariationPhotoFiles((current) => current.map((item, index) => (
                          index === idx ? file : item
                        )));
                      }}
                    />
                    <p className="mt-1 text-[11px] leading-5 text-stone-500">
                      {variationPhotoFiles[idx]
                        ? `${variationPhotoFiles[idx]?.name} will be added to the product gallery and shown when selected.`
                        : v.image_path
                          ? 'A photo is already saved for this choice. Select another to replace it.'
                          : 'Customers will see this photo in the gallery when they choose this option.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Remove ${v.typeLabel || 'option'} ${v.name || ''}`}
                    onClick={() => {
                      setVariations((vs) => vs.filter((_, i) => i !== idx));
                      setVariationPhotoFiles((files) => files.filter((_, i) => i !== idx));
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" /> Remove
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="btn-outline min-h-11 text-sm"
              onClick={() => {
                const last = variations[variations.length - 1];
                setVariations((vs) => [
                  ...vs,
                  last
                    ? { name: '', stock: 10, price: 0, type: last.type, typeLabel: last.typeLabel }
                    : { name: '', stock: 10, price: 0, type: 'size', typeLabel: 'Size' },
                ]);
                setVariationPhotoFiles((files) => [...files, null]);
              }}
            >
              <Plus size={16} aria-hidden="true" /> Add another option
            </button>
          </div>
        )}
        </div>
      </section>

      {mode === 'create' && (
        <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
          <div className="flex items-start gap-3 border-b border-stone-100 bg-canvas/70 px-4 py-4 sm:px-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ochre-100 text-ochre-900">
              <Camera size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-brand-900">Product photos</h2>
              <p className="mt-0.5 text-xs leading-5 text-stone-500">
                Choose a cover photo and optional gallery images. They will upload when you save the product.
              </p>
            </div>
          </div>
          <div className="space-y-3 p-4 sm:p-6">
            <div>
              <label htmlFor="new-product-photos" className="mb-1.5 block text-sm font-semibold text-stone-700">
                Product photos <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                id="new-product-photos"
                className="input min-h-11"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busy}
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = '';
                  if (!files.length) return;
                  if (files.some((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type))) {
                    setError('Choose only JPEG, PNG, or WebP product photos.');
                    return;
                  }
                  setError('');
                  setSaved(false);
                  setGalleryPhotos((current) => [...current, ...files]);
                }}
              />
              <p className="mt-1.5 text-xs leading-5 text-stone-500">
                The first photo you choose becomes the cover photo. Any remaining photos are added to the gallery.
              </p>
            </div>
            {galleryPhotos.length > 0 && (
              <ul className="space-y-1.5">
                {galleryPhotos.map((photo, index) => (
                  <li key={`${photo.name}-${photo.lastModified}-${index}`} className="flex items-center justify-between gap-2 text-xs text-stone-600">
                    <span className="truncate">{photo.name}</span>
                    <button
                      type="button"
                      className="shrink-0 font-semibold text-crimson-700 hover:text-crimson-900"
                      disabled={busy}
                      onClick={() => {
                        setSaved(false);
                        setGalleryPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {mode === 'edit' && !tutorialManagedSeparately && (
      <section className="overflow-hidden rounded-2xl border border-abaca-200/80 bg-white/95 shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-[#fffaf0] to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ochre-100 text-ochre-900">
              <CalendarDays size={19} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-brand-900">Offer a workshop or experience</h2>
                {form.has_tutorial ? (
                  <span className="badge border border-ochre-300 bg-ochre-100 text-ochre-900">
                    <Check size={13} aria-hidden="true" /> Added
                  </span>
                ) : (
                  <span className="badge border border-stone-200 bg-stone-50 text-stone-600">Optional</span>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-600">
                Invite people to learn a skill or technique from you. You can add dates, location, and a fee.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-pressed={form.has_tutorial}
            aria-controls="workshop-details"
            onClick={() => set('has_tutorial', !form.has_tutorial)}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              form.has_tutorial
                ? 'border border-crimson-700 bg-crimson-700 text-white hover:bg-crimson-800'
                : 'btn-outline'
            }`}
          >
            {form.has_tutorial ? 'Remove workshop' : <><Plus size={16} aria-hidden="true" /> Add a workshop</>}
          </button>
        </div>

        {form.has_tutorial && (
          <div id="workshop-details" className="space-y-6 border-t border-stone-100 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="workshop-title" className="mb-1.5 block text-sm font-semibold text-stone-700">Workshop or experience name <span className="text-crimson-700">*</span></label>
                <input
                  id="workshop-title"
                  className="input min-h-11"
                  placeholder="For example: Learn traditional basket weaving"
                  value={form.tutorial_title}
                  onChange={(e) => set('tutorial_title', e.target.value)}
                  required={form.has_tutorial}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="workshop-description" className="mb-1.5 block text-sm font-semibold text-stone-700">What will participants learn or make? <span className="text-crimson-700">*</span></label>
                <textarea
                  id="workshop-description"
                  className="input min-h-28 resize-y leading-6"
                  placeholder="Explain what participants will do, what materials are included, and what they may take home. Share only knowledge your community is comfortable sharing."
                  value={form.tutorial_description}
                  onChange={(e) => set('tutorial_description', e.target.value)}
                  required={form.has_tutorial}
                />
              </div>

              <div>
                <label htmlFor="workshop-price" className="mb-1.5 block text-sm font-semibold text-stone-700">Fee per person (₱)</label>
                <input
                  id="workshop-price"
                  className="input min-h-11"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="For example: 250"
                  value={form.tutorial_price}
                  onChange={(e) => set('tutorial_price', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="workshop-fee-type" className="mb-1.5 block text-sm font-semibold text-stone-700">Is there a fee?</label>
                  <select
                    id="workshop-fee-type"
                    className="input min-h-11"
                    value={form.tutorial_fee_type}
                    onChange={(e) => set('tutorial_fee_type', e.target.value as 'paid' | 'free')}
                  >
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="workshop-capacity" className="mb-1.5 block text-sm font-semibold text-stone-700">How many people can join?</label>
                  <input
                    id="workshop-capacity"
                    className="input min-h-11"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    placeholder="For example: 15"
                    value={form.tutorial_capacity}
                    onChange={(e) => set('tutorial_capacity', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <MapPinPicker
                initialLat={form.tutorial_lat}
                initialLng={form.tutorial_lng}
                initialLocation={form.tutorial_location}
                onChange={handleLocationPin}
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-abaca-200 bg-canvas/60 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-brand-900">Choose workshop dates and times</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    Add one or more times when people can attend.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-outline min-h-11 text-sm"
                  onClick={addSessionDate}
                >
                  <Plus size={16} aria-hidden="true" /> Add another date
                </button>
              </div>

              <div className="space-y-2">
                {tutorialDates.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-abaca-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-12 sm:p-4"
                  >
                    <div className="lg:col-span-4">
                      <label htmlFor={`session-date-${idx}`} className="block text-xs font-semibold text-stone-700">Date</label>
                      <input
                        id={`session-date-${idx}`}
                        type="date"
                        className="input mt-1.5 min-h-11"
                        value={item.date}
                        onChange={(e) => updateSessionDate(idx, { date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label htmlFor={`session-start-${idx}`} className="block text-xs font-semibold text-stone-700">Starts</label>
                      <input
                        id={`session-start-${idx}`}
                        type="time"
                        className="input mt-1.5 min-h-11"
                        value={item.time_start}
                        onChange={(e) => updateSessionDate(idx, { time_start: e.target.value })}
                        required
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label htmlFor={`session-end-${idx}`} className="block text-xs font-semibold text-stone-700">Ends</label>
                      <input
                        id={`session-end-${idx}`}
                        type="time"
                        className="input mt-1.5 min-h-11"
                        value={item.time_end}
                        onChange={(e) => updateSessionDate(idx, { time_end: e.target.value })}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label htmlFor={`session-location-${idx}`} className="block text-xs font-semibold text-stone-700">Venue note <span className="font-normal text-stone-500">(optional)</span></label>
                      <input
                        id={`session-location-${idx}`}
                        className="input mt-1.5 min-h-11"
                        placeholder={form.tutorial_location || 'For example: community hall'}
                        value={item.location ?? ''}
                        onChange={(e) => updateSessionDate(idx, { location: e.target.value })}
                      />
                    </div>
                    {tutorialDates.length > 1 && (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 sm:col-span-2 lg:col-span-1"
                        onClick={() => removeSessionDate(idx)}
                        aria-label={`Remove date ${idx + 1}`}
                      >
                        <Trash2 size={15} aria-hidden="true" /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs leading-5 text-stone-500">
          {mode === 'create'
            ? 'Your product details and selected photos save together. You can offer a tutorial afterward.'
            : 'Your changes will appear on your marketplace listing.'}
        </p>
        <button
          className="btn-primary min-h-11 w-full !rounded-xl sm:w-auto"
          disabled={busy}
          type="submit"
        >
          {busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
          {busy ? 'Saving…' : mode === 'create' ? 'Save Product' : 'Save changes'}
        </button>
      </div>

      {mode === 'create' && saved && createdProductId != null && tutorialPromptOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTutorialPromptOpen(false);
          }}
        >
          <div
            ref={tutorialPromptRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-prompt-title"
            aria-describedby="tutorial-prompt-description"
            tabIndex={-1}
            className="relative w-full max-w-md rounded-2xl border border-abaca-200 bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setTutorialPromptOpen(false)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-canvas hover:text-stone-800"
              aria-label="Close tutorial prompt"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ochre-50 text-ochre-800">
              <CalendarDays size={23} aria-hidden="true" />
            </span>
            <h2 id="tutorial-prompt-title" className="mt-4 pr-8 font-serif text-xl font-bold text-brand-900">
              Would you like to offer a tutorial for this item?
            </h2>
            <p id="tutorial-prompt-description" className="mt-2 text-sm leading-6 text-stone-600">
              Your product and photos are saved. You can now add a tutorial, or finish without one and add it later.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/artisan/products/${createdProductId}/tutorial`}
                data-autofocus
                className="btn-primary min-h-11 flex-1 justify-center px-4"
              >
                Offer a tutorial
              </Link>
              <Link href="/artisan/products" className="btn-outline min-h-11 flex-1 justify-center px-4">
                Finish without one
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setTutorialPromptOpen(false)}
              className="mt-4 min-h-10 w-full rounded-xl px-3 text-sm font-semibold text-stone-600 transition hover:bg-canvas"
            >
              Decide later
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
