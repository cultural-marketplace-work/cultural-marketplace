import sharp from 'sharp';
import HumanLibrary from '@vladmandic/human';
import type { Config as HumanConfig } from '@vladmandic/human';
import type { StoredEmbedding } from './faceEmbeddings';

export const HUMAN_FACE_EMBEDDING_SIZE = 1024;
export const HUMAN_FACE_MATCH_THRESHOLD = 0.5;

const MODEL_BASE_PATH = 'https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/';
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/';

type HumanInstance = InstanceType<typeof HumanLibrary>;
type HumanFace = Awaited<ReturnType<HumanInstance['detect']>>['face'][number];

export type HumanFaceComparison =
  | {
      status: 'ok';
      match: boolean;
      similarity: number;
      distance: number;
      selfie_embedding: number[];
    }
  | { status: 'no_face'; message: string };

let humanPromise: Promise<HumanInstance> | null = null;
let inferenceQueue: Promise<void> = Promise.resolve();

function createHuman(): HumanInstance {
  const config: Partial<HumanConfig> = {
    backend: 'wasm',
    wasmPath: WASM_PATH,
    modelBasePath: MODEL_BASE_PATH,
    debug: false,
    face: {
      enabled: true,
      detector: { enabled: true, rotation: true, maxDetected: 2, minConfidence: 0.3 },
      mesh: { enabled: true },
      description: { enabled: true },
      emotion: { enabled: false },
      iris: { enabled: false },
      attention: { enabled: false },
      antispoof: { enabled: false },
      liveness: { enabled: false },
      gear: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
  };
  return new HumanLibrary(config);
}

async function getHuman(): Promise<HumanInstance> {
  if (!humanPromise) {
    humanPromise = (async () => {
      const human = createHuman();
      await human.tf.ready();
      await human.load();
      return human;
    })().catch((error: unknown) => {
      humanPromise = null;
      throw error;
    });
  }
  return humanPromise;
}

async function detectSingleFace(human: HumanInstance, image: ArrayBuffer, label: string): Promise<HumanFace> {
  const decoded = await sharp(Buffer.from(image), { limitInputPixels: 20_000_000 })
    .rotate()
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tensor = human.tf.tensor4d(
    new Uint8Array(decoded.data),
    [1, decoded.info.height, decoded.info.width, decoded.info.channels],
    'float32',
  );
  try {
    const result = await human.detect(tensor);
    if (result.face.length !== 1) {
      throw new Error(`${label} must contain exactly one clearly visible face.`);
    }
    const face = result.face[0];
    if (!face.embedding || face.embedding.length !== HUMAN_FACE_EMBEDDING_SIZE) {
      throw new Error(`Human.js could not generate a usable face template from the ${label}.`);
    }
    return face;
  } finally {
    human.tf.dispose(tensor);
  }
}

async function withHuman<T>(work: (human: HumanInstance) => Promise<T>): Promise<T> {
  const result = inferenceQueue.then(async () => work(await getHuman()));
  inferenceQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function compareHumanFaces(idImage: ArrayBuffer, selfie: ArrayBuffer): Promise<HumanFaceComparison> {
  return withHuman(async (human) => {
    let idFace: HumanFace;
    let selfieFace: HumanFace;
    try {
      idFace = await detectSingleFace(human, idImage, 'ID photo');
      selfieFace = await detectSingleFace(human, selfie, 'selfie');
    } catch (error) {
      if (error instanceof Error && error.message.includes('exactly one clearly visible face')) {
        return { status: 'no_face', message: error.message };
      }
      throw error;
    }

    const idEmbedding = idFace.embedding!;
    const selfieEmbedding = selfieFace.embedding!;
    const similarity = human.match.similarity(idEmbedding, selfieEmbedding);
    return {
      status: 'ok',
      match: similarity >= HUMAN_FACE_MATCH_THRESHOLD,
      similarity,
      distance: human.match.distance(idEmbedding, selfieEmbedding),
      selfie_embedding: selfieEmbedding,
    };
  });
}

export async function findDuplicateHumanEmbedding(
  embedding: number[],
  stored: StoredEmbedding[],
  excludedArtisanId: number,
): Promise<{ artisanId: number; similarity: number } | null> {
  return withHuman(async (human) => {
    let best: { artisanId: number; similarity: number } | null = null;
    for (const candidate of stored) {
      if (
        candidate.artisan_id === excludedArtisanId ||
        candidate.embedding.length !== HUMAN_FACE_EMBEDDING_SIZE
      ) {
        continue;
      }
      const similarity = human.match.similarity(embedding, candidate.embedding);
      if (similarity >= HUMAN_FACE_MATCH_THRESHOLD && (!best || similarity > best.similarity)) {
        best = { artisanId: candidate.artisan_id, similarity };
      }
    }
    return best;
  });
}
