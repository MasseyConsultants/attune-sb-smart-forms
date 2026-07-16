// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Next Config

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // Monorepo: pin file tracing to the workspace root so the standalone
  // bundle resolves hoisted deps deterministically in the Docker build.
  outputFileTracingRoot: path.join(__dirname, '..'),
  eslint: {
    // Linting runs as a separate turbo task; don't duplicate it inside next build.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
