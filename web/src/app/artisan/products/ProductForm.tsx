'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import type { Variation, TutorialDate } from '@/lib/types';
import type { LocationData } from '@/components/MapPinPicker';

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
}: {
  mode: 'create' | 'edit';
  productId?: number;
  categories: Array<{ id: number; name: string }>;
  initial?: Partial<FormState>;
  initialHasVariations?: boolean;
  initialVariations?: Variation[];
  initialTutorialDates?: TutorialDate[];
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
  const [busy, setBusy] = useState(false);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');

    const validVariations = hasVariations
      ? variations.filter((v) => v.name?.trim() && (v.typeLabel || '').trim())
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

    const payload: Record<string, unknown> = {
      ...form,
      category: effectiveCategory,
      price: Number(form.price) || 0,
      stock_quantity: Number(form.stock_quantity) || 0,
      tutorial_price:
        form.has_tutorial && form.tutorial_price !== ''
          ? Number(form.tutorial_price)
          : null,
      tutorial_capacity:
        form.has_tutorial && form.tutorial_capacity !== ''
          ? Number(form.tutorial_capacity)
          : null,
      tutorial_location: form.has_tutorial ? form.tutorial_location || null : null,
      tutorial_lat: form.has_tutorial ? form.tutorial_lat : null,
      tutorial_lng: form.has_tutorial ? form.tutorial_lng : null,
      tutorial_dates: form.has_tutorial ? tutorialDates : null,
      has_variations: hasVariations,
      variations_data: validVariations,
      materials_used: form.materials_used ? form.materials_used.trim() : null,
    };

    try {
      if (mode === 'create') {
        const res = await fetch('/api/artisan/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data.status !== 'success') {
          throw new Error(data.message || 'Could not save your creation. Please check the details and try again.');
        }
        router.push(`/artisan/products/${data.id}/media-setup`);
      } else {
        const res = await fetch(`/api/artisan/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || data.status !== 'success') {
          throw new Error(data.message || 'Could not save your changes. Please try again.');
        }
        router.push('/artisan/products');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={busy} className="mt-6 space-y-5">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800">
          <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">We couldn&apos;t save this listing</p>
            <p className="mt-0.5 leading-5">{error}</p>
          </div>
        </div>
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

                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Remove ${v.typeLabel || 'option'} ${v.name || ''}`}
                    onClick={() => setVariations((vs) => vs.filter((_, i) => i !== idx))}
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
              }}
            >
              <Plus size={16} aria-hidden="true" /> Add another option
            </button>
          </div>
        )}
        </div>
      </section>

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

      <div className="flex flex-col gap-3 rounded-2xl border border-abaca-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs leading-5 text-stone-500">
          {mode === 'create'
            ? 'After saving, you can add photos and an NFC authenticity tag.'
            : 'Your changes will appear on your marketplace listing.'}
        </p>
        <button
          className="btn-primary min-h-11 w-full !rounded-xl sm:w-auto"
          disabled={busy}
          type="submit"
        >
          {busy ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
          {busy ? 'Saving…' : mode === 'create' ? 'Save and add photos' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
