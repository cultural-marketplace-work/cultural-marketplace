// Read/store artisan face embeddings for duplicate-face detection.
// Postgres: face_embeddings table (0001). Demo mode: seedArtisans metadata.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { sql, usingPg } from './dbPg';
import type { Artisan } from './types';

export type StoredEmbedding = { artisan_id: number; embedding: number[] };

type EncryptedEmbedding = {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
};

export function faceEmbeddingEncryptionConfigured(): boolean {
  return !usingPg || Boolean(process.env.FACE_EMBEDDING_SECRET || process.env.JWT_SECRET);
}

function embeddingKey(): Buffer {
  const secret = process.env.FACE_EMBEDDING_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('FACE_EMBEDDING_SECRET or JWT_SECRET is required to store biometric templates securely.');
  return createHash('sha256').update(`cm-face-embedding:v1:${secret}`).digest();
}

function encryptEmbedding(embedding: number[]): EncryptedEmbedding {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', embeddingKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(embedding), 'utf8'), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };
}

function decryptEmbedding(value: unknown): { embedding: number[]; legacy: boolean } {
  if (Array.isArray(value) && value.length === 128 && value.every((part) => typeof part === 'number' && Number.isFinite(part))) {
    return { embedding: value, legacy: true };
  }
  if (!value || typeof value !== 'object') throw new Error('Stored face template has an invalid format.');
  const record = value as Partial<EncryptedEmbedding>;
  if (record.version !== 1 || !record.iv || !record.tag || !record.ciphertext) {
    throw new Error('Stored face template has an unsupported encryption format.');
  }
  const decipher = createDecipheriv('aes-256-gcm', embeddingKey(), Buffer.from(record.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(record.tag, 'base64url'));
  const json = Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
  const embedding: unknown = JSON.parse(json);
  if (!Array.isArray(embedding) || embedding.length !== 128 || !embedding.every((part) => typeof part === 'number' && Number.isFinite(part))) {
    throw new Error('Decrypted face template has an invalid format.');
  }
  return { embedding, legacy: false };
}

export async function listFaceEmbeddings(): Promise<StoredEmbedding[]> {
  if (usingPg) {
    const rows = await sql`select id, artisan_id, embedding from face_embeddings`;
    const embeddings: StoredEmbedding[] = [];
    for (const row of rows as unknown as Array<{ id: unknown; artisan_id: unknown; embedding: unknown }>) {
      const { embedding, legacy } = decryptEmbedding(row.embedding);
      if (legacy) {
        await sql`update face_embeddings set embedding = ${JSON.stringify(encryptEmbedding(embedding))}::jsonb where id = ${Number(row.id)}`;
      }
      embeddings.push({ artisan_id: Number(row.artisan_id), embedding });
    }
    return embeddings;
  }
  return (seedArtisansDemo() ?? [])
    .filter((a) => Array.isArray(a.face_embedding) && a.face_embedding.length === 128)
    .map((a) => ({ artisan_id: a.id, embedding: a.face_embedding as number[] }));
}

export async function saveFaceEmbedding(artisanId: number, embedding: number[]): Promise<void> {
  if (usingPg) {
    await sql`insert into face_embeddings (artisan_id, embedding) values (${artisanId}, ${JSON.stringify(encryptEmbedding(embedding))}::jsonb)`;
    return;
  }
  const list = seedArtisansDemo() ?? [];
  const a = list.find((x) => x.id === artisanId);
  if (a) a.face_embedding = embedding;
}

// The demo store keeps artisans in db.ts's in-memory store; import lazily to
// avoid a cycle. listApprovedArtisans lives in db.ts which already imports us.
import { seedArtisans } from './seed';

type WithEmbedding = Artisan & { face_embedding?: number[] | null };

function seedArtisansDemo(): Array<Artisan & { face_embedding?: number[] | null }> | null {
  return usingPg ? null : (seedArtisans as unknown as Array<Artisan & { face_embedding?: number[] | null }>);
}

export type { WithEmbedding };
