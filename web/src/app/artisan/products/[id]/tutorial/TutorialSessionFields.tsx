'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Trash2 } from 'lucide-react';
import type { LocationData } from '@/components/MapPinPicker';

const MapPinPicker = dynamic(() => import('@/components/MapPinPicker'), {
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center rounded-xl border border-abaca-200 bg-canvas text-sm text-stone-600">Loading venue map…</div>,
});

export interface TutorialAddressOption {
  code: string;
  name: string;
  level: 'Prov' | 'City' | 'Mun' | 'Bgy';
  parentCode: string | null;
}

export interface TutorialSessionDraft {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSlots: string;
  registrationDeadline: string;
  venueName: string;
  provinceCode: string;
  municipalityCode: string;
  barangayCode: string;
  completeAddress: string;
  landmark: string;
  coordinates: { lat: number | null; lng: number | null };
  mapCenter: { lat: number | null; lng: number | null };
  bookedParticipants: number;
}

function minutesBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return minutes > 0 ? minutes : null;
}

export default function TutorialSessionFields({
  session,
  index,
  maximumParticipants,
  durationUnit,
  minSessionDate,
  addressOptions,
  canRemove,
  onUpdate,
  onRemove,
}: {
  session: TutorialSessionDraft;
  index: number;
  maximumParticipants: number;
  durationUnit: 'minutes' | 'hours';
  minSessionDate: string;
  addressOptions: TutorialAddressOption[];
  canRemove: boolean;
  onUpdate: (id: string, changes: Partial<TutorialSessionDraft>) => void;
  onRemove: (id: string) => void;
}) {
  const [locationLookup, setLocationLookup] = useState<'idle' | 'loading' | 'located' | 'not_found' | 'error'>('idle');
  const provinceOptions = addressOptions.filter((option) => option.level === 'Prov');
  const municipalityOptions = useMemo(() => addressOptions.filter((option) => (
    (option.level === 'City' || option.level === 'Mun') && option.parentCode === session.provinceCode
  )), [addressOptions, session.provinceCode]);
  const barangayOptions = useMemo(() => addressOptions.filter((option) => (
    option.level === 'Bgy' && option.parentCode === session.municipalityCode
  )), [addressOptions, session.municipalityCode]);
  const province = provinceOptions.find((option) => option.code === session.provinceCode)?.name ?? '';
  const municipality = municipalityOptions.find((option) => option.code === session.municipalityCode)?.name ?? '';
  const barangay = barangayOptions.find((option) => option.code === session.barangayCode)?.name ?? '';
  const addressKey = province && municipality && barangay
    ? `${session.provinceCode}|${session.municipalityCode}|${session.barangayCode}`
    : '';
  const lastAddressKeyRef = useRef(addressKey);
  const duration = minutesBetween(session.startTime, session.endTime);
  const completed = Boolean(session.date && new Date(`${session.date}T${session.endTime}:00`) < new Date());
  const slots = Number(session.availableSlots);

  useEffect(() => {
    if (!addressKey) {
      setLocationLookup('idle');
      return;
    }

    if (
      lastAddressKeyRef.current === addressKey
      && session.coordinates.lat != null
      && session.coordinates.lng != null
    ) {
      setLocationLookup('located');
      return;
    }

    lastAddressKeyRef.current = addressKey;
    onUpdate(session.id, {
      coordinates: { lat: null, lng: null },
      mapCenter: { lat: null, lng: null },
    });
    setLocationLookup('loading');
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          q: `${barangay}, ${municipality}, ${province}, Philippines`,
          format: 'jsonv2',
          limit: '1',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Location lookup failed (${response.status}).`);

        const results = await response.json() as Array<{ lat: string; lon: string }>;
        const result = results[0];
        if (!result) {
          setLocationLookup('not_found');
          return;
        }
        const lat = Number(result.lat);
        const lng = Number(result.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error('The location service returned invalid coordinates.');
        }

        onUpdate(session.id, {
          coordinates: { lat, lng },
          mapCenter: { lat, lng },
        });
        setLocationLookup('located');
      } catch (cause: unknown) {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        console.error('[tutorial-venue] address lookup failed:', cause);
        setLocationLookup('error');
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addressKey, barangay, municipality, onUpdate, province, session.coordinates.lat, session.coordinates.lng, session.id]);

  return (
    <section aria-labelledby={`tutorial-session-title-${session.id}`} className="space-y-5 rounded-2xl border border-abaca-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 id={`tutorial-session-title-${session.id}`} className="font-serif text-xl font-bold text-brand-900">Session {index + 1}</h3>
        <button
          type="button"
          className="btn-outline min-h-10 px-3 text-sm"
          onClick={() => onRemove(session.id)}
          disabled={!canRemove || session.bookedParticipants > 0}
          aria-label={`Remove session ${index + 1}`}
          title={session.bookedParticipants > 0 ? 'This session has bookings and cannot be removed.' : undefined}
        >
          <Trash2 size={15} aria-hidden="true" />
          Remove
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`tutorial-session-date-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Session Date</label>
          <input id={`tutorial-session-date-${session.id}`} className="input min-h-11" type="date" min={minSessionDate} value={session.date} onChange={(event) => onUpdate(session.id, { date: event.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`tutorial-session-start-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Start Time</label>
            <input id={`tutorial-session-start-${session.id}`} className="input min-h-11" type="time" value={session.startTime} onChange={(event) => onUpdate(session.id, { startTime: event.target.value })} required />
          </div>
          <div>
            <label htmlFor={`tutorial-session-end-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">End Time</label>
            <input id={`tutorial-session-end-${session.id}`} className="input min-h-11" type="time" value={session.endTime} onChange={(event) => onUpdate(session.id, { endTime: event.target.value })} required />
          </div>
        </div>
        <div>
          <label htmlFor={`tutorial-session-duration-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Duration (calculated, {durationUnit})</label>
          <input id={`tutorial-session-duration-${session.id}`} className="input min-h-11" type="number" value={duration == null ? '' : durationUnit === 'hours' ? (duration / 60).toFixed(2) : duration} readOnly aria-readonly="true" />
        </div>
        <div>
          <label htmlFor={`tutorial-session-slots-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Available Slots</label>
          <input id={`tutorial-session-slots-${session.id}`} className="input min-h-11" type="number" min="1" step="1" max={maximumParticipants || undefined} value={session.availableSlots} onChange={(event) => onUpdate(session.id, { availableSlots: event.target.value })} required />
        </div>
        <div>
          <label htmlFor={`tutorial-session-deadline-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Registration Deadline</label>
          <input id={`tutorial-session-deadline-${session.id}`} className="input min-h-11" type="date" min={minSessionDate} max={session.date || undefined} value={session.registrationDeadline} onChange={(event) => onUpdate(session.id, { registrationDeadline: event.target.value })} required />
        </div>
        <div className="sm:col-span-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Schedule Status · automatic</p>
          <p className="mt-1 text-sm font-bold text-green-800">
            {completed ? 'Completed'
              : !session.availableSlots ? 'Set available slots'
                : session.bookedParticipants >= slots ? 'Fully Booked' : 'Available'}
          </p>
          <p className="mt-1 text-xs text-stone-600">Based on this session&apos;s date and remaining slots.</p>
        </div>
      </div>

      <div>
        <label htmlFor={`tutorial-session-venue-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Venue Name</label>
        <input id={`tutorial-session-venue-${session.id}`} className="input min-h-11" value={session.venueName} onChange={(event) => onUpdate(session.id, { venueName: event.target.value })} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`tutorial-session-province-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Province</label>
          <select id={`tutorial-session-province-${session.id}`} className="input min-h-11" value={session.provinceCode} onChange={(event) => onUpdate(session.id, { provinceCode: event.target.value, municipalityCode: '', barangayCode: '' })} required>
            <option value="" disabled>Select province</option>
            {provinceOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`tutorial-session-municipality-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Municipality / City</label>
          <select id={`tutorial-session-municipality-${session.id}`} className="input min-h-11" value={session.municipalityCode} onChange={(event) => onUpdate(session.id, { municipalityCode: event.target.value, barangayCode: '' })} disabled={!session.provinceCode} required>
            <option value="" disabled>Select municipality</option>
            {municipalityOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`tutorial-session-barangay-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Barangay</label>
          <select id={`tutorial-session-barangay-${session.id}`} className="input min-h-11" value={session.barangayCode} onChange={(event) => onUpdate(session.id, { barangayCode: event.target.value })} disabled={!session.municipalityCode} required>
            <option value="" disabled>Select barangay</option>
            {barangayOptions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`tutorial-session-landmark-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Landmark <span className="font-normal text-stone-500">(optional)</span></label>
          <input id={`tutorial-session-landmark-${session.id}`} className="input min-h-11" value={session.landmark} onChange={(event) => onUpdate(session.id, { landmark: event.target.value })} />
        </div>
      </div>
      <div>
        <label htmlFor={`tutorial-session-address-${session.id}`} className="mb-1.5 block text-sm font-semibold text-stone-700">Complete Address</label>
        <textarea id={`tutorial-session-address-${session.id}`} className="input min-h-20 resize-y" value={session.completeAddress} onChange={(event) => onUpdate(session.id, { completeAddress: event.target.value })} required />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700"><MapPin size={16} aria-hidden="true" /> Location Pin</div>
        <MapPinPicker
          key={`${session.id}-${session.provinceCode}-${session.municipalityCode}-${session.barangayCode}`}
          initialLat={session.mapCenter.lat}
          initialLng={session.mapCenter.lng}
          initialLocation={session.venueName}
          onChange={(location: LocationData) => onUpdate(session.id, {
            coordinates: { lat: location.lat, lng: location.lng },
          })}
        />
        <p role="status" className="mt-1 text-xs text-stone-500">
          {locationLookup === 'loading' && 'Locating the selected barangay on the map…'}
          {locationLookup === 'located' && 'Map centered on the selected barangay. Drag the pin to the exact venue.'}
          {locationLookup === 'not_found' && 'Could not locate this barangay automatically. Please pin the venue manually.'}
          {locationLookup === 'error' && 'Address lookup is unavailable. Please pin the venue manually.'}
          {locationLookup === 'idle' && 'Choose a barangay to center the map, then drag the pin to the exact venue.'}
        </p>
      </div>
    </section>
  );
}
