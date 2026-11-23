import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const humanWasmEntry = path.join(
  projectDirectory,
  'node_modules',
  '@vladmandic',
  'human',
  'dist',
  'human.node-wasm.js',
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectDirectory,

  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // nsfwjs/tfjs use dynamic requires internally that webpack can't statically
  // analyse — load them from node_modules at runtime instead of bundling.
  serverExternalPackages: [
    'nsfwjs',
    '@tensorflow/tfjs',
    '@tensorflow/tfjs-backend-wasm',
    'image-size',
    'sharp',
    '@xenova/transformers',
  ],
    outputFileTracingRoot: path.join(projectDirectory, '..'),

  turbopack: {
    root: path.join(projectDirectory, '..'),
    resolveAlias: {
      '@vladmandic/human': './web/node_modules/@vladmandic/human/dist/human.node-wasm.js',
    },
  },
  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve.alias['@vladmandic/human$'] = humanWasmEntry;
    }
    return config;
  },
};

export default nextConfig;
