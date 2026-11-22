// Media storage, dual backend like the database layer:
//   1. Supabase Storage  - when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
//     (service key from Dashboard -> Project Settings -> API; keys derived from
//      JWT_SECRET do not work - it is a separate dashboard secret)
//   2. Local disk        - fallback writing into public/uploads/<bucket>/...,
//     served by Next.js at /uploads/... (works in dev and on the VPS;
//     Vercel would need S3/Supabase instead - noted in .env.example)
//
// Buckets: product-media (public), profile-pictures (public), verification-docs (private).
// Private files are read back by admins via getVerificationDocUrl (signed URL on
// Supabase; the local fallback only supports the public buckets for display).

import { createClient } from '@supabase/supabase-js';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const storageEnabled = Boolean(SUPABASE_URL && SERVICE_KEY);

export type Bucket = 'product-media' | 'profile-pictures' | 'verification-docs';

const PUBLIC_BUCKETS: Bucket[] = ['product-media', 'profile-pictures'];
let supabaseStorageClient: ReturnType<typeof createClient> | null = null;

function client() {
  if (!supabaseStorageClient) {
    supabaseStorageClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  }
  return supabaseStorageClient;
}

function isTransientFetchFailure(error: unknown): boolean {
  const transientCodes = new Set([
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENETUNREACH',
    'ECONNREFUSED',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
  ]);
  let current = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const item = current as { code?: unknown; message?: unknown; cause?: unknown; originalError?: unknown };
    if (typeof item.code === 'string' && transientCodes.has(item.code)) return true;
    if (typeof item.message === 'string' && item.message.toLowerCase().includes('fetch failed')) return true;
    current = item.originalError ?? item.cause;
  }
  return false;
}

export type UploadResult = { path: string | null; publicUrl: string | null };

/** Sanitized, collision-free object path: <prefix>/<timestamp>-<rand>-<safe-name> */
export function objectPath(prefix: string, originalName: string): string {
  const safe = originalName.toLowerCase().replace(/[^a-z0-9.\-_]/g, '_').replace(/_{2,}/g, '_').slice(-80) || 'file';
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}/${Date.now()}-${rand}-${safe}`;
}

/** Upload bytes; returns storage path plus a displayable URL when the bucket is public. */
export async function uploadFile(bucket: Bucket, objectPathStr: string, data: ArrayBuffer, contentType: string): Promise<UploadResult> {
  if (storageEnabled) {
    const sb = client();
    let uploadError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await sb.storage.from(bucket).upload(objectPathStr, data, { contentType, upsert: true });
      if (!error) {
        uploadError = null;
        break;
      }
      uploadError = error;
      if (attempt === 0 && isTransientFetchFailure(error)) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      break;
    }
    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`, { cause: uploadError });
    }
    const publicUrl = PUBLIC_BUCKETS.includes(bucket)
      ? sb.storage.from(bucket).getPublicUrl(objectPathStr).data.publicUrl
      : null;
    return { path: `${bucket}/${objectPathStr}`, publicUrl };
  }

  // Local disk fallback
  const isPrivate = bucket === 'verification-docs';
  // Private docs stay OUTSIDE public/ (never web-served locally); admins review
  // them in the Supabase dashboard or via a future admin download route.
  const dir = isPrivate ? 'verification-uploads' : path.join('public', 'uploads');
  const rel = path.join(dir, objectPathStr);
  const abs = path.join(process.cwd(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(data));
  const url = isPrivate ? null : `/${['uploads', objectPathStr].join('/')}`;
  return { path: `${bucket}/${objectPathStr}`, publicUrl: url };
}

export async function deleteStoredFiles(paths: Array<string | null | undefined>): Promise<void> {
  const grouped = new Map<Bucket, Set<string>>();
  const localFiles: Array<{ bucket: Bucket | null; object: string }> = [];

  for (const rawPath of paths) {
    if (!rawPath) continue;
    const value = rawPath.trim();
    if (!value) continue;

    const url = /^https?:\/\//i.test(value) ? new URL(value) : null;
    if (url) {
      const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
      if (!match) continue;
      const bucket = match[1] as Bucket;
      if (!['product-media', 'profile-pictures', 'verification-docs'].includes(bucket)) continue;
      if (!storageEnabled) {
        throw new Error('Supabase Storage cleanup requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
      }
      const objects = grouped.get(bucket) ?? new Set<string>();
      objects.add(decodeURIComponent(match[2]));
      grouped.set(bucket, objects);
      continue;
    }

    if (value.startsWith('/uploads/')) {
      localFiles.push({ bucket: null, object: decodeURIComponent(value.slice('/uploads/'.length)) });
      continue;
    }

    const separator = value.indexOf('/');
    const bucket = value.slice(0, separator) as Bucket;
    if (separator <= 0 || !['product-media', 'profile-pictures', 'verification-docs'].includes(bucket)) continue;
    const object = decodeURIComponent(value.slice(separator + 1));
    if (storageEnabled) {
      const objects = grouped.get(bucket) ?? new Set<string>();
      objects.add(object);
      grouped.set(bucket, objects);
    } else {
      localFiles.push({ bucket, object });
    }
  }

  if (storageEnabled) {
    const sb = client();
    for (const [bucket, objects] of grouped) {
      const { error } = await sb.storage.from(bucket).remove([...objects]);
      if (error) throw new Error(`Could not remove ${bucket} files: ${error.message}`);
    }
    return;
  }

  for (const { bucket, object } of localFiles) {
    const root = path.resolve(process.cwd(), bucket === 'verification-docs' ? 'verification-uploads' : path.join('public', 'uploads'));
    const target = path.resolve(root, object);
    const relative = path.relative(root, target);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Invalid stored file path during account deletion.');
    }
    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

/** URL to display a previously uploaded object (public buckets only). */
export async function getPublicUrlFor(bucket: Bucket, objectPathStr: string): Promise<string | null> {
  if (storageEnabled) {
    const sb = client();
    return PUBLIC_BUCKETS.includes(bucket)
      ? sb.storage.from(bucket).getPublicUrl(objectPathStr).data.publicUrl
      : null;
  }
  return `/${['uploads', objectPathStr].join('/')}`;
}

/** Short-lived signed URL for admins to view private verification documents. */
export async function getVerificationDocUrl(path: string, expiresInSeconds = 300): Promise<string | null> {
  if (!storageEnabled) return null;
  const sb = client();
  const prefix = 'verification-docs/';
  const object = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  const { data, error } = await sb.storage.from('verification-docs').createSignedUrl(object, expiresInSeconds);
  if (error) throw new Error(`Unable to create signed verification URL: ${error.message}`);
  return data?.signedUrl ?? null;
}
