// Data layer additions for the full admin back-office, artisan P5b features,
// and customer profile/addresses/reports. Same dual-backend pattern as db.ts.

import bcrypt from 'bcryptjs';
import {
  seedUsers, seedReviews, seedReports, seedAddresses, DEMO_PASSWORD_HASH,
} from './seed';
import { sql, tsString, parseJsonish } from './dbPg';
import { invalidate } from './cache';
import { deleteStoredFiles } from './storage';
import type {
  Product, Artisan, Order, OrderItem, Address, Report, ExperienceBooking,
  CustomerRow, ArtisanAnalytics,
} from './types';
import type { RuleResult } from './verificationRules';

const DATABASE_URL = process.env.DATABASE_URL || '';
export const usingPg = DATABASE_URL.length > 0;

// Pool is created once in dbPg.ts (globalThis singleton) and shared here.

// ---------------------------------------------------------------------------
// Demo store extension (shares the global with db.ts's store)
// ---------------------------------------------------------------------------
interface AdminDemoStore {
  users: Array<{ id: number; name: string; email: string; password: string; role: string; location: string | null; phone: string | null; profile_picture: string | null; bio?: string | null; disabled?: boolean; account_deleted_at?: string | null }>;
  artisans: Array<Artisan & { password: string; dob?: string | null; disabled?: boolean }>;
  order_items: Array<OrderItem & {
    review_visible?: boolean;
    proof_of_receipt?: string | null;
    attendee_contact?: string | null;
    attendee_note?: string | null;
  }>;
  reports: Report[];
  addresses: Address[];
  categories: Array<{ id: number; name: string; type: string }>;
  settings: Record<string, string>;
  products: Product[];
  orders: Order[];
}

function store(): AdminDemoStore {
  const g = globalThis as unknown as { __cmAdminStore?: AdminDemoStore };
  if (!g.__cmAdminStore) {
    g.__cmAdminStore = {
      users: [
        ...seedUsers.map((u) => ({ ...u })),
        { id: 9001, name: 'mark john (demo)', email: 'customer@demo.local', password: DEMO_PASSWORD_HASH, role: 'customer', location: 'Bunawan, Agusan del Sur', phone: '09000000000', profile_picture: null },
        { id: 9002, name: 'System Administrator (demo)', email: 'admin@demo.local', password: DEMO_PASSWORD_HASH, role: 'admin', location: null, phone: null, profile_picture: null },
      ],
      artisans: [],
      order_items: [],
      reports: seedReports.map((r) => ({ ...r })) as Report[],
      addresses: seedAddresses.map((a) => ({ ...a })) as Address[],
      categories: [],
      settings: {},
      products: [],
      orders: [],
    };
  }
  return g.__cmAdminStore;
}

/** Pull live arrays from db.ts's store so both stores share one source of truth. */
function syncFromCore(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as unknown as { __cmDemoStore?: any };
  if (!g.__cmDemoStore) return;
  const core = g.__cmDemoStore;
  const s = store();
  s.artisans = core.artisans;
  s.order_items = core.order_items;
  s.categories = core.categories;
  s.settings = core.settings;
  s.products = core.products;
  s.orders = core.orders;
  // apply review seeds once
  if (!core.__reviewsSeeded) {
    core.__reviewsSeeded = true;
    for (const r of seedReviews) {
      const item = core.order_items.find((x: { id: number }) => x.id === r.order_item_id);
      if (item) {
        item.review_rating = r.rating;
        item.review_comment = r.comment;
        item.reviewed_at = r.reviewed_at;
        item.review_visible = r.visible;
      }
    }
  }
}

function n(v: unknown): number { return typeof v === 'number' ? v : Number(v ?? 0); }

function stringArray(v: unknown): string[] {
  const parsed = parseJsonish<unknown>(v);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

export interface DeleteAccountResult {
  deleted: boolean;
  warning?: string;
}

function deletedEmail(kind: 'customer' | 'artisan', id: number): string {
  return `deleted-${kind}-${id}-${crypto.randomUUID()}@deleted.invalid`;
}

function collectStoredPaths(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStoredPaths);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStoredPaths);
  return [];
}

async function cleanupStoredFiles(paths: string[]): Promise<string | undefined> {
  try {
    await deleteStoredFiles(paths);
    return undefined;
  } catch (error) {
    console.error('Stored media cleanup failed after account anonymization:', error);
    return 'Account data was anonymized, but some stored files could not be removed. Review the server logs for details.';
  }
}

// ---------------------------------------------------------------------------
// Customers (admin)
// ---------------------------------------------------------------------------
export async function listCustomers(): Promise<CustomerRow[]> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`
  select
    u.id,
    u.name,
    u.email,
    u.phone,
    u.location,
    u.profile_picture,
    u.created_at,
    (select count(*) from orders o where o.customer_id = u.id) as order_count
  from users u
  where u.role = 'customer'
    and u.account_deleted_at is null
  order by u.created_at desc nulls last
`;
    return (rows as unknown as Record<string, unknown>[]).map((r) => ({
      id: n(r.id), name: String(r.name), email: String(r.email),
      phone: (r.phone as string) ?? null, location: (r.location as string) ?? null,
      profile_picture: (r.profile_picture as string) ?? null,
      created_at: tsString(r.created_at) ?? undefined,
      order_count: n(r.order_count), status: 'active' as const,
    }));
  }
  return store().users
    .filter((u) => u.role === 'customer' && !u.account_deleted_at)
    .map((u) => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone, location: u.location,
      profile_picture: u.profile_picture ?? null,
      order_count: store().orders.filter((o) => o.customer_id === u.id).length,
      status: (u.disabled ? 'disabled' : 'active') as 'active' | 'disabled',
    }));
}

export async function updateCustomer(id: number, p: { name?: string; email?: string; phone?: string; location?: string }): Promise<boolean> {
  if (usingPg) {
    const rows = await sql`update users set
      name = coalesce(${p.name ?? null}, name),
      email = coalesce(${p.email ?? null}, email),
      phone = coalesce(${p.phone ?? null}, phone),
      location = coalesce(${p.location ?? null}, location)
      where id = ${id} and role = 'customer'
      returning id`;
    return rows.length > 0;
  }
  const u = store().users.find((x) => x.id === id && x.role === 'customer');
  if (!u) return false;
  Object.assign(u, Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
  return true;
}

export async function deleteCustomer(id: number): Promise<DeleteAccountResult> {
  syncFromCore();
  let mediaPaths: string[] = [];
  if (usingPg) {
    const deleted = await sql.begin(async (tx) => {
      const customerRows = await tx`select id, email, profile_picture from users where id = ${id} and role = 'customer' and account_deleted_at is null for update`;
      if (!customerRows.length) return false;
      const customer = customerRows[0] as Record<string, unknown>;
      const email = String(customer.email);
      mediaPaths = collectStoredPaths(customer.profile_picture);

      const receipts = await tx`select payment_receipt from orders where customer_id = ${id}`;
      const proofs = await tx`
        select oi.proof_of_receipt
        from order_items oi join orders o on o.id = oi.order_id
        where o.customer_id = ${id}`;
      mediaPaths.push(...receipts.flatMap((row) => collectStoredPaths((row as Record<string, unknown>).payment_receipt)));
      mediaPaths.push(...proofs.flatMap((row) => collectStoredPaths((row as Record<string, unknown>).proof_of_receipt)));

      await tx`delete from cart_items where customer_id = ${id}`;
      await tx`delete from customer_addresses where customer_id = ${id}`;
      await tx`delete from chat_conversations where customer_id = ${id}`;
      await tx`delete from notifications where user_id = ${id}`;
      await tx`delete from pending_registrations where lower(email) = ${email.toLowerCase()}`;

      await tx`
        update orders
        set shipping_address = 'Removed after account deletion',
            notes = null,
            payment_receipt = null
        where customer_id = ${id}`;
      await tx`
        update order_items oi
        set attendee_name = null,
            attendee_contact = null,
            attendee_note = null,
            ticket_code = null,
            review_comment = null,
            proof_of_receipt = null
        from orders o
        where oi.order_id = o.id and o.customer_id = ${id}`;
      await tx`
        update shipments
        set recipient_name = 'Deleted customer',
            recipient_phone = '',
            recipient_address = 'Removed after account deletion',
            notes = null
        where customer_id = ${id}`;
      await tx`
        update reports
        set reason = 'Report details removed after account deletion'
        where reporter_id = ${id}`;
      await tx`
        update activity_logs
        set user_id = null,
            user_role = 'system',
            user_name = 'Deleted customer',
            action = 'account_deleted',
            description = 'Activity details removed after account deletion',
            ip_address = ''
        where user_id = ${id} and user_role = 'customer'`;
      await tx`
        update users
        set name = 'Deleted customer',
            email = ${deletedEmail('customer', id)},
            password = ${await hashPasswordAdmin(crypto.randomUUID())},
            location = null,
            phone = null,
            otp_code = null,
            otp_expires_at = null,
            is_verified = false,
            profile_picture = null,
            bio = null,
            account_deleted_at = now()
        where id = ${id} and role = 'customer'`;
      return true;
    });
    if (!deleted) return { deleted: false };
    invalidate('users*');
    invalidate('admin:stats');
    const warning = await cleanupStoredFiles(mediaPaths);
    return { deleted: true, warning };
  }

  const s = store();
  const customer = s.users.find((u) => u.id === id && u.role === 'customer' && !u.account_deleted_at);
  if (!customer) return { deleted: false };
  const email = customer.email;
  const orderIds = new Set(s.orders.filter((order) => order.customer_id === id).map((order) => order.id));
  const core = (globalThis as unknown as {
    __cmDemoStore?: {
      users: Array<{ id: number; role: string; email: string; name: string; password: string; phone?: string | null; location?: string | null; profile_picture?: string | null; account_deleted_at?: string | null }>;
      orders: Array<{ id: number; customer_id: number; shipping_address?: string | null; notes?: string | null; payment_receipt?: string | null }>;
      order_items: Array<{ order_id: number; attendee_name?: string | null; attendee_contact?: string | null; attendee_note?: string | null; ticket_code?: string | null; review_comment?: string | null; proof_of_receipt?: string | null }>;
      cart_items: Array<{ customer_id: number }>;
      chat_conversations: Array<{ id: number; customer_id: number }>;
      chat_messages: Array<{ conversation_id: number }>;
      notifications: Array<{ user_id: number | null; artisan_id?: number | null; user_role?: string }>;
      shipments: Array<{ customer_id: number; recipient_name: string; recipient_phone: string; recipient_address: string; notes: string | null }>;
      activity_logs: Array<{ user_id: number | null; user_role: string; user_name: string; action: string; description: string; ip_address?: string }>;
    };
  }).__cmDemoStore;

  mediaPaths.push(...collectStoredPaths(customer.profile_picture));
  for (const order of s.orders.filter((entry) => entry.customer_id === id)) {
    mediaPaths.push(...collectStoredPaths(order.payment_receipt));
    order.shipping_address = 'Removed after account deletion';
    order.notes = null;
    order.payment_receipt = null;
  }
  for (const item of s.order_items.filter((entry) => orderIds.has(entry.order_id))) {
    mediaPaths.push(...collectStoredPaths(item.proof_of_receipt));
    item.attendee_name = null;
    item.attendee_contact = null;
    item.attendee_note = null;
    item.ticket_code = null;
    item.review_comment = null;
    item.proof_of_receipt = null;
  }
  customer.name = 'Deleted customer';
  customer.email = deletedEmail('customer', id);
  customer.password = await hashPasswordAdmin(crypto.randomUUID());
  customer.location = null;
  customer.phone = null;
  customer.profile_picture = null;
  customer.bio = null;
  customer.account_deleted_at = new Date().toISOString();

  if (core) {
    const coreOrderIds = new Set(core.orders.filter((order) => order.customer_id === id).map((order) => order.id));
    const conversationIds = new Set(core.chat_conversations.filter((conversation) => conversation.customer_id === id).map((conversation) => conversation.id));
    const coreUser = core.users.find((user) => user.id === id && user.role === 'customer');
    if (coreUser) {
      coreUser.name = 'Deleted customer';
      coreUser.email = customer.email;
      coreUser.password = customer.password;
      coreUser.phone = null;
      coreUser.location = null;
      coreUser.profile_picture = null;
      coreUser.account_deleted_at = customer.account_deleted_at;
    }
    for (const order of core.orders.filter((entry) => entry.customer_id === id)) {
      mediaPaths.push(...collectStoredPaths(order.payment_receipt));
      order.shipping_address = 'Removed after account deletion';
      order.notes = null;
      order.payment_receipt = null;
    }
    for (const item of core.order_items.filter((entry) => coreOrderIds.has(entry.order_id))) {
      mediaPaths.push(...collectStoredPaths(item.proof_of_receipt));
      item.attendee_name = null;
      item.attendee_contact = null;
      item.attendee_note = null;
      item.ticket_code = null;
      item.review_comment = null;
      item.proof_of_receipt = null;
    }
    core.cart_items = core.cart_items.filter((item) => item.customer_id !== id);
    core.chat_conversations = core.chat_conversations.filter((conversation) => conversation.customer_id !== id);
    core.chat_messages = core.chat_messages.filter((message) => !conversationIds.has(message.conversation_id));
    core.notifications = core.notifications.filter((notification) => notification.user_id !== id);
    for (const shipment of core.shipments.filter((entry) => entry.customer_id === id)) {
      shipment.recipient_name = 'Deleted customer';
      shipment.recipient_phone = '';
      shipment.recipient_address = 'Removed after account deletion';
      shipment.notes = null;
    }
    for (const log of core.activity_logs.filter((entry) => entry.user_id === id)) {
      if (log.user_role !== 'customer') continue;
      log.user_id = null;
      log.user_role = 'system';
      log.user_name = 'Deleted customer';
      log.action = 'account_deleted';
      log.description = 'Activity details removed after account deletion';
      log.ip_address = '';
    }
  }

  for (const report of s.reports.filter((entry) => entry.reporter_id === id)) {
    report.reason = 'Report details removed after account deletion';
    report.reporter_name = null;
  }
  s.addresses = s.addresses.filter((address) => address.customer_id !== id);
  invalidate('users*');
  invalidate('admin:stats');
  const warning = await cleanupStoredFiles(mediaPaths);
  return { deleted: true, warning };
}

export async function toggleCustomerStatus(id: number): Promise<void> {
  if (usingPg) {
    await sql`update users set is_verified = coalesce(not is_verified, true) where id = ${id} and role = 'customer'`;
    return;
  }
  const u = store().users.find((x) => x.id === id && x.role === 'customer');
  if (u) u.disabled = !u.disabled;
}

// ---------------------------------------------------------------------------
// Artisans (admin deep review)
// ---------------------------------------------------------------------------
export async function getArtisanFull(id: number): Promise<(Artisan & { id_number?: string | null; dob?: string | null; id_expiry_date?: string | null; id_expiry_checked?: boolean | null; id_document_path?: string | null; id_document_back_path?: string | null; proof_of_craft_path?: string | null }) | null> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`
      select a.*,
        r.face_matched as verification_face_matched,
        r.face_confidence as verification_face_confidence,
        r.duplicate_face_match,
        r.liveness_status,
        r.liveness_challenges,
        r.liveness_verified_at,
        r.registration_notes as verification_registration_notes,
        r.verification_criteria,
        r.verification_decision,
        r.proof_of_craft_media_type
      from artisans a
      left join artisan_verification_results r on r.artisan_id = a.id
      where a.id = ${id} and a.account_deleted_at is null
      limit 1`;
    if (!rows.length) return null;
    const row = rows[0] as unknown as Record<string, unknown>;
    return {
      ...row,
      dob: row.dob == null ? null : tsString(row.dob)?.slice(0, 10) ?? null,
      id_expiry_date: row.id_expiry_date == null ? null : tsString(row.id_expiry_date)?.slice(0, 10) ?? null,
      id_expiry_checked: row.id_expiry_checked === true,
      face_matched: (row.verification_face_matched as boolean | null) ?? (row.face_matched as boolean | null) ?? null,
      face_confidence: (row.verification_face_confidence as number | null) ?? (row.face_confidence as number | null) ?? null,
      duplicate_face_match: (row.duplicate_face_match as boolean | null) ?? null,
      liveness_status: (row.liveness_status as Artisan['liveness_status']) ?? null,
      liveness_challenges: stringArray(row.liveness_challenges),
      liveness_verified_at: row.liveness_verified_at == null ? null : tsString(row.liveness_verified_at),
      registration_notes: (row.verification_registration_notes as string | null) ?? (row.registration_notes as string | null) ?? null,
      verification_criteria: Array.isArray(parseJsonish<RuleResult[]>(row.verification_criteria))
        ? parseJsonish<RuleResult[]>(row.verification_criteria) ?? []
        : [],
      verification_decision: row.verification_decision === 'auto_approved' ? 'auto_approved' : 'manual_review',
      proof_of_craft_media_type: typeof row.proof_of_craft_media_type === 'string' ? row.proof_of_craft_media_type : null,
    } as Artisan & Record<string, unknown>;
  }
  const a = store().artisans.find((x) => x.id === id && !x.account_deleted_at);
  return a ? { ...a } : null;
}


export async function listAllArtisansAdmin(): Promise<Artisan[]> {
  syncFromCore();

  if (usingPg) {
    const rows = await sql`
      select *
      from artisans
      where account_deleted_at is null
      order by created_at desc
    `;

    return (
      rows as unknown as Record<string, unknown>[]
    ).map((r) => ({
      ...r,
      id: Number(r.id),
      created_at: tsString(r.created_at),
    })) as unknown as Artisan[];
  }

  return store().artisans.filter(
    (artisan) => !artisan.account_deleted_at
  );
}


export async function updateArtisan(id: number, p: { name?: string; email?: string; phone?: string; location?: string; craft_type?: string; business_name?: string; bio?: string }): Promise<void> {
  if (usingPg) {
    await sql`update artisans set
      name = coalesce(${p.name ?? null}, name),
      email = coalesce(${p.email ?? null}, email),
      phone = coalesce(${p.phone ?? null}, phone),
      location = coalesce(${p.location ?? null}, location),
      craft_type = coalesce(${p.craft_type ?? null}, craft_type),
      business_name = coalesce(${p.business_name ?? null}, business_name),
      bio = coalesce(${p.bio ?? null}, bio)
      where id = ${id}`;
    invalidate('artisans*');
    return;
  }
  const a = store().artisans.find((x) => x.id === id);
  if (a) Object.assign(a, Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
  invalidate('artisans*');
}

export interface DeleteApplicationResult {
  deleted: boolean;
  warning?: string;
}

export async function deleteArtisanApplication(id: number): Promise<DeleteApplicationResult> {
  syncFromCore();
  let mediaPaths: string[] = [];
  if (usingPg) {
    const deleted = await sql.begin(async (tx) => {
      const rows = await tx`select * from artisans where id = ${id} and account_deleted_at is null for update`;
      if (!rows.length) return false;
      const artisan = rows[0] as Record<string, unknown>;
      const email = String(artisan.email);
      mediaPaths = [
        ...collectStoredPaths(artisan.id_document_path),
        ...collectStoredPaths(artisan.id_document_back_path),
        ...collectStoredPaths(artisan.affiliation_document_path),
        ...collectStoredPaths(artisan.proof_of_craft_path),
        ...collectStoredPaths(artisan.product_sample_1_path),
        ...collectStoredPaths(artisan.product_sample_2_path),
        ...collectStoredPaths(artisan.selfie_path),
      ];

      await tx`delete from artisan_verification_results where artisan_id = ${id}`;
      await tx`delete from face_embeddings where artisan_id = ${id}`;
      await tx`delete from face_verification_logs where artisan_id = ${id} or lower(email) = ${email.toLowerCase()}`;
      await tx`delete from pending_registrations where lower(email) = ${email.toLowerCase()}`;
      await tx`
        update artisans set
          id_type = null,
          id_number = null,
          dob = null,
          id_expiry_date = null,
          id_expiry_checked = false,
          indigenous_affiliation = null,
          affiliation_document_path = null,
          id_document_path = null,
          id_document_back_path = null,
          proof_of_craft_path = null,
          product_sample_1_path = null,
          product_sample_2_path = null,
          selfie_path = null,
          verification_status = 'pending',
          application_submitted = false
        where id = ${id}`;
      return true;
    });
    if (!deleted) return { deleted: false };
    const warning = await cleanupStoredFiles(mediaPaths);
    invalidate('artisans*');
    invalidate('admin:stats');
    return { deleted: true, ...(warning ? { warning } : {}) };
  }

  const artisan = store().artisans.find((item) => item.id === id && !item.account_deleted_at);
  if (!artisan) return { deleted: false };
  mediaPaths = [
    ...collectStoredPaths(artisan.id_document_path),
    ...collectStoredPaths(artisan.id_document_back_path),
    ...collectStoredPaths(artisan.affiliation_document_path),
    ...collectStoredPaths(artisan.proof_of_craft_path),
    ...collectStoredPaths(artisan.product_sample_1_path),
    ...collectStoredPaths(artisan.product_sample_2_path),
    ...collectStoredPaths(artisan.selfie_path),
  ];
  Object.assign(artisan, {
    id_type: null,
    id_number: null,
    dob: null,
    id_expiry_date: null,
    id_expiry_checked: false,
    indigenous_affiliation: null,
    affiliation_document_path: null,
    id_document_path: null,
    id_document_back_path: null,
    proof_of_craft_path: null,
    product_sample_1_path: null,
    product_sample_2_path: null,
    selfie_path: null,
    face_matched: null,
    face_confidence: null,
    duplicate_face_match: null,
    liveness_status: null,
    liveness_challenges: [],
    liveness_verified_at: null,
    registration_notes: null,
    verification_status: 'pending',
    application_submitted: false,
    verification_criteria: [],
    verification_decision: 'manual_review',
  });
  const warning = await cleanupStoredFiles(mediaPaths);
  invalidate('artisans*');
  invalidate('admin:stats');
  return { deleted: true, ...(warning ? { warning } : {}) };
}

export async function deleteArtisan(id: number): Promise<DeleteAccountResult> {
  syncFromCore();
  let mediaPaths: string[] = [];
  if (usingPg) {
    const deleted = await sql.begin(async (tx) => {
      const artisanRows = await tx`select * from artisans where id = ${id} and account_deleted_at is null for update`;
      if (!artisanRows.length) return false;
      const artisan = artisanRows[0] as Record<string, unknown>;
      const email = String(artisan.email);
      const replacementEmail = deletedEmail('artisan', id);
      mediaPaths.push(
        ...collectStoredPaths(artisan.profile_picture),
        ...collectStoredPaths(artisan.selfie_path),
        ...collectStoredPaths(artisan.id_document_path),
        ...collectStoredPaths(artisan.id_document_back_path),
        ...collectStoredPaths(artisan.proof_of_craft_path),
        ...collectStoredPaths(artisan.product_sample_1_path),
        ...collectStoredPaths(artisan.product_sample_2_path),
        ...collectStoredPaths(artisan.affiliation_document_path),
      );

      const products = await tx`
        select image_path, image_2_path, image_3_path, image_4_path, product_gallery, video_path, tutorial_gallery
        from products where artisan_id = ${id}`;
      for (const product of products) {
        const row = product as Record<string, unknown>;
        mediaPaths.push(
          ...collectStoredPaths(row.image_path),
          ...collectStoredPaths(row.image_2_path),
          ...collectStoredPaths(row.image_3_path),
          ...collectStoredPaths(row.image_4_path),
          ...collectStoredPaths(row.product_gallery),
          ...collectStoredPaths(row.video_path),
          ...collectStoredPaths(row.tutorial_gallery),
        );
      }

      const orderItemProofs = await tx`select proof_of_receipt from order_items where artisan_id = ${id}`;
      mediaPaths.push(...orderItemProofs.flatMap((row) => collectStoredPaths((row as Record<string, unknown>).proof_of_receipt)));

      await tx`delete from chat_conversations where artisan_id = ${id}`;
      await tx`delete from face_embeddings where artisan_id = ${id}`;
      await tx`delete from artisan_verification_results where artisan_id = ${id}`;
      await tx`delete from face_verification_logs where artisan_id = ${id} or lower(email) = ${email.toLowerCase()}`;
      await tx`
        update shipments
        set sender_name = 'Deleted artisan',
            sender_phone = '',
            sender_address = 'Removed after account deletion',
            items_summary = 'Deleted artisan product',
            notes = null
        where artisan_id = ${id}`;
      await tx`
        update order_items
        set product_name = 'Deleted artisan product',
            review_comment = null,
            proof_of_receipt = null
        where artisan_id = ${id}`;
      await tx`
        update reports
        set reason = 'Report details removed after artisan account deletion'
        where (reported_type = 'artisan' and reported_id = ${id})
           or (reported_type in ('product', 'experience') and reported_id in (select id from products where artisan_id = ${id}))`;

      await tx`
        update products
        set name = 'Deleted artisan product',
            description = null,
            category = null,
            image_path = null,
            image_2_path = null,
            image_3_path = null,
            image_4_path = null,
            product_gallery = '[]'::jsonb,
            video_path = null,
            status = 'inactive',
            nfc_tag_id = null,
            nfc_tag_status = null,
            nfc_tag_history = null,
            has_tutorial = false,
            tutorial_date = null,
            tutorial_price = null,
            tutorial_capacity = null,
            tutorial_location = null,
            tutorial_lat = null,
            tutorial_lng = null,
            materials_used = null,
            attributes = null,
            has_variations = false,
            variation_pricing = false,
            variations_data = null,
            tutorial_title = null,
            tutorial_description = null,
            tutorial_dates = null,
            tutorial_time = null,
            tutorial_venue_barangay = null,
            tutorial_venue_municipality = null,
            tutorial_venue_street = null,
            tutorial_venue_meeting_place = null,
            tutorial_fee_type = null,
            tutorial_gallery = null,
            tutorial_learnings = null,
            tutorial_things_to_bring = null,
            tutorial_status = null,
            stock_quantity = 0
        where artisan_id = ${id}`;

      await tx`delete from notifications where artisan_id = ${id} and user_role = 'artisan'`;
      await tx`delete from pending_registrations where lower(email) = ${email.toLowerCase()}`;
      await tx`
        update activity_logs
        set user_id = null,
            user_role = 'system',
            user_name = 'Deleted artisan',
            action = 'account_deleted',
            description = 'Activity details removed after account deletion',
            ip_address = ''
        where user_id = ${id} and user_role = 'artisan'`;
      await tx`
        update artisans
        set name = 'Deleted artisan',
            email = ${replacementEmail},
            password = ${await hashPasswordAdmin(crypto.randomUUID())},
            location = null,
            business_name = null,
            craft_type = null,
            dob = null,
            id_type = null,
            indigenous_affiliation = null,
            id_document_path = null,
            id_document_back_path = null,
            id_number = null,
            proof_of_craft_path = null,
            product_sample_1_path = null,
            product_sample_2_path = null,
            selfie_path = null,
            affiliation_document_path = null,
            verification_status = 'suspended',
            application_submitted = false,
            profile_picture = null,
            bio = null,
            phone = null,
            face_matched = null,
            face_confidence = null,
            registration_notes = null,
            account_deleted_at = now()
        where id = ${id}`;
      return true;
    });
    if (!deleted) return { deleted: false };
    invalidate('admin:stats');
    invalidate('artisans*');
    invalidate('artisan:*');
    invalidate('products:active:default');
    const warning = await cleanupStoredFiles(mediaPaths);
    return { deleted: true, warning };
  }

  syncFromCore();
  const s = store();
  const artisan = s.artisans.find((entry) => entry.id === id && !entry.account_deleted_at);
  if (!artisan) return { deleted: false };
  mediaPaths.push(
    ...collectStoredPaths(artisan.profile_picture),
    ...collectStoredPaths(artisan.selfie_path),
    ...collectStoredPaths(artisan.id_document_path),
    ...collectStoredPaths(artisan.id_document_back_path),
    ...collectStoredPaths(artisan.proof_of_craft_path),
    ...collectStoredPaths(artisan.product_sample_1_path),
    ...collectStoredPaths(artisan.product_sample_2_path),
    ...collectStoredPaths(artisan.affiliation_document_path),
  );
  const replacementEmail = deletedEmail('artisan', id);
  const password = await hashPasswordAdmin(crypto.randomUUID());
  const deletedAt = new Date().toISOString();
  Object.assign(artisan, {
    name: 'Deleted artisan',
    email: replacementEmail,
    password,
    location: null,
    business_name: null,
    craft_type: null,
    dob: null,
    id_type: null,
    indigenous_affiliation: null,
    id_number: null,
    id_document_path: null,
    id_document_back_path: null,
    proof_of_craft_path: null,
    product_sample_1_path: null,
    product_sample_2_path: null,
    selfie_path: null,
    affiliation_document_path: null,
    verification_status: 'suspended',
    application_submitted: false,
    profile_picture: null,
    bio: null,
    phone: null,
    face_matched: null,
    face_confidence: null,
    registration_notes: null,
    account_deleted_at: deletedAt,
  });
  const core = (globalThis as unknown as {
    __cmDemoStore?: {
      artisans: Array<Artisan & { password: string }>;
      products: Product[];
      order_items: Array<OrderItem & { proof_of_receipt?: string | null }>;
      shipments: Array<{ artisan_id: number; sender_name: string; sender_phone: string; sender_address: string; items_summary: string; notes: string | null }>;
      notifications: Array<{ user_id: number | null; artisan_id?: number | null; user_role: string }>;
      chat_conversations: Array<{ id: number; artisan_id: number }>;
      chat_messages: Array<{ conversation_id: number }>;
      activity_logs: Array<{ user_id: number | null; user_role: string; user_name: string; action: string; description: string; ip_address?: string }>;
    };
  }).__cmDemoStore;
  const ownedProducts = s.products.filter((product) => product.artisan_id === id);
  for (const product of ownedProducts) {
    const raw = product as Product & Record<string, unknown>;
    mediaPaths.push(
      ...collectStoredPaths(raw.image_path),
      ...collectStoredPaths(raw.image_2_path),
      ...collectStoredPaths(raw.image_3_path),
      ...collectStoredPaths(raw.image_4_path),
      ...collectStoredPaths(raw.product_gallery),
      ...collectStoredPaths(raw.video_path),
      ...collectStoredPaths(raw.tutorial_gallery),
    );
    Object.assign(product, {
      name: 'Deleted artisan product',
      description: null,
      category: null,
      image_path: null,
      product_gallery: null,
      video_path: null,
      status: 'inactive',
      nfc_tag_id: null,
      nfc_tag_status: null,
      has_tutorial: false,
      tutorial_title: null,
      tutorial_description: null,
      tutorial_dates: null,
      tutorial_price: null,
      tutorial_capacity: null,
      tutorial_location: null,
      tutorial_lat: null,
      tutorial_lng: null,
      tutorial_fee_type: null,
      tutorial_learnings: null,
      tutorial_status: null,
      materials_used: null,
      has_variations: false,
      variation_pricing: false,
      variations_data: null,
      stock_quantity: 0,
    });
    for (const key of ['image_2_path', 'image_3_path', 'image_4_path', 'nfc_tag_history', 'attributes', 'tutorial_time', 'tutorial_venue_barangay', 'tutorial_venue_municipality', 'tutorial_venue_street', 'tutorial_venue_meeting_place', 'tutorial_gallery', 'tutorial_things_to_bring']) raw[key] = null;
  }
  for (const item of s.order_items.filter((entry) => entry.artisan_id === id)) {
    mediaPaths.push(...collectStoredPaths(item.proof_of_receipt));
    item.product_name = 'Deleted artisan product';
    item.review_comment = null;
    item.proof_of_receipt = null;
  }
  for (const shipment of (core?.shipments ?? []).filter((entry) => entry.artisan_id === id)) {
    shipment.sender_name = 'Deleted artisan';
    shipment.sender_phone = '';
    shipment.sender_address = 'Removed after account deletion';
    shipment.items_summary = 'Deleted artisan product';
    shipment.notes = null;
  }
  if (core) {
    core.notifications = core.notifications.filter((notification) =>
      notification.user_role !== 'artisan' || notification.artisan_id !== id
    );
    for (const log of core.activity_logs.filter((entry) => entry.user_id === id && entry.user_role === 'artisan')) {
      log.user_id = null;
      log.user_role = 'system';
      log.user_name = 'Deleted artisan';
      log.action = 'account_deleted';
      log.description = 'Activity details removed after account deletion';
      log.ip_address = '';
    }
    core.artisans = s.artisans;
    core.products = s.products;
    core.order_items = s.order_items;
    const conversationIds = new Set(core.chat_conversations.filter((conversation) => conversation.artisan_id === id).map((conversation) => conversation.id));
    core.chat_conversations = core.chat_conversations.filter((conversation) => conversation.artisan_id !== id);
    core.chat_messages = core.chat_messages.filter((message) => !conversationIds.has(message.conversation_id));
  }
  for (const report of s.reports.filter((entry) =>
    (entry.reported_type === 'artisan' && entry.reported_id === id) ||
    ((entry.reported_type === 'product' || entry.reported_type === 'experience') && ownedProducts.some((product) => product.id === entry.reported_id)))) {
    report.reason = 'Report details removed after artisan account deletion';
    report.reported_name = 'Deleted artisan';
  }
  invalidate('admin:stats');
  invalidate('artisans*');
  invalidate('artisan:*');
  invalidate('products:active:default');
  const warning = await cleanupStoredFiles(mediaPaths);
  return { deleted: true, warning };
}

// ---------------------------------------------------------------------------
// Bookings (workshop/experience order items)
// ---------------------------------------------------------------------------
export async function listBookings(artisanId?: number): Promise<ExperienceBooking[]> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`
      select oi.id as order_item_id, oi.order_id, oi.product_id, oi.artisan_id, oi.product_name,
             oi.attendee_name, oi.attendee_contact, oi.attendee_for, oi.selected_session, oi.quantity, oi.price,
             oi.status, oi.ticket_code, oi.selected_variant, oi.purchase_type,
             o.customer_id, u.name as customer_name, u.phone as customer_phone,
             o.notes as order_notes, o.payment_method
      from order_items oi
      join orders o on o.id = oi.order_id
      join users u on u.id = o.customer_id
      where oi.purchase_type <> 'product'
        ${artisanId ? sql`and oi.artisan_id = ${artisanId}` : sql``}
      order by oi.id desc limit 200`;
    return (rows as unknown as Record<string, unknown>[]).map((r) => ({
      order_item_id: n(r.order_item_id), order_id: n(r.order_id), product_id: n(r.product_id),
      customer_id: n(r.customer_id), customer_name: String(r.customer_name),
      customer_phone: (r.customer_phone as string) ?? null,
      id: n(r.product_id), product_name: String(r.product_name),
      attendee_name: (r.attendee_name as string) ?? null, attendee_contact: (r.attendee_contact as string) ?? null,
      attendee_for: (r.attendee_for as string) ?? null,
      selected_session: (r.selected_session as ExperienceBooking['selected_session']) ?? null,
      selected_variant: (r.selected_variant as string) ?? null,
      purchase_type: (r.purchase_type as string) ?? 'workshop',
      order_notes: (r.order_notes as string) ?? null,
      payment_method: (r.payment_method as string) ?? null,
      quantity: n(r.quantity), price: n(r.price), status: String(r.status), ticket_code: (r.ticket_code as string) ?? null,
    }));
  }
  const s = store();
  return s.order_items
    .filter((x) => x.purchase_type !== 'product' && (!artisanId || x.artisan_id === artisanId))
    .map((x) => {
      const o = s.orders.find((oo) => oo.id === x.order_id);
      const cust = s.users.find((u) => u.id === o?.customer_id);
      return {
        id: x.product_id, order_item_id: x.id, order_id: x.order_id, product_id: x.product_id,
        customer_id: o?.customer_id ?? 0, customer_name: cust?.name ?? 'Customer',
        customer_phone: cust?.phone ?? null,
        product_name: x.product_name, attendee_name: x.attendee_name,
        attendee_contact: (x as unknown as { attendee_contact?: string }).attendee_contact ?? cust?.phone ?? null,
        attendee_for: (x as unknown as { attendee_for?: string }).attendee_for ?? null,
        selected_session: x.selected_session as ExperienceBooking['selected_session'],
        selected_variant: (x as unknown as { selected_variant?: string }).selected_variant ?? null,
        purchase_type: x.purchase_type,
        order_notes: o?.notes ?? null,
        payment_method: o?.payment_method ?? null,
        quantity: x.quantity, price: n(x.price), status: x.status, ticket_code: x.ticket_code,
      };
    })
    .sort((a, b) => b.order_item_id - a.order_item_id);
}

export async function updateBookingStatus(orderItemId: number, status: string): Promise<void> {
  if (usingPg) {
    await sql`update order_items set status = ${status} where id = ${orderItemId}`;
    return;
  }
  const i = store().order_items.find((x) => x.id === orderItemId);
  if (i) i.status = status;
}

// ---------------------------------------------------------------------------
// Reviews (order_items review columns; visibility flag)
// ---------------------------------------------------------------------------
export async function listAllReviews(): Promise<Array<OrderItem & { review_visible?: boolean; customer_name?: string | null }>> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`
      select oi.*, u.name as customer_name from order_items oi
      join orders o on o.id = oi.order_id
      join users u on u.id = o.customer_id
      where oi.review_rating is not null
      order by oi.reviewed_at desc nulls last limit 200`;
    return (rows as unknown as Record<string, unknown>[]).map((r) => ({
      ...mapItem(r),
      review_visible: r.review_visible == null ? true : Boolean(r.review_visible),
      customer_name: (r.customer_name as string) ?? null,
    }));
  }
  return store().order_items
    .filter((x) => x.review_rating != null)
    .map((x) => {
      const o = store().orders.find((oo) => oo.id === x.order_id);
      const cust = store().users.find((u) => u.id === o?.customer_id);
      return { ...x, review_visible: (x as { review_visible?: boolean }).review_visible ?? true, customer_name: cust?.name ?? null };
    })
    .sort((a, b) => (b.reviewed_at ?? '').localeCompare(a.reviewed_at ?? ''));
}

function mapItem(r: Record<string, unknown>): OrderItem {
  return {
    id: n(r.id), order_id: n(r.order_id), product_id: n(r.product_id), artisan_id: n(r.artisan_id),
    product_name: String(r.product_name), purchase_type: r.purchase_type as OrderItem['purchase_type'],
    attendee_name: (r.attendee_name as string) ?? null,
    selected_session: parseJsonish<OrderItem['selected_session']>(r.selected_session), ticket_code: (r.ticket_code as string) ?? null,
    quantity: n(r.quantity), price: n(r.price), status: String(r.status ?? 'pending'),
    review_rating: r.review_rating == null ? null : n(r.review_rating),
    review_comment: (r.review_comment as string) ?? null,
    reviewed_at: (r.reviewed_at as string) ?? null,
    selected_variant: (r.selected_variant as string) ?? null,
  };
}

export async function setReviewVisible(itemId: number, visible: boolean): Promise<void> {
  if (usingPg) {
    await sql`update order_items set review_visible = ${visible} where id = ${itemId}`;
    return;
  }
  const i = store().order_items.find((x) => x.id === itemId) as { review_visible?: boolean } | undefined;
  if (i) i.review_visible = visible;
}

export async function deleteReview(itemId: number): Promise<void> {
  if (usingPg) {
    await sql`update order_items set review_rating = null, review_comment = null, reviewed_at = null where id = ${itemId}`;
    return;
  }
  const i = store().order_items.find((x) => x.id === itemId);
  if (i) { i.review_rating = null; i.review_comment = null; i.reviewed_at = null; }
}

// ---------------------------------------------------------------------------
// Reports (moderation)
// ---------------------------------------------------------------------------
export async function listReports(): Promise<Report[]> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`
      select r.*, coalesce(r.reporter_name, u.name) as reporter_name
      from reports r
      left join users u on u.id = r.reporter_id
      order by r.created_at desc limit 200`;
    return (rows as unknown as Record<string, unknown>[]).map((r) => ({
      ...r,
      reporter_name: (r.reporter_name as string) ?? null,
      created_at: tsString(r.created_at),
      resolved_at: tsString((r as { resolved_at?: unknown }).resolved_at),
    })) as unknown as Report[];
  }
  return [...store().reports].sort((a, b) => b.id - a.id);
}

export async function updateReport(id: number, p: { status?: Report['status']; action_taken?: string }): Promise<void> {
  if (usingPg) {
    await sql`update reports set
      status = coalesce(${p.status ?? null}, status),
      action_taken = coalesce(${p.action_taken ?? null}, action_taken)
      where id = ${id}`;
    return;
  }
  const r = store().reports.find((x) => x.id === id);
  if (r) {
    if (p.status) r.status = p.status;
    if (p.action_taken) r.action_taken = p.action_taken;
  }
}

export async function createReport(input: { reporterId: number; reportedType: Report['reported_type']; reportedId: number; reason: string; reporterName?: string; reportedName?: string }): Promise<number> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`insert into reports (reporter_id, reported_type, reported_id, reason, reporter_name, reported_name)
      values (${input.reporterId}, ${input.reportedType}, ${input.reportedId}, ${input.reason}, ${input.reporterName ?? null}, ${input.reportedName ?? null})
      returning id`;
    return n((rows[0] as Record<string, unknown>).id);
  }
  const id = Math.max(0, ...store().reports.map((r) => r.id)) + 1;
  store().reports.push({
    id, reporter_id: input.reporterId, reported_type: input.reportedType, reported_id: input.reportedId,
    reason: input.reason, status: 'pending', action_taken: null, created_at: new Date().toISOString(),
    reporter_name: input.reporterName ?? null, reported_name: input.reportedName ?? null,
  });
  return id;
}

/** Moderation actions with side effects (suspend listing / account). */
export async function suspendProduct(productId: number): Promise<void> {
  if (usingPg) {
    await sql`update products set status = 'inactive' where id = ${productId}`;
    return;
  }
  const p = store().products.find((x) => x.id === productId);
  if (p) p.status = 'inactive';
}

export async function suspendArtisanAccount(artisanId: number): Promise<void> {
  if (usingPg) {
    await sql`update artisans set verification_status = 'suspended' where id = ${artisanId}`;
    invalidate('artisans*');
    return;
  }
  const a = store().artisans.find((x) => x.id === artisanId);
  if (a) a.verification_status = 'suspended';
}

// ---------------------------------------------------------------------------
// Categories (admin)
// ---------------------------------------------------------------------------
// Case-insensitive duplicate check so "weaving" and "Weaving" can't coexist.
export async function addCategory(name: string, type: 'product' | 'experience'): Promise<{ ok: boolean }> {
  syncFromCore();
  if (usingPg) {
    const dup = (await sql`select id from categories where lower(name) = lower(${name}) and type = ${type}`)[0];
    if (dup) return { ok: false };
    await sql`insert into categories (name, type) values (${name}, ${type})`;
    invalidate('categories*');
    return { ok: true };
  }
  const list = store().categories;
  if (list.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type)) return { ok: false };
  list.push({ id: Math.max(0, ...list.map((c) => c.id)) + 1, name, type });
  return { ok: true };
}

// Returns { ok: false, products } when products still reference the category,
// so the admin UI can block deletion instead of orphaning listings.
export async function deleteCategoryDb(id: number): Promise<{ ok: boolean; products: number }> {
  if (usingPg) {
    const cat = (await sql`select name from categories where id = ${id}`)[0] as { name: string } | undefined;
    if (!cat) return { ok: false, products: 0 };
    const used = (await sql`select count(*) as n from products where lower(category) = lower(${cat.name})`)[0] as { n: string | number };
    const products = Number(used.n);
    if (products > 0) return { ok: false, products };
    await sql`delete from categories where id = ${id}`;
    invalidate('categories*');
    return { ok: true, products: 0 };
  }
  const s = store();
  const cat = s.categories.find((c) => c.id === id);
  if (!cat) return { ok: false, products: 0 };
  const products = s.products.filter((p) => (p.category ?? '').trim().toLowerCase() === cat.name.toLowerCase()).length;
  if (products > 0) return { ok: false, products };
  s.categories = s.categories.filter((c) => c.id !== id);
  return { ok: true, products: 0 };
}

// ---------------------------------------------------------------------------
// Settings / homepage / announcements
// ---------------------------------------------------------------------------
export async function getAllSettings(): Promise<Record<string, string>> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`select key, value from settings`;
    return Object.fromEntries(rows.map((r) => [String((r as Record<string, unknown>).key), String((r as Record<string, unknown>).value)]));
  }
  return { ...store().settings };
}

export async function saveSettings(entries: Record<string, string>): Promise<void> {
  if (usingPg) {
    for (const [key, value] of Object.entries(entries)) {
      await sql`insert into settings (key, value) values (${key}, ${value})
        on conflict (key) do update set value = excluded.value`;
    }
    invalidate('settings');
    return;
  }
  Object.assign(store().settings, entries);
}

// ---------------------------------------------------------------------------
// NFC admin
// ---------------------------------------------------------------------------
export async function listTaggedProducts(): Promise<Product[]> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`select * from products where nfc_tag_id is not null order by created_at desc`;
    return rows as unknown as Product[];
  }
  return store().products.filter((p) => p.nfc_tag_id);
}

export async function setNfcTagStatus(productId: number, status: 'active' | 'inactive' | 'lost'): Promise<void> {
  if (usingPg) {
    await sql`update products set nfc_tag_status = ${status} where id = ${productId}`;
    return;
  }
  const p = store().products.find((x) => x.id === productId);
  if (p) p.nfc_tag_status = status;
}

export async function replaceNfcTag(productId: number, newTagId: string): Promise<void> {
  if (usingPg) {
    await sql`update products set nfc_tag_id = ${newTagId}, nfc_tag_status = 'active' where id = ${productId}`;
    return;
  }
  const p = store().products.find((x) => x.id === productId);
  if (p) { p.nfc_tag_id = newTagId; p.nfc_tag_status = 'active'; }
}

// Registers a NEW tag on a product: the server generates the tag ID (artisans
// never type one — prevents typos and collisions) and the tag starts in
// `awaiting_write` until the physical card is confirmed written (activation).
export async function registerNfcTag(productId: number): Promise<{ tagId: string } | { error: string }> {
  syncFromCore();
  const existing = usingPg
    ? await sql`select nfc_tag_id from products where id = ${productId}`
    : [{ nfc_tag_id: store().products.find((x) => x.id === productId)?.nfc_tag_id ?? null }];
  if (existing.length && existing[0].nfc_tag_id) return { error: 'This product already has an NFC tag. Use “Replace tag” instead.' };

  // Collision-safe generation (tag column is unique in the DB).
  for (let attempt = 0; attempt < 5; attempt++) {
    const tagId = `CM-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    try {
      if (usingPg) {
        await sql`update products set nfc_tag_id = ${tagId}, nfc_tag_status = 'awaiting_write' where id = ${productId} and nfc_tag_id is null`;
      } else {
        const p = store().products.find((x) => x.id === productId);
        if (p) { p.nfc_tag_id = tagId; p.nfc_tag_status = 'awaiting_write'; }
      }
      return { tagId };
    } catch {
      // unique violation — regenerate and retry
    }
  }
  return { error: 'Could not generate a unique tag ID. Please try again.' };
}

// Called after the NfcWriter read-back confirms the URL on the card matches.
export async function activateNfcTag(productId: number, expectedTagId: string): Promise<boolean> {
  syncFromCore();
  if (usingPg) {
    const r = await sql`update products set nfc_tag_status = 'active' where id = ${productId} and nfc_tag_id = ${expectedTagId} returning id`;
    return r.length > 0;
  }
  const p = store().products.find((x) => x.id === productId);
  if (!p || p.nfc_tag_id !== expectedTagId) return false;
  p.nfc_tag_status = 'active';
  return true;
}

export async function listUntaggedProducts(): Promise<Product[]> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`select * from products where nfc_tag_id is null order by created_at desc`;
    return rows as unknown as Product[];
  }
  return store().products.filter((p) => !p.nfc_tag_id);
}

// Clears a product's tag entirely (used before re-registering on replace).
export async function clearNfcTag(productId: number): Promise<void> {
  if (usingPg) {
    await sql`update products set nfc_tag_id = null, nfc_tag_status = null where id = ${productId}`;
    return;
  }
  const p = store().products.find((x) => x.id === productId);
  if (p) { p.nfc_tag_id = null; p.nfc_tag_status = null; }
}

// ---------------------------------------------------------------------------
// Analytics (artisan)
// ---------------------------------------------------------------------------
export async function artisanAnalytics(artisanId: number): Promise<ArtisanAnalytics> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`
      select
        (select coalesce(sum(oi.price * oi.quantity), 0) from order_items oi where oi.artisan_id = ${artisanId} and oi.status <> 'cancelled') as total_sales,
        (select count(distinct oi.order_id) from order_items oi where oi.artisan_id = ${artisanId}) as total_orders,
        (select avg(oi.review_rating) from order_items oi where oi.artisan_id = ${artisanId} and oi.review_rating is not null) as avg_rating,
        (select count(*) from order_items oi where oi.artisan_id = ${artisanId} and oi.review_rating is not null) as review_count,
        (select count(*) from products p where p.artisan_id = ${artisanId}) as product_count,
        (select count(*) from order_items oi where oi.artisan_id = ${artisanId} and oi.purchase_type <> 'product') as booking_count,
        (select count(*) from order_items oi where oi.artisan_id = ${artisanId} and oi.purchase_type <> 'product' and oi.status = 'pending') as pending_bookings`;
    const r = rows[0] as Record<string, unknown>;
    const top = await sql`
      select oi.product_name as name, sum(oi.quantity) as qty, sum(oi.price * oi.quantity) as revenue
      from order_items oi where oi.artisan_id = ${artisanId}
      group by oi.product_name order by revenue desc limit 5`;
    const recent = await sql`
      select p.name, oi.review_rating as rating, oi.review_comment as comment, oi.reviewed_at
      from order_items oi join products p on p.id = oi.product_id
      where oi.artisan_id = ${artisanId} and oi.review_rating is not null
      order by oi.reviewed_at desc nulls last limit 5`;
    return {
      totalSales: n(r.total_sales), totalOrders: n(r.total_orders),
      avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
      reviewCount: n(r.review_count), productCount: n(r.product_count),
      bookingCount: n(r.booking_count), pendingBookings: n(r.pending_bookings),
      topProducts: (top as unknown as Record<string, unknown>[]).map((t) => ({ name: String(t.name), qty: n(t.qty), revenue: n(t.revenue) })),
      recentReviews: (recent as unknown as Record<string, unknown>[]).map((t) => ({ name: String(t.name), rating: n(t.rating), comment: (t.comment as string) ?? null, reviewed_at: t.reviewed_at ? String(t.reviewed_at) : null })),
    };
  }
  const s = store();
  const items = s.order_items.filter((x) => x.artisan_id === artisanId && x.status !== 'cancelled');
  const reviews = items.filter((x) => x.review_rating != null);
  const bookings = s.order_items.filter((x) => x.artisan_id === artisanId && x.purchase_type !== 'product');
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  for (const i of items) {
    const e = byProduct.get(i.product_name) ?? { qty: 0, revenue: 0 };
    e.qty += i.quantity; e.revenue += n(i.price) * i.quantity;
    byProduct.set(i.product_name, e);
  }
  return {
    totalSales: items.reduce((sum, i) => sum + n(i.price) * i.quantity, 0),
    totalOrders: new Set(items.map((i) => i.order_id)).size,
    avgRating: reviews.length ? reviews.reduce((sum, i) => sum + (i.review_rating ?? 0), 0) / reviews.length : null,
    reviewCount: reviews.length,
    productCount: s.products.filter((p) => p.artisan_id === artisanId).length,
    bookingCount: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === 'pending').length,
    topProducts: [...byProduct.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentReviews: reviews.slice(0, 5).map((r) => ({ name: r.product_name, rating: r.review_rating ?? 0, comment: r.review_comment, reviewed_at: r.reviewed_at })),
  };
}

// ---------------------------------------------------------------------------
// Addresses (customer)
// ---------------------------------------------------------------------------
export async function listAddresses(customerId: number): Promise<Address[]> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`select * from customer_addresses where customer_id = ${customerId} order by is_default desc, id`;
    return rows as unknown as Address[];
  }
  return store().addresses.filter((a) => a.customer_id === customerId);
}

export async function createAddress(input: Omit<Address, 'id'>): Promise<number> {
  if (usingPg) {
    if (input.is_default) await sql`update customer_addresses set is_default = false where customer_id = ${input.customer_id}`;
    const rows = await sql`insert into customer_addresses (customer_id, label, full_name, phone, address, landmark, is_default)
      values (${input.customer_id}, ${input.label}, ${input.full_name}, ${input.phone}, ${input.address}, ${input.landmark}, ${input.is_default})
      returning id`;
    return n((rows[0] as Record<string, unknown>).id);
  }
  const s = store();
  if (input.is_default) s.addresses.forEach((a) => { if (a.customer_id === input.customer_id) a.is_default = false; });
  const id = Math.max(0, ...s.addresses.map((a) => a.id)) + 1;
  s.addresses.push({ ...input, id });
  return id;
}

export async function deleteAddress(customerId: number, id: number): Promise<void> {
  if (usingPg) {
    await sql`delete from customer_addresses where id = ${id} and customer_id = ${customerId}`;
    return;
  }
  const s = store();
  s.addresses = s.addresses.filter((a) => !(a.id === id && a.customer_id === customerId));
}

export async function setDefaultAddress(customerId: number, id: number): Promise<void> {
  if (usingPg) {
    await sql`update customer_addresses set is_default = (id = ${id}) where customer_id = ${customerId}`;
    return;
  }
  store().addresses.forEach((a) => { if (a.customer_id === customerId) a.is_default = a.id === id; });
}

// ---------------------------------------------------------------------------
// Profile (customer + artisan)
// ---------------------------------------------------------------------------
export async function updateCustomerProfile(id: number, p: { name?: string; phone?: string; location?: string; bio?: string; profile_picture?: string }): Promise<void> {
  if (usingPg) {
    await sql`update users set
      name = coalesce(${p.name ?? null}, name),
      phone = coalesce(${p.phone ?? null}, phone),
      location = coalesce(${p.location ?? null}, location),
      bio = coalesce(${p.bio ?? null}, bio),
      profile_picture = coalesce(${p.profile_picture ?? null}, profile_picture)
      where id = ${id}`;
    return;
  }
  const u = store().users.find((x) => x.id === id);
  if (u) Object.assign(u, Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
}

export async function updateArtisanProfile(id: number, p: { name?: string; phone?: string; location?: string; bio?: string; business_name?: string; craft_type?: string; profile_picture?: string }): Promise<void> {
  if (usingPg) {
    await sql`update artisans set
      name = coalesce(${p.name ?? null}, name),
      phone = coalesce(${p.phone ?? null}, phone),
      location = coalesce(${p.location ?? null}, location),
      bio = coalesce(${p.bio ?? null}, bio),
      business_name = coalesce(${p.business_name ?? null}, business_name),
      craft_type = coalesce(${p.craft_type ?? null}, craft_type),
      profile_picture = coalesce(${p.profile_picture ?? null}, profile_picture)
      where id = ${id}`;
    invalidate('artisans*');
    return;
  }
  const a = store().artisans.find((x) => x.id === id);
  if (a) Object.assign(a, Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
}

// ---------------------------------------------------------------------------
// Tutorials (artisan): session dates + attendees
// ---------------------------------------------------------------------------
export async function saveTutorialDates(artisanId: number, productId: number, dates: unknown): Promise<void> {
  // Pass the array as-is: the pool's json type serializer handles jsonb params.
  if (usingPg) {
    await sql`update products set tutorial_dates = ${(dates ?? null) as unknown as string | null}, has_tutorial = true where id = ${productId} and artisan_id = ${artisanId}`;
    return;
  }
  const p = store().products.find((x) => x.id === productId && x.artisan_id === artisanId);
  if (p) { p.tutorial_dates = dates as Product['tutorial_dates']; p.has_tutorial = true; }
}

export async function listAttendees(artisanId: number, productId: number): Promise<ExperienceBooking[]> {
  const all = await listBookings(artisanId);
  return all.filter((b) => b.product_id === productId);
}

export async function markAttendeePresent(orderItemId: number, present: boolean): Promise<void> {
  await updateBookingStatus(orderItemId, present ? 'attended' : 'no_show');
}

// ---------------------------------------------------------------------------
// Reports seed name backfill for demo (reporter names resolved at read time)
// ---------------------------------------------------------------------------
export async function getCustomerName(id: number): Promise<string | null> {
  syncFromCore();
  if (usingPg) {
    const rows = await sql`select name from users where id = ${id} limit 1`;
    return rows.length ? String((rows[0] as Record<string, unknown>).name) : null;
  }
  return store().users.find((u) => u.id === id)?.name ?? null;
}

/** Batched names for many users — ONE query (N+1 fix for report/moderation lists). */
export async function getCustomerNames(ids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return map;
  if (usingPg) {
    const rows = await sql`select id, name from users where id = any(${unique})`;
    for (const r of rows as unknown as Record<string, unknown>[]) map.set(n(r.id), String(r.name));
    return map;
  }
  for (const id of unique) {
    const u = store().users.find((x) => x.id === id);
    if (u) map.set(id, u.name);
  }
  return map;
}

/** Batched product counts for many artisans — ONE query (N+1 fix for artisan lists). */
export async function getProductCountsByArtisan(artisanIds?: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (artisanIds && artisanIds.length === 0) return map;
  const unique = artisanIds ? [...new Set(artisanIds)].filter(Boolean) : null;
  if (usingPg) {
    const rows = unique && unique.length
      ? await sql`select artisan_id, count(*)::int as cnt from products where artisan_id = any(${unique}) group by artisan_id`
      : await sql`select artisan_id, count(*)::int as cnt from products group by artisan_id`;
    for (const r of rows as unknown as Record<string, unknown>[]) map.set(n(r.artisan_id), n(r.cnt));
    return map;
  }
  const prods = store().products;
  for (const p of prods) {
    if (!unique || unique.includes(p.artisan_id)) {
      map.set(p.artisan_id, (map.get(p.artisan_id) ?? 0) + 1);
    }
  }
  return map;
}

// bcrypt re-export for password change route
export async function hashPasswordAdmin(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
