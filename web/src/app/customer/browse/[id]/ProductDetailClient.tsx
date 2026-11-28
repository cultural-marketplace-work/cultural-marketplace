'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Languages,
  MapPin,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import type { Product, TutorialDate } from '@/lib/types';
import { useProductVariationImage } from './ProductVariationImageContext';
import ExperienceMap from './ExperienceMap';

type PurchaseView = 'product' | 'workshop';
type PurchaseType = 'product' | 'workshop';

function QuantityStepper({
  value,
  max,
  label,
  onChange,
  disabled = false,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-abaca-200 bg-canvas px-3 py-2.5">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <div className="flex items-center overflow-hidden rounded-lg border border-abaca-300 bg-white">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={disabled || value <= 1}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex h-10 w-10 items-center justify-center text-charcoal-700 transition hover:bg-ochre-50 disabled:opacity-40"
        >
          <Minus size={15} aria-hidden="true" />
        </button>
        <span className="min-w-10 text-center text-sm font-bold text-charcoal-900" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex h-10 w-10 items-center justify-center text-charcoal-700 transition hover:bg-ochre-50 disabled:opacity-40"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function sessionVenue(date: TutorialDate, fallback?: string | null) {
  if (date.location?.trim()) return date.location;
  const parts = [
    date.venue_meeting_place,
    date.venue_street,
    date.venue_barangay,
    date.venue_municipality,
    date.venue_province,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.join(', ') || fallback || 'Venue details will be shared by the artisan';
}

function formatSessionDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProductDetailClient({
  product,
  loggedIn,
  view,
  artisanPhone,
}: {
  product: Product;
  loggedIn: boolean;
  view: PurchaseView;
  artisanPhone?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const { setSelectedImage } = useProductVariationImage();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, { name: string; price: number; image_path?: string | null }>>({});
  const [session, setSession] = useState(0);
  const [qty, setQty] = useState(1);
  const [attendeeFor, setAttendeeFor] = useState<'self' | 'others'>('self');
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);
  const [attendeeDraft, setAttendeeDraft] = useState<string[]>([]);
  const [attendeeNamesConfirmed, setAttendeeNamesConfirmed] = useState(false);
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const variations = product.variations_data ?? [];
  const grouped = variations.reduce<Record<string, typeof variations>>((groups, variation) => {
    (groups[variation.typeLabel] ??= []).push(variation);
    return groups;
  }, {});
  const hasVariations = Object.keys(grouped).length > 0;
  const tutorialDetails = product.tutorial_details;
  const workshopPrice = Number(product.tutorial_price ?? 0);
  const currentVariantPrice = view === 'product'
    ? Object.values(selectedVariants).reduce((total, variant) => total + (variant.price || 0), 0)
    : 0;
  const productPrice = Number(product.price) + currentVariantPrice;
  const formattedVariant = view === 'product'
    ? Object.entries(selectedVariants).map(([type, variant]) => `${type}: ${variant.name}`).join(' · ')
    : '';
  const maximumWorkshopCapacity = product.tutorial_capacity ?? 10;
  const sessionCapacity = (index: number) => Math.min(
    maximumWorkshopCapacity,
    product.tutorial_dates?.[index]?.available_slots ?? maximumWorkshopCapacity
  );
  const selectedSessionCapacity = sessionCapacity(session);
  const selectedSessionIsFull = (product.tutorial_dates?.[session]?.available_slots ?? 1) <= 0;
  const selectedTutorialDate = product.tutorial_dates?.[session];
  const workshopImage = product.tutorial_gallery?.find((image) => image.trim()) ?? product.image_path;
  const workshopVenue = product.tutorial_dates?.[session]
    ? sessionVenue(product.tutorial_dates[session], product.tutorial_location)
    : product.tutorial_location || 'Venue details will be shared by the artisan';
  const selectedVenueLat = selectedTutorialDate?.lat ? Number(selectedTutorialDate.lat) : product.tutorial_lat;
  const selectedVenueLng = selectedTutorialDate?.lng ? Number(selectedTutorialDate.lng) : product.tutorial_lng;

  useEffect(() => {
    if (view !== 'workshop') return;

    const hash = window.location.hash;
    if (!hash.startsWith('#session-')) return;
    const selectedIndex = Number.parseInt(hash.slice('#session-'.length), 10);
    if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < (product.tutorial_dates?.length ?? 0)) {
      setSession(selectedIndex);
    }
  }, [product.tutorial_dates?.length, view]);

  function toggleVariation(typeLabel: string, name: string, price: number, imagePath?: string | null) {
    const next = { ...selectedVariants };
    if (next[typeLabel]?.name === name) delete next[typeLabel];
    else next[typeLabel] = { name, price, image_path: imagePath };
    setSelectedVariants(next);
    setSelectedImage(
      next[typeLabel]?.image_path
        ?? Object.values(next).find((variant) => variant.image_path)?.image_path
        ?? null
    );
  }

  function openAttendeeDialog(names = attendeeNames) {
    setAttendeeDraft(Array.from({ length: qty }, (_, index) => names[index] ?? ''));
    setAttendeeDialogOpen(true);
  }

  function handleQtyChange(nextQty: number) {
    const maxQty = view === 'product'
      ? Math.max(1, product.stock_quantity)
      : Math.max(1, selectedSessionCapacity);
    const validQty = Math.min(maxQty, Math.max(1, nextQty));
    setQty(validQty);
    setAttendeeNames((previous) => Array.from(
      { length: validQty },
      (_, index) => previous[index] ?? ''
    ));

    if (view === 'workshop' && attendeeFor === 'others') {
      setAttendeeNamesConfirmed(false);
      setAttendeeDraft((previous) => Array.from(
        { length: validQty },
        (_, index) => previous[index] ?? attendeeNames[index] ?? ''
      ));
      setAttendeeDialogOpen(true);
    }
  }

  function selectSession(index: number) {
    setSession(index);
    const validQty = Math.min(qty, Math.max(1, sessionCapacity(index)));
    setQty(validQty);
    setAttendeeNames((previous) => previous.slice(0, validQty));
    if (attendeeFor === 'others') setAttendeeNamesConfirmed(false);
  }

  function chooseAttendee(value: 'self' | 'others') {
    setAttendeeFor(value);
    if (value === 'self') {
      setAttendeeNamesConfirmed(true);
      setAttendeeDialogOpen(false);
      return;
    }
    setAttendeeNamesConfirmed(false);
    openAttendeeDialog();
  }

  function saveAttendeeNames() {
    const names = attendeeDraft.slice(0, qty).map((name) => name.trim());
    if (names.length !== qty || names.some((name) => !name)) {
      setMsg(`Enter the full name for each of the ${qty} attendee${qty === 1 ? '' : 's'}.`);
      return;
    }
    setAttendeeNames(names);
    setAttendeeNamesConfirmed(true);
    setAttendeeDialogOpen(false);
    setMsg('');
  }

  async function addToCart(purchaseType: PurchaseType) {
    if (!loggedIn) {
      router.push(`/auth/login?next=/customer/browse/${product.id}`);
      return;
    }

    if (purchaseType === 'workshop' && attendeeFor === 'others') {
      const names = attendeeNames.slice(0, qty);
      if (!attendeeNamesConfirmed || names.length !== qty || names.some((name) => !name.trim())) {
        setMsg('');
        openAttendeeDialog(attendeeNames);
        return;
      }
    }

    setBusy(true);
    setMsg('');
    const attendeeString = purchaseType === 'workshop' && attendeeFor === 'others'
      ? attendeeNames.slice(0, qty).map((name) => name.trim()).join(', ')
      : null;

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          purchase_type: purchaseType,
          quantity: qty,
          selected_variant: purchaseType === 'product' ? formattedVariant || null : null,
          selected_session: purchaseType === 'workshop' ? product.tutorial_dates?.[session] ?? null : null,
          attendee_for: purchaseType === 'workshop' ? attendeeFor : 'self',
          attendee_name: attendeeString,
        }),
      });
      const data = await response.json() as { status?: string; message?: string };
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Could not add this item to your basket.');
      }

      router.refresh();
      const label = purchaseType === 'workshop'
        ? 'Workshop added to your basket.'
        : 'Craft added to your basket.';
      toast.success(label, { label: 'View basket', href: '/cart' });
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : 'Could not add this item to your basket.');
    } finally {
      setBusy(false);
    }
  }

  async function messageArtisan() {
    if (!loggedIn) {
      router.push(`/auth/login?next=/customer/browse/${product.id}`);
      return;
    }

    setBusy(true);
    setMsg('');
    try {
      const response = await fetch('/api/chat/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
      });
      const data = await response.json() as { status?: string; message?: string; conversation_id?: number };
      if (!response.ok || data.status !== 'success' || !data.conversation_id) {
        throw new Error(data.message || 'Could not open a conversation with the artisan.');
      }
      router.push(`/customer/account/messages?c=${data.conversation_id}`);
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : 'Could not open a conversation with the artisan.');
    } finally {
      setBusy(false);
    }
  }

  function renderVariations() {
    return (
      <div className="space-y-3">
        {Object.entries(grouped).map(([label, options]) => (
          <fieldset key={label}>
            <legend className="mb-1.5 text-xs font-bold text-charcoal-800">{label}</legend>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const isSelected = selectedVariants[label]?.name === option.name;
                return (
                  <button
                    key={option.name}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleVariation(option.typeLabel, option.name, Number(option.price) || 0, option.image_path)}
                    className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-600 ${
                      isSelected
                        ? 'border-crimson-700 bg-crimson-700 text-white'
                        : 'border-abaca-300 bg-white text-charcoal-800 hover:border-ochre-500 hover:bg-ochre-50'
                    }`}
                  >
                    {option.name}{Number(option.price) > 0 ? ` (+₱${Number(option.price).toFixed(2)})` : ''}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    );
  }

  if (view === 'product') {
    return (
      <div className="mt-4 space-y-4">
        {hasVariations ? renderVariations() : (
          <p className="text-xs leading-5 text-charcoal-600">
            Each piece is handcrafted by the artisan. Choose a quantity to add it to your basket.
          </p>
        )}

        <QuantityStepper
          value={qty}
          max={Math.max(1, product.stock_quantity)}
          label="Quantity"
          onChange={handleQtyChange}
          disabled={product.stock_quantity <= 0}
        />

        <button
          type="button"
          onClick={() => void addToCart('product')}
          disabled={busy || product.stock_quantity <= 0}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-crimson-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-700"
        >
          <PackageCheck size={17} aria-hidden="true" />
          {busy ? 'Adding…' : `Add craft to basket · ₱${(productPrice * qty).toFixed(2)}`}
        </button>

        {msg && <p role="alert" className="text-sm font-semibold text-crimson-800">{msg}</p>}
      </div>
    );
  }

  return (
    <section
      id="workshop-booking"
      className="relative min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border border-abaca-200 border-t-2 border-t-ochre-500 bg-white shadow-sm"
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(96px,0.7fr)_minmax(0,1.3fr)]">
          <div className="relative min-h-28 overflow-hidden rounded-xl border border-abaca-200 bg-ochre-50 sm:min-h-32">
            {workshopImage ? (
              <>
                <Image
                  src={workshopImage}
                  alt={`${product.tutorial_title || product.name} workshop`}
                  fill
                  sizes="(max-width: 640px) 100vw, 150px"
                  className="object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-crimson-800 shadow-sm">
                  Artisan-led
                </span>
              </>
            ) : (
              <div className="flex h-full min-h-28 items-center justify-center text-ochre-800 sm:min-h-32">
                <Sparkles size={28} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-crimson-700">
                  <Sparkles size={14} aria-hidden="true" />
                  Workshop available
                </p>
                <h2 className="mt-1 font-serif text-lg font-bold leading-tight text-charcoal-900">
                  {product.tutorial_title || 'Cultural workshop'}
                </h2>
              </div>
              <div className="shrink-0 rounded-xl bg-ochre-50 px-2.5 py-1.5 text-right">
                <p className="text-[10px] font-semibold text-charcoal-600">Per attendee</p>
                <p className="text-lg font-bold text-crimson-700">
                  {product.tutorial_fee_type === 'free' ? 'Free' : `₱${workshopPrice.toFixed(2)}`}
                </p>
              </div>
            </div>

            <p className="mt-2 text-[11px] font-semibold text-ochre-900">
              {selectedSessionIsFull
                ? 'This session is fully booked'
                : `${selectedTutorialDate?.available_slots ?? product.tutorial_capacity ?? 'Limited'} seats available`}
            </p>
          </div>
        </div>

        <p className="text-sm leading-5 text-charcoal-600">
          {product.tutorial_description || 'Join the artisan for a hands-on introduction to this living craft tradition.'}
        </p>

        {tutorialDetails?.participants_receive && (
          <p className="rounded-xl border border-ochre-200 bg-ochre-50/70 px-3 py-2.5 text-xs leading-5 text-charcoal-700">
            <strong className="text-charcoal-900">You’ll take home:</strong>{' '}
            {tutorialDetails.participants_receive}
          </p>
        )}

        {(tutorialDetails || product.tutorial_learnings?.length) && (
          <div className="flex flex-wrap gap-2">
            {tutorialDetails?.duration_minutes ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-charcoal-700">
                <Clock3 size={14} className="text-ochre-700" aria-hidden="true" />
                {tutorialDetails.duration_minutes} min
              </span>
            ) : null}
            {tutorialDetails?.skill_level && (
              <span className="rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-charcoal-700">
                {tutorialDetails.skill_level}
              </span>
            )}
            {tutorialDetails?.languages?.length ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-charcoal-700">
                <Languages size={14} className="text-ochre-700" aria-hidden="true" />
                {tutorialDetails.languages.join(', ')}
              </span>
            ) : null}
            {tutorialDetails?.category && (
              <span className="rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-charcoal-700">
                {tutorialDetails.category}
              </span>
            )}
            {tutorialDetails?.materials_provided && (
              <span className="rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-charcoal-700">
                {tutorialDetails.materials_provided === 'all'
                  ? 'Materials provided'
                  : tutorialDetails.materials_provided === 'some'
                    ? 'Some materials provided'
                    : 'Bring your own materials'}
              </span>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-charcoal-900">Session schedule</h3>
            {product.tutorial_capacity && (
              <span className="text-right text-xs text-charcoal-500">
                Up to {product.tutorial_capacity} attendees
              </span>
            )}
          </div>
          {product.tutorial_dates?.length ? product.tutorial_dates.length > 1 ? (
            <details className="rounded-xl border border-abaca-200 bg-white">
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-xs text-charcoal-800">
                <span className="min-w-0">
                  <span className="block font-bold">
                    Selected: {formatSessionDate(selectedTutorialDate?.date ?? '')}
                    {selectedTutorialDate && ` · ${selectedTutorialDate.time_start}–${selectedTutorialDate.time_end}`}
                  </span>
                  {selectedTutorialDate && (
                    <span className="mt-0.5 block truncate text-charcoal-500">{workshopVenue}</span>
                  )}
                  {selectedTutorialDate?.registration_deadline && (
                    <span className="mt-0.5 block text-charcoal-500">
                      Book by {formatSessionDate(selectedTutorialDate.registration_deadline)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-crimson-700">
                  Change · {product.tutorial_dates.length}
                </span>
              </summary>
              <div className="max-h-56 space-y-2 overflow-y-auto border-t border-abaca-100 p-2.5">
              {product.tutorial_dates.map((date, index) => {
                const isSelected = session === index;
                const isFull = (date.available_slots ?? 1) <= 0;
                return (
                  <label
                    key={`${date.date}-${date.time_start}-${index}`}
                    className={`block cursor-pointer rounded-lg border p-2.5 transition ${
                      isSelected
                        ? 'border-ochre-500 bg-ochre-50/60 ring-1 ring-ochre-500/30'
                        : 'border-abaca-200 bg-white hover:border-ochre-400'
                    } ${isFull ? 'opacity-60' : ''}`}
                  >
                    <span className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name={`workshop-session-${product.id}`}
                        checked={isSelected}
                        disabled={isFull}
                        onChange={() => selectSession(index)}
                        className="mt-1 accent-crimson-700"
                      />
                      <span className="min-w-0 flex-1">
                        <time dateTime={date.date} className="block text-sm font-bold text-charcoal-900">
                          {formatSessionDate(date.date)}
                        </time>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-charcoal-600">
                          <Clock3 size={13} aria-hidden="true" />
                          {date.time_start} – {date.time_end}
                        </span>
                        <span className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-charcoal-600">
                          <MapPin size={13} className="mt-1 shrink-0" aria-hidden="true" />
                          <span>{sessionVenue(date, product.tutorial_location)}</span>
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-ochre-900">
                          {isFull
                            ? 'Fully booked'
                            : `${date.available_slots ?? product.tutorial_capacity ?? 'Limited'} seats available`}
                          {date.registration_deadline && ` · Book by ${date.registration_deadline}`}
                        </span>
                      </span>
                      {isSelected && <CheckCircle2 size={17} className="shrink-0 text-crimson-700" aria-label="Selected" />}
                    </span>
                  </label>
                );
              })}
              </div>
            </details>
          ) : (
            <p className="rounded-xl border border-abaca-200 bg-canvas px-3 py-2.5 text-xs text-charcoal-600">
              One session is scheduled.
            </p>
          ) : (
            <p className="rounded-xl border border-abaca-200 bg-canvas p-3 text-sm leading-5 text-charcoal-600">
              No public session dates are scheduled yet. Message the artisan to arrange a time.
            </p>
          )}
          {selectedTutorialDate && (
            <section className="rounded-xl border border-abaca-200 bg-white p-3">
              <div className="mb-3 flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-crimson-700" aria-hidden="true" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-charcoal-900">Workshop venue and directions</h4>
                  <p className="mt-1 text-xs leading-5 text-charcoal-600">{workshopVenue}</p>
                </div>
              </div>
              <div className="h-52 overflow-hidden rounded-lg border border-abaca-200">
                <ExperienceMap
                  lat={Number.isFinite(selectedVenueLat) ? selectedVenueLat : null}
                  lng={Number.isFinite(selectedVenueLng) ? selectedVenueLng : null}
                  locationName={workshopVenue}
                  artisanPhone={artisanPhone}
                  compact
                />
              </div>
            </section>
          )}
        </div>

        {(tutorialDetails || product.tutorial_learnings?.length || product.tutorial_things_to_bring) && (
          <details className="rounded-xl border border-abaca-200 bg-white">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold text-charcoal-800">
              What’s included and what you’ll learn
            </summary>
            <div className="space-y-2 border-t border-abaca-100 px-3 py-3 text-xs leading-5 text-charcoal-700">
              {product.tutorial_learnings?.length ? (
                <div>
                  <p className="font-bold">You’ll learn</p>
                  <ul className="ml-4 list-disc">
                    {product.tutorial_learnings.map((learning, index) => (
                      <li key={`${learning}-${index}`}>{learning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {tutorialDetails?.materials_provided && (
                <p>
                  <strong>Materials:</strong>{' '}
                  {tutorialDetails.materials_provided === 'all'
                    ? 'All materials provided'
                    : tutorialDetails.materials_provided === 'some'
                      ? 'Some materials provided'
                      : 'Bring your own materials'}
                </p>
              )}
              {tutorialDetails?.materials_requirements && (
                <p><strong>Bring:</strong> {tutorialDetails.materials_requirements}</p>
              )}
              {tutorialDetails?.participants_receive && (
                <p><strong>You’ll receive:</strong> {tutorialDetails.participants_receive}</p>
              )}
              {tutorialDetails?.fee_inclusion && (
                <p><strong>Fee includes:</strong> {tutorialDetails.fee_inclusion}</p>
              )}
              {product.tutorial_things_to_bring && (
                <p><strong>Things to bring:</strong> {product.tutorial_things_to_bring}</p>
              )}
              {tutorialDetails?.attendance_instructions && (
                <p><strong>Before attending:</strong> {tutorialDetails.attendance_instructions}</p>
              )}
              {tutorialDetails?.cancellation_policy && (
                <p><strong>Cancellation:</strong> {tutorialDetails.cancellation_policy}</p>
              )}
              {tutorialDetails?.refund_policy && (
                <p><strong>Refunds:</strong> {tutorialDetails.refund_policy}</p>
              )}
              {tutorialDetails?.additional_notes && <p>{tutorialDetails.additional_notes}</p>}
            </div>
          </details>
        )}

        <div className="space-y-2.5">
          <QuantityStepper
            value={qty}
            max={Math.max(1, selectedSessionCapacity)}
            label="Attendee quantity"
            onChange={handleQtyChange}
            disabled={selectedSessionIsFull}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-bold text-charcoal-900">Who is this booking for?</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition ${
                attendeeFor === 'self'
                  ? 'border-crimson-600 bg-crimson-50 text-crimson-900'
                  : 'border-abaca-300 bg-white text-charcoal-700 hover:bg-canvas'
              }`}>
                <input
                  type="radio"
                  name={`attendee-for-${product.id}`}
                  checked={attendeeFor === 'self'}
                  onChange={() => chooseAttendee('self')}
                  className="accent-crimson-700"
                />
                For myself
              </label>
              <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-xs font-semibold transition ${
                attendeeFor === 'others'
                  ? 'border-crimson-600 bg-crimson-50 text-crimson-900'
                  : 'border-abaca-300 bg-white text-charcoal-700 hover:bg-canvas'
              }`}>
                <input
                  type="radio"
                  name={`attendee-for-${product.id}`}
                  checked={attendeeFor === 'others'}
                  onChange={() => chooseAttendee('others')}
                  className="accent-crimson-700"
                />
                Someone else
              </label>
            </div>
          </fieldset>

          {attendeeFor === 'others' && (
            <button
              type="button"
              onClick={() => openAttendeeDialog()}
              className="w-full rounded-lg border border-dashed border-ochre-500 bg-ochre-50/60 px-3 py-2 text-left text-xs font-semibold text-ochre-900 transition hover:bg-ochre-50"
            >
              {attendeeNamesConfirmed
                ? `Attendees: ${attendeeNames.slice(0, qty).join(', ')} · Edit`
                : 'Add attendee names'}
            </button>
          )}
        </div>

        {msg && <p role="alert" className="rounded-lg bg-crimson-50 px-3 py-2 text-sm font-semibold text-crimson-800">{msg}</p>}

        <button
          type="button"
          onClick={() => void addToCart('workshop')}
          disabled={busy || selectedSessionIsFull}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-crimson-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-crimson-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-700"
        >
          <CalendarDays size={17} aria-hidden="true" />
          {busy
            ? 'Adding…'
            : product.tutorial_fee_type === 'free'
              ? `Reserve ${qty} free seat${qty === 1 ? '' : 's'}`
              : `Add workshop to basket · ₱${(workshopPrice * qty).toFixed(2)}`}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-abaca-100 pt-3">
          <Link
            href={`/customer/account/report?type=experience&id=${product.id}`}
            className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-crimson-700 transition hover:bg-crimson-50"
          >
            Report this workshop
          </Link>
          <button
            type="button"
            onClick={() => void messageArtisan()}
            disabled={busy}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-charcoal-600 transition hover:bg-canvas hover:text-crimson-700 disabled:opacity-50"
          >
            <MessageCircle size={15} aria-hidden="true" />
            Message artisan
          </button>
        </div>

        {!loggedIn && (
          <p className="text-xs leading-5 text-charcoal-500">
            You’ll be asked to sign in or create a customer account when booking.
          </p>
        )}
      </div>

      {attendeeDialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAttendeeDialogOpen(false);
              if (!attendeeNamesConfirmed) setAttendeeFor('self');
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`attendee-dialog-title-${product.id}`}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-abaca-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ochre-800">
                  <UsersRound size={15} aria-hidden="true" />
                  Workshop attendees
                </p>
                <h2 id={`attendee-dialog-title-${product.id}`} className="mt-1 font-serif text-xl font-bold text-charcoal-900">
                  Who should we book?
                </h2>
                <p className="mt-1 text-sm leading-5 text-charcoal-600">
                  Enter the full name for each of the {qty} attendee{qty === 1 ? '' : 's'}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttendeeDialogOpen(false);
                  if (!attendeeNamesConfirmed) setAttendeeFor('self');
                }}
                aria-label="Close attendee details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal-600 transition hover:bg-canvas"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {Array.from({ length: qty }, (_, index) => (
                <div key={index}>
                  <label
                    htmlFor={`attendee-name-${product.id}-${index}`}
                    className="mb-1.5 block text-sm font-semibold text-charcoal-800"
                  >
                    {qty > 1 ? `Attendee ${index + 1} full name` : 'Attendee full name'}
                  </label>
                  <input
                    id={`attendee-name-${product.id}-${index}`}
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    value={attendeeDraft[index] ?? ''}
                    onChange={(event) => {
                      const { value } = event.target;
                      setAttendeeDraft((previous) => {
                        const next = [...previous];
                        next[index] = value;
                        return next;
                      });
                      setMsg('');
                    }}
                    placeholder="Enter full name"
                    className="input min-h-11"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setAttendeeDialogOpen(false);
                  if (!attendeeNamesConfirmed) setAttendeeFor('self');
                }}
                className="min-h-11 rounded-xl border border-abaca-300 px-4 text-sm font-semibold text-charcoal-700 transition hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAttendeeNames}
                className="min-h-11 rounded-xl bg-crimson-700 px-4 text-sm font-bold text-white transition hover:bg-crimson-800"
              >
                Save attendee names
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
