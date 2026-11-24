import type { NextConfig } from "next";

// Tailwind runs via postcss.config.mjs (@tailwindcss/postcss, the official
// Next.js integration). The previous experimental turbopack CSS loader
// ("@tailwindcss/turbopack") produced a new HMR version on every request in
// dev, causing an endless "HMR hash mismatch" full-reload loop on Windows.
const nextConfig: NextConfig = {};

export default nextConfig;