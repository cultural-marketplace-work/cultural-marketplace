import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectory = path.join(webDirectory, 'public', 'models');
const humanModelsDirectory = path.join(
  webDirectory,
  'node_modules',
  '@vladmandic',
  'human',
  'models',
);
const wasmDirectory = path.join(
  webDirectory,
  'node_modules',
  '@tensorflow',
  'tfjs-backend-wasm',
  'dist',
);

const assets = [
  ...['blazeface.json', 'blazeface.bin', 'facemesh.json', 'facemesh.bin', 'faceres.json', 'faceres.bin']
    .map((name) => [path.join(humanModelsDirectory, name), path.join(publicDirectory, 'human', name)]),
  ...[
    'tfjs-backend-wasm.wasm',
    'tfjs-backend-wasm-simd.wasm',
    'tfjs-backend-wasm-threaded-simd.wasm',
  ].map((name) => [path.join(wasmDirectory, name), path.join(publicDirectory, 'tfjs', name)]),
];

for (const [source, destination] of assets) {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

console.log(`Prepared ${assets.length} local Human.js and TensorFlow WASM assets.`);
