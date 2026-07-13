// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Next Config

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  eslint: {
    // Linting runs as a separate turbo task; don't duplicate it inside next build.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
