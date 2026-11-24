import { NextResponse } from 'next/server';
import { getVerifiedArtisanSession } from '@/lib/artisanAuth';
import { updateProduct, listCategories, logActivity, getProduct, addCategory } from '@/lib/db';
import type { TutorialDetails } from '@/lib/types';

function isTutorialDetails(value: unknown): value is TutorialDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const details = value as Record<string, unknown>;
  const requiredTextFields = [
    'category',
    'materials_requirements',
    'participants_receive',
    'venue_name',
    'province',
    'municipality',
    'barangay',
    'complete_address',
    'fee_inclusion',
    'cancellation_policy',
    'refund_policy',
    'attendance_instructions',
  ];

  return requiredTextFields.every((field) => typeof details[field] === 'string' && Boolean((details[field] as string).trim()))
    && typeof details.duration_minutes === 'number'
    && Number.isInteger(details.duration_minutes)
    && details.duration_minutes > 0
    && ['Beginner', 'Intermediate', 'Advanced'].includes(String(details.skill_level))
    && (details.minimum_participants === null
      || (typeof details.minimum_participants === 'number'
        && Number.isInteger(details.minimum_participants)
        && details.minimum_participants > 0))
    && Array.isArray(details.languages)
    && details.languages.length > 0
    && details.languages.every((language) => typeof language === 'string' && Boolean(language.trim()))
    && ['all', 'some', 'bring_own'].includes(String(details.materials_provided))
    && typeof details.materials_requirements === 'string'
    && typeof details.participants_receive === 'string'
    && typeof details.landmark === 'string'
    && typeof details.additional_notes === 'string';
}

function isTutorialSession(value: unknown, maximumParticipants: number): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const session = value as Record<string, unknown>;
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const todayInPhilippines = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const isValidDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  };
  return typeof session.date === 'string'
    && datePattern.test(session.date)
    && isValidDate(session.date)
    && session.date >= todayInPhilippines
    && typeof session.time_start === 'string'
    && timePattern.test(session.time_start)
    && typeof session.time_end === 'string'
    && timePattern.test(session.time_end)
    && session.time_end > session.time_start
    && typeof session.registration_deadline === 'string'
    && datePattern.test(session.registration_deadline)
    && isValidDate(session.registration_deadline)
    && session.registration_deadline >= todayInPhilippines
    && session.registration_deadline <= session.date
    && typeof session.available_slots === 'number'
    && Number.isInteger(session.available_slots)
    && session.available_slots > 0
    && session.available_slots <= maximumParticipants
    && typeof session.location === 'string'
    && Boolean(session.location.trim())
    && typeof session.venue_street === 'string'
    && Boolean(session.venue_street.trim())
    && typeof session.venue_province === 'string'
    && Boolean(session.venue_province.trim())
    && typeof session.venue_barangay === 'string'
    && Boolean(session.venue_barangay.trim())
    && typeof session.venue_municipality === 'string'
    && Boolean(session.venue_municipality.trim())
    && typeof session.venue_meeting_place === 'string'
    && Boolean(session.venue_meeting_place.trim())
    && typeof session.venue_landmark === 'string'
    && typeof session.lat === 'string'
    && Boolean(session.lat.trim())
    && Number.isFinite(Number(session.lat))
    && Number(session.lat) >= -90
    && Number(session.lat) <= 90
    && typeof session.lng === 'string'
    && Boolean(session.lng.trim())
    && Number.isFinite(Number(session.lng))
    && Number(session.lng) >= -180
    && Number(session.lng) <= 180;
}

// Full product edit — every field the create form offers (tutorial,
// variations, materials included), ownership-enforced.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getVerifiedArtisanSession();
  if (!session || session.role !== 'artisan') {
    return NextResponse.json({ status: 'error' }, { status: 401 });
  }
  const { id } = await params;
  const productId = Number(id);
  const existing = await getProduct(productId);
  if (!existing || existing.artisan_id !== session.id) {
    return NextResponse.json({ status: 'error', message: 'Product not found.' }, { status: 404 });
  }

  const b = (await req.json()) as Record<string, unknown>;
  let tutorialDetails: TutorialDetails | undefined;
  if (b.tutorial_details !== undefined) {
    if (!isTutorialDetails(b.tutorial_details)) {
      return NextResponse.json({ status: 'error', message: 'Please complete all required tutorial details.' }, { status: 422 });
    }
    const maximumParticipants = Number(b.tutorial_capacity);
    const sessions = b.tutorial_dates;
    const outcomes = b.tutorial_learnings;
    const sessionKeys = Array.isArray(sessions)
      ? sessions.map((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
        const session = value as Record<string, unknown>;
        return `${String(session.date)}|${String(session.time_start)}|${String(session.time_end)}`;
      })
      : [];
    if (
      b.has_tutorial !== true
      || typeof b.tutorial_title !== 'string'
      || !b.tutorial_title.trim()
      || b.tutorial_title.length > 255
      || typeof b.tutorial_description !== 'string'
      || !b.tutorial_description.trim()
      || typeof b.tutorial_location !== 'string'
      || !b.tutorial_location.trim()
      || b.tutorial_location.length > 255
      || !Number.isInteger(maximumParticipants)
      || maximumParticipants < 1
      || (b.tutorial_details.minimum_participants !== null
        && b.tutorial_details.minimum_participants > maximumParticipants)
      || !Array.isArray(sessions)
      || sessions.length < 1
      || !sessions.every((session) => isTutorialSession(session, maximumParticipants))
      || new Set(sessionKeys).size !== sessions.length
      || !Array.isArray(outcomes)
      || !outcomes.some((outcome) => typeof outcome === 'string' && Boolean(outcome.trim()))
      || typeof b.tutorial_price !== 'number'
      || !Number.isFinite(b.tutorial_price)
      || b.tutorial_price < 0
      || !['paid', 'free'].includes(String(b.tutorial_fee_type))
      || (b.tutorial_fee_type === 'free' && b.tutorial_price !== 0)
      || (b.tutorial_fee_type === 'paid' && b.tutorial_price === 0)
      || typeof b.tutorial_lat !== 'number'
      || b.tutorial_lat < -90
      || b.tutorial_lat > 90
      || typeof b.tutorial_lng !== 'number'
      || b.tutorial_lng < -180
      || b.tutorial_lng > 180
    ) {
      return NextResponse.json({ status: 'error', message: 'Please complete all required tutorial details.' }, { status: 422 });
    }
    tutorialDetails = b.tutorial_details;
  }

  let category: string | undefined;
  if (b.category !== undefined) {
    if (b.category === null || b.category === '') {
      return NextResponse.json({ status: 'error', message: 'Please select a category.' }, { status: 422 });
    }
    const wanted = String(b.category).trim();
    if (!wanted) {
      return NextResponse.json({ status: 'error', message: 'Please select a category.' }, { status: 422 });
    }
    const cats = await listCategories('product');
    const hit = cats.find((c) => c.name.toLowerCase() === wanted.toLowerCase());
    if (hit) {
      category = hit.name;
    } else {
      await addCategory(wanted, 'product');
      category = wanted;
    }
  }
  await updateProduct(session.id, productId, {
    name: (b.name as string) ?? undefined,
    description: (b.description as string) ?? undefined,
    price: b.price != null ? Number(b.price) : undefined,
    stock_quantity: b.stock_quantity != null ? Number(b.stock_quantity) : undefined,
    category,
    has_tutorial: typeof b.has_tutorial === 'boolean' ? b.has_tutorial : undefined,
    tutorial_title: (b.tutorial_title as string) ?? undefined,
    tutorial_description: (b.tutorial_description as string) ?? undefined,
    tutorial_price: b.tutorial_price !== undefined ? (b.tutorial_price === null ? null : Number(b.tutorial_price)) : undefined,
    tutorial_capacity: b.tutorial_capacity !== undefined ? (b.tutorial_capacity === null ? null : Number(b.tutorial_capacity)) : undefined,
    tutorial_location: (b.tutorial_location as string) ?? undefined,
    tutorial_lat: b.tutorial_lat !== undefined ? (b.tutorial_lat === null ? null : Number(b.tutorial_lat)) : undefined,
    tutorial_lng: b.tutorial_lng !== undefined ? (b.tutorial_lng === null ? null : Number(b.tutorial_lng)) : undefined,
    tutorial_dates: b.tutorial_dates !== undefined ? (b.tutorial_dates as never) : undefined,
    tutorial_fee_type: (b.tutorial_fee_type as 'paid' | 'free') ?? undefined,
    tutorial_learnings: Array.isArray(b.tutorial_learnings)
      ? b.tutorial_learnings.filter((item): item is string => typeof item === 'string')
      : undefined,
    tutorial_things_to_bring: (b.tutorial_things_to_bring as string) ?? undefined,
    tutorial_details: tutorialDetails,
    has_variations: typeof b.has_variations === 'boolean' ? b.has_variations : undefined,
    variation_pricing: typeof b.has_variations === 'boolean' ? b.has_variations : undefined,
    variations_data: b.variations_data !== undefined ? (b.variations_data as never) : undefined,
    materials_used: (b.materials_used as string) ?? undefined,
  });
  await logActivity({ userId: session.id, role: 'artisan', userName: session.name, action: 'product_updated', description: `Artisan ${session.name} updated product "${(b.name as string) || existing.name}"` });
  return NextResponse.json({ status: 'success' });
}
