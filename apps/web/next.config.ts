import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@flowmarket/ui'],
  // Image Docker minimale : .next/standalone ne contient que les fichiers necessaires au runtime.
  output: 'standalone',
  // Monorepo pnpm : trace depuis la racine pour inclure les packages partages (node_modules hoistes).
  outputFileTracingRoot: path.join(__dirname, '../..'),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'placehold.co' }],
  },
};

export default nextConfig;
