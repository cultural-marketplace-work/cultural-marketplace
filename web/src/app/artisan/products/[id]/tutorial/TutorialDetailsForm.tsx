'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Camera, Check, LoaderCircle, Plus, Save, Upload } from 'lucide-react';
import { compressImage } from '@/lib/imageCompress';
import type { TutorialDate, TutorialDetails } from '@/lib/types';
import TutorialSessionFields, { type TutorialAddressOption, type TutorialSessionDraft } from './TutorialSessionFields';

const OTHER = 'Other / enter manually';
const CRAFT_CATEGORIES = ['Weaving', 'Beadwork', 'Woodcraft', 'Pottery', 'Basketry', 'Embroidery', 'Other'];
const LANGUAGES = ['Cebuano', 'Filipino', 'English'];

function optionOrOther(value: string | undefined, options: string[]) {
  return value && options.includes(value) ? value : value ? OTHER : '';
}

function minutesBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return minutes > 0 ? minutes : null;
}

function storedCoordinate(value: string | undefined, fallback?: number | null): number | null {
  if (value?.trim()) {
    const coordinate = Number(value);
    if (Number.isFinite(coordinate)) return coordinate;
  }
  return fallback ?? null;
}

export default function TutorialDetailsForm({
  productId,
  commissionRate,
  initialDetails,
  initialTitle,
  initialDescription,
  initialPrice,
  initialCapacity,
  initialImage,
  initialLat,
  initialLng,
  initialLearningOutcomes,
  initialTutorialDates,
  bookedParticipantsBySession,
  addressOptions,
}: {
  productId: number;
  commissionRate: number;
  initialDetails?: TutorialDetails | null;
  initialTitle?: string | null;
  initialDescription?: string | null;
  initialPrice?: number | null;
  initialCapacity?: number | null;
  initialImage?: string | null;
  initialLat?: number | null;
  initialLng?: number | null;
  initialLearningOutcomes?: string[] | null;
  initialTutorialDates: TutorialDate[];
  bookedParticipantsBySession: number[];
  addressOptions: TutorialAddressOption[];
}) {
  const router = useRouter();
  const imageInput = useRef<HTMLInputElement>(null);
  const sessionIdCounter = useRef(Math.max(1, initialTutorialDates.length));
  const [title, setTitle] = useState(initialTitle ?? '');
  const [category, setCategory] = useState(optionOrOther(initialDetails?.category, CRAFT_CATEGORIES));
  const [otherCategory, setOtherCategory] = useState(category === OTHER ? initialDetails?.category ?? '' : '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [learningOutcomes, setLearningOutcomes] = useState((initialLearningOutcomes ?? []).join('\n'));
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage ?? null);
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('hours');
  const [skillLevel, setSkillLevel] = useState<TutorialDetails['skill_level']>(initialDetails?.skill_level ?? 'Beginner');
  const [maximumParticipants, setMaximumParticipants] = useState(String(initialCapacity ?? ''));
  const [minimumParticipants, setMinimumParticipants] = useState(
    initialDetails?.minimum_participants != null ? String(initialDetails.minimum_participants) : ''
  );
  const [languages, setLanguages] = useState(
    (initialDetails?.languages ?? []).filter((language) => LANGUAGES.includes(language))
  );
  const [otherLanguage, setOtherLanguage] = useState(
    (initialDetails?.languages ?? []).find((language) => !LANGUAGES.includes(language)) ?? ''
  );
  const [otherLanguageEnabled, setOtherLanguageEnabled] = useState(
    (initialDetails?.languages ?? []).some((language) => !LANGUAGES.includes(language))
  );
  const [materialsProvided, setMaterialsProvided] = useState<TutorialDetails['materials_provided']>(
    initialDetails?.materials_provided ?? 'all'
  );
  const [materialsRequirements, setMaterialsRequirements] = useState(initialDetails?.materials_requirements ?? '');
  const [participantsReceive, setParticipantsReceive] = useState(initialDetails?.participants_receive ?? '');
  const [sessions, setSessions] = useState<TutorialSessionDraft[]>(() => {
    const dates = initialTutorialDates.length ? initialTutorialDates : [null];
    return dates.map((date, index) => {
      const provinceName = date?.venue_province ?? initialDetails?.province;
      const provinceCode = addressOptions.find((option) => (
        option.level === 'Prov' && option.name === provinceName
      ))?.code ?? addressOptions.find((option) => option.level === 'Prov')?.code ?? '';
      const municipalityName = date?.venue_municipality ?? initialDetails?.municipality ?? '';
      const municipalityCode = addressOptions.find((option) => (
        (option.level === 'City' || option.level === 'Mun')
        && option.parentCode === provinceCode
        && option.name === municipalityName
      ))?.code ?? '';
      const barangayName = date?.venue_barangay ?? initialDetails?.barangay ?? '';
      const barangayCode = addressOptions.find((option) => (
        option.level === 'Bgy'
        && option.parentCode === municipalityCode
        && option.name === barangayName
      ))?.code ?? '';
      const coordinates = {
        lat: storedCoordinate(date?.lat, index === 0 ? initialLat : null),
        lng: storedCoordinate(date?.lng, index === 0 ? initialLng : null),
      };
      return {
        id: `session-${index}`,
        date: date?.date ?? '',
        startTime: date?.time_start ?? '09:00',
        endTime: date?.time_end ?? '12:00',
        availableSlots: String(date?.available_slots ?? initialCapacity ?? ''),
        registrationDeadline: date?.registration_deadline ?? '',
        venueName: date?.venue_meeting_place ?? initialDetails?.venue_name ?? '',
        provinceCode,
        municipalityCode,
        barangayCode,
        completeAddress: date?.venue_street ?? initialDetails?.complete_address ?? '',
        landmark: date?.venue_landmark ?? initialDetails?.landmark ?? '',
        coordinates,
        mapCenter: coordinates,
        bookedParticipants: bookedParticipantsBySession[index] ?? 0,
      };
    });
  });
  const updateSession = useCallback((id: string, changes: Partial<TutorialSessionDraft>) => {
    setSessions((current) => current.map((session) => (
      session.id === id ? { ...session, ...changes } : session
    )));
  }, []);
  const removeSession = useCallback((id: string) => {
    setSessions((current) => current.filter((session) => session.id !== id));
  }, []);
  const [fee, setFee] = useState(initialPrice != null ? String(initialPrice) : '');
  const [feeInclusion, setFeeInclusion] = useState(initialDetails?.fee_inclusion ?? '');
  const [cancellationPolicy, setCancellationPolicy] = useState(initialDetails?.cancellation_policy ?? '');
  const [refundPolicy, setRefundPolicy] = useState(initialDetails?.refund_policy ?? '');
  const [attendanceInstructions, setAttendanceInstructions] = useState(initialDetails?.attendance_instructions ?? '');
  const [additionalNotes, setAdditionalNotes] = useState(initialDetails?.additional_notes ?? '');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const sessionDurations = useMemo(
    () => sessions.map((session) => minutesBetween(session.startTime, session.endTime)),
    [sessions]
  );
  const calculatedDuration = sessionDurations[0] ?? null;
  const feeNumber = Number(fee) || 0;
  const commission = feeNumber * commissionRate / 100;
  const earnings = feeNumber - commission;
  const minSessionDate = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const categoryValue = category === OTHER ? otherCategory.trim() : category;

  function addSession() {
    setSessions((current) => {
      const previous = current[current.length - 1];
      if (!previous) return current;
      return [...current, {
        ...previous,
        id: `session-${sessionIdCounter.current++}`,
        date: '',
        availableSlots: String(initialCapacity ?? previous.availableSlots),
        registrationDeadline: '',
        coordinates: { ...previous.coordinates },
        mapCenter: { ...previous.mapCenter },
        bookedParticipants: 0,
      }];
    });
  }

  function toggleLanguage(language: string) {
    setLanguages((current) => current.includes(language)
      ? current.filter((value) => value !== language)
      : [...current, language]);
  }

  async function uploadTutorialImage(file: File) {
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP tutorial image.');
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 1200, 0.8);
      const formData = new FormData();
      formData.append('productId', String(productId));
      formData.append('kind', 'tutorial');
      formData.append('file', compressed);
      const response = await fetch(`/api/artisan/products/${productId}/media`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'The tutorial image could not be uploaded.');
      }
      setImageUrl(data.tutorial_gallery?.[0] ?? data.url);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'The tutorial image could not be uploaded. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || uploading) return;
    setError('');

    const maxParticipants = Number(maximumParticipants);
    const minParticipants = minimumParticipants ? Number(minimumParticipants) : null;
    if (!imageUrl) {
      setError('Upload a main tutorial image before continuing.');
      return;
    }
    if (!sessions.length) {
      setError('Add at least one tutorial session.');
      return;
    }
    if (sessionDurations.some((duration) => duration == null)) {
      setError('Each session end time must be later than its start time.');
      return;
    }
    if (sessionDurations.some((duration) => duration !== calculatedDuration)) {
      setError('All sessions must have the same duration.');
      return;
    }
    if (!languages.length && (!otherLanguageEnabled || !otherLanguage.trim())) {
      setError('Choose at least one language used in the tutorial.');
      return;
    }
    if (!Number.isInteger(maxParticipants) || maxParticipants < 1) {
      setError('Maximum participants must be a whole number greater than zero.');
      return;
    }
    if (minParticipants != null && (!Number.isInteger(minParticipants) || minParticipants < 1 || minParticipants > maxParticipants)) {
      setError('Minimum participants must be a positive whole number no greater than the maximum.');
      return;
    }
    if (sessions.some((session) => {
      const slots = Number(session.availableSlots);
      return !Number.isInteger(slots) || slots < 1 || slots > maxParticipants;
    })) {
      setError('Each session must have a positive whole-number slot count no greater than the maximum participants.');
      return;
    }
    if (sessions.some((session) => (
      !session.date
      || session.date < minSessionDate
      || !session.registrationDeadline
      || session.registrationDeadline < minSessionDate
      || session.registrationDeadline > session.date
    ))) {
      setError('Choose a future date for every session and a registration deadline on or before that session.');
      return;
    }
    const scheduleKeys = sessions.map((session) => `${session.date}|${session.startTime}|${session.endTime}`);
    if (new Set(scheduleKeys).size !== scheduleKeys.length) {
      setError('Each session must have a unique date and time.');
      return;
    }
    if (sessions.some((session) => session.coordinates.lat == null || session.coordinates.lng == null)) {
      setError('Pin the venue for every session on its map before continuing.');
      return;
    }
    const outcomeList = learningOutcomes.split('\n').map((outcome) => outcome.trim()).filter(Boolean);
    if (!outcomeList.length) {
      setError('Add at least one learning outcome.');
      return;
    }

    setBusy(true);
    try {
      const languageList = [...languages, ...(otherLanguageEnabled && otherLanguage.trim() ? [otherLanguage.trim()] : [])];
      const addressDetails = sessions.map((session) => ({
        province: addressOptions.find((option) => option.code === session.provinceCode)?.name ?? '',
        municipality: addressOptions.find((option) => option.code === session.municipalityCode)?.name ?? '',
        barangay: addressOptions.find((option) => option.code === session.barangayCode)?.name ?? '',
      }));
      if (addressDetails.some((address) => !address.province || !address.municipality || !address.barangay)) {
        setError('Choose a province, municipality, and barangay for every session venue.');
        setBusy(false);
        return;
      }
      const primarySession = sessions[0];
      const primaryAddress = addressDetails[0];
      const primaryLat = primarySession.coordinates.lat;
      const primaryLng = primarySession.coordinates.lng;
      if (primaryLat == null || primaryLng == null || calculatedDuration == null) {
        setError('Complete the first session time and venue map before continuing.');
        setBusy(false);
        return;
      }
      const tutorialDetails: TutorialDetails = {
        category: categoryValue,
        duration_minutes: calculatedDuration,
        skill_level: skillLevel,
        minimum_participants: minParticipants,
        languages: languageList,
        materials_provided: materialsProvided,
        materials_requirements: materialsRequirements.trim(),
        participants_receive: participantsReceive.trim(),
        venue_name: primarySession.venueName.trim(),
        province: primaryAddress.province,
        municipality: primaryAddress.municipality,
        barangay: primaryAddress.barangay,
        complete_address: primarySession.completeAddress.trim(),
        landmark: primarySession.landmark.trim(),
        fee_inclusion: feeInclusion.trim(),
        cancellation_policy: cancellationPolicy.trim(),
        refund_policy: refundPolicy.trim(),
        attendance_instructions: attendanceInstructions.trim(),
        additional_notes: additionalNotes.trim(),
      };
      const venueLocation = [
        primarySession.venueName.trim(),
        primaryAddress.municipality,
        primaryAddress.province,
      ].filter(Boolean).join(', ').slice(0, 255);

      const response = await fetch(`/api/artisan/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          has_tutorial: true,
          tutorial_title: title.trim(),
          tutorial_description: description.trim(),
          tutorial_learnings: outcomeList,
          tutorial_things_to_bring: materialsRequirements.trim(),
          tutorial_details: tutorialDetails,
          tutorial_fee_type: feeNumber === 0 ? 'free' : 'paid',
          tutorial_price: feeNumber,
          tutorial_capacity: maxParticipants,
          tutorial_location: venueLocation,
          tutorial_lat: primaryLat,
          tutorial_lng: primaryLng,
          tutorial_dates: sessions.map((session, index) => {
            const address = addressDetails[index];
            return {
              date: session.date,
              time_start: session.startTime,
              time_end: session.endTime,
              available_slots: Number(session.availableSlots),
              registration_deadline: session.registrationDeadline,
              location: [
                session.venueName.trim(),
                session.completeAddress.trim(),
                address.barangay,
                address.municipality,
                address.province,
                session.landmark.trim() ? `Near ${session.landmark.trim()}` : '',
              ].filter(Boolean).join(', '),
              venue_street: session.completeAddress.trim(),
              venue_province: address.province,
              venue_barangay: address.barangay,
              venue_municipality: address.municipality,
              venue_meeting_place: session.venueName.trim(),
              venue_landmark: session.landmark.trim(),
              lat: String(session.coordinates.lat),
              lng: String(session.coordinates.lng),
            };
          }),
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Could not save your tutorial. Please try again.');
      }
      router.push('/artisan/products');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={busy} className="mt-6 space-y-5">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <section className="space-y-5 rounded-2xl border border-abaca-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-bold text-brand-900">Tutorial information</h2>
        <div>
          <label htmlFor="tutorial-title" className="mb-1.5 block text-sm font-semibold text-stone-700">Tutorial Title</label>
          <input id="tutorial-title" className="input min-h-11" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tutorial-category" className="mb-1.5 block text-sm font-semibold text-stone-700">Craft Category</label>
            <select id="tutorial-category" className="input min-h-11" value={category} onChange={(event) => setCategory(event.target.value)} required>
              <option value="" disabled>Select a craft category</option>
              {CRAFT_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              <option value={OTHER}>{OTHER}</option>
            </select>
            {category === OTHER && (
              <input className="input mt-2 min-h-11" aria-label="Other craft category" value={otherCategory} onChange={(event) => setOtherCategory(event.target.value)} placeholder="Enter craft category" required />
            )}
          </div>
          <div>
            <label htmlFor="tutorial-level" className="mb-1.5 block text-sm font-semibold text-stone-700">Skill Level</label>
            <select id="tutorial-level" className="input min-h-11" value={skillLevel} onChange={(event) => setSkillLevel(event.target.value as TutorialDetails['skill_level'])}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="tutorial-description" className="mb-1.5 block text-sm font-semibold text-stone-700">Tutorial Description</label>
          <textarea id="tutorial-description" className="input min-h-28 resize-y leading-6" value={description} onChange={(event) => setDescription(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="tutorial-outcomes" className="mb-1.5 block text-sm font-semibold text-stone-700">Learning Outcomes</label>
          <textarea id="tutorial-outcomes" className="input min-h-24 resize-y leading-6" value={learningOutcomes} onChange={(event) => setLearningOutcomes(event.target.value)} placeholder="Enter one learning outcome per line" required />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-stone-700">Tutorial Image</span>
          {imageUrl ? (
            <div className="flex flex-col gap-3 rounded-xl border border-abaca-200 bg-canvas/60 p-3 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Tutorial cover" className="h-28 w-36 rounded-lg object-cover" />
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800"><Check size={16} aria-hidden="true" /> Tutorial image uploaded</p>
                <button type="button" className="btn-outline mt-2 min-h-10 px-3 text-xs" onClick={() => imageInput.current?.click()} disabled={uploading}>
                  <Upload size={14} aria-hidden="true" /> Replace image
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-abaca-300 bg-canvas/50 text-sm font-semibold text-brand-700 transition hover:border-ochre-500 hover:bg-ochre-50" onClick={() => imageInput.current?.click()} disabled={uploading}>
              {uploading ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <Camera size={20} aria-hidden="true" />}
              {uploading ? 'Uploading image…' : 'Upload tutorial cover image'}
              <span className="text-xs font-normal text-stone-500">JPEG, PNG, or WebP; minimum 200 × 200 pixels</span>
            </button>
          )}
          <input
            ref={imageInput}
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload tutorial image"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadTutorialImage(file);
              event.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-abaca-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-bold text-brand-900">Participants and materials</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tutorial-maximum" className="mb-1.5 block text-sm font-semibold text-stone-700">Maximum Participants</label>
            <input id="tutorial-maximum" className="input min-h-11" type="number" min="1" step="1" value={maximumParticipants} onChange={(event) => {
              const nextValue = event.target.value;
              setMaximumParticipants(nextValue);
              if (nextValue) {
                setSessions((current) => current.map((session) => (
                  Number(session.availableSlots) > Number(nextValue)
                    ? { ...session, availableSlots: nextValue }
                    : session
                )));
              }
            }} required />
          </div>
          <div>
            <label htmlFor="tutorial-minimum" className="mb-1.5 block text-sm font-semibold text-stone-700">Minimum Participants <span className="font-normal text-stone-500">(optional)</span></label>
            <input id="tutorial-minimum" className="input min-h-11" type="number" min="1" step="1" value={minimumParticipants} onChange={(event) => setMinimumParticipants(event.target.value)} />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold text-stone-700">Language Used</legend>
            <div className="flex flex-wrap gap-3">
              {LANGUAGES.map((language) => (
                <label key={language} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-abaca-200 px-3 text-sm">
                  <input type="checkbox" checked={languages.includes(language)} onChange={() => toggleLanguage(language)} />
                  {language}
                </label>
              ))}
              <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-abaca-200 px-3 text-sm">
                <input type="checkbox" checked={otherLanguageEnabled} onChange={(event) => {
                  setOtherLanguageEnabled(event.target.checked);
                  if (!event.target.checked) setOtherLanguage('');
                }} />
                Other
              </label>
            </div>
            {otherLanguageEnabled && (
              <input className="input mt-2 min-h-11" aria-label="Other language" value={otherLanguage} onChange={(event) => setOtherLanguage(event.target.value)} placeholder="Enter another language" required />
            )}
          </fieldset>
          <div className="sm:col-span-2">
            <label htmlFor="tutorial-materials-provided" className="mb-1.5 block text-sm font-semibold text-stone-700">Materials Provided</label>
            <select id="tutorial-materials-provided" className="input min-h-11" value={materialsProvided} onChange={(event) => setMaterialsProvided(event.target.value as TutorialDetails['materials_provided'])}>
              <option value="all">All materials provided</option>
              <option value="some">Some materials provided</option>
              <option value="bring_own">Participants bring their own</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="tutorial-requirements" className="mb-1.5 block text-sm font-semibold text-stone-700">Materials / Requirements</label>
          <textarea id="tutorial-requirements" className="input min-h-24 resize-y leading-6" value={materialsRequirements} onChange={(event) => setMaterialsRequirements(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="tutorial-receive" className="mb-1.5 block text-sm font-semibold text-stone-700">What Participants Will Receive</label>
          <textarea id="tutorial-receive" className="input min-h-24 resize-y leading-6" value={participantsReceive} onChange={(event) => setParticipantsReceive(event.target.value)} placeholder="For example: finished craft, practice materials, or a learning guide" required />
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Session dates and venues</h2>
            <p className="mt-1 text-sm text-stone-600">Add a date, time, and venue for each session. All sessions must have the same duration.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="tutorial-duration-unit" className="mb-1.5 block text-sm font-semibold text-stone-700">Duration unit · all sessions</label>
              <select id="tutorial-duration-unit" className="input min-h-11" value={durationUnit} onChange={(event) => setDurationUnit(event.target.value as 'minutes' | 'hours')}>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
            <button type="button" className="btn-outline min-h-11 px-4" onClick={addSession}>
              <Plus size={17} aria-hidden="true" />
              Add another session
            </button>
          </div>
        </div>
        {sessions.map((session, index) => (
          <TutorialSessionFields
            key={session.id}
            session={session}
            index={index}
            maximumParticipants={Number(maximumParticipants) || 0}
            durationUnit={durationUnit}
            minSessionDate={minSessionDate}
            addressOptions={addressOptions}
            canRemove={sessions.length > 1}
            onUpdate={updateSession}
            onRemove={removeSession}
          />
        ))}
      </section>

      <section className="space-y-5 rounded-2xl border border-abaca-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-bold text-brand-900">Fee and policies</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tutorial-fee" className="mb-1.5 block text-sm font-semibold text-stone-700">Tutorial Fee (₱ per participant)</label>
            <input id="tutorial-fee" className="input min-h-11" type="number" min="0" step="0.01" value={fee} onChange={(event) => setFee(event.target.value)} required />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-stone-700">Payment Method</span>
            <div className="input flex min-h-11 items-center bg-canvas text-sm text-stone-600">Handled by checkout · GCash for paid tutorials</div>
          </div>
        </div>
        <div className="grid gap-3 rounded-xl border border-abaca-200 bg-canvas/60 p-4 sm:grid-cols-3">
          <div><p className="text-xs text-stone-500">Platform commission ({commissionRate}%)</p><p className="mt-1 font-bold text-brand-900">₱{commission.toFixed(2)}</p></div>
          <div><p className="text-xs text-stone-500">Estimated artisan earnings</p><p className="mt-1 font-bold text-green-800">₱{earnings.toFixed(2)}</p></div>
          <p className="self-center text-xs leading-5 text-stone-500">Calculated automatically from your tutorial fee and the platform commission.</p>
        </div>
        <div>
          <label htmlFor="tutorial-fee-inclusion" className="mb-1.5 block text-sm font-semibold text-stone-700">Fee Inclusion</label>
          <textarea id="tutorial-fee-inclusion" className="input min-h-20 resize-y" value={feeInclusion} onChange={(event) => setFeeInclusion(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="tutorial-cancellation" className="mb-1.5 block text-sm font-semibold text-stone-700">Cancellation Policy</label>
          <textarea id="tutorial-cancellation" className="input min-h-20 resize-y" value={cancellationPolicy} onChange={(event) => setCancellationPolicy(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="tutorial-refund" className="mb-1.5 block text-sm font-semibold text-stone-700">Refund Policy</label>
          <textarea id="tutorial-refund" className="input min-h-20 resize-y" value={refundPolicy} onChange={(event) => setRefundPolicy(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="tutorial-attendance" className="mb-1.5 block text-sm font-semibold text-stone-700">Attendance Instructions</label>
          <textarea id="tutorial-attendance" className="input min-h-20 resize-y" value={attendanceInstructions} onChange={(event) => setAttendanceInstructions(event.target.value)} required />
        </div>
        <div>
          <label htmlFor="tutorial-notes" className="mb-1.5 block text-sm font-semibold text-stone-700">Additional Notes <span className="font-normal text-stone-500">(optional)</span></label>
          <textarea id="tutorial-notes" className="input min-h-20 resize-y" value={additionalNotes} onChange={(event) => setAdditionalNotes(event.target.value)} />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link href={`/artisan/products/${productId}/tutorial-option`} className="btn-outline min-h-11 justify-center px-4">Back</Link>
        <button type="submit" disabled={busy || uploading} className="btn-primary min-h-11 justify-center px-5">
          {busy || uploading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
          {uploading ? 'Uploading image…' : busy ? 'Saving…' : 'Save tutorial and continue'}
        </button>
      </div>
    </form>
  );
}
