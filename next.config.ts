import type { NextConfig } from "next";

// Build-time environment variable validation
const requiredPublic = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
];

const requiredServer = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLERK_SECRET_KEY",
];

// Detect if this is a production build (only Vercel production, not local builds)
const isVercelProduction = process.env.VERCEL_ENV === "production";
const isPreviewBuild = process.env.VERCEL_ENV === "preview";

// Validate environment variables
if (isVercelProduction) {
  // Vercel Production: strict validation, fail on missing
  const missingPublic = requiredPublic.filter(k => !process.env[k]);
  const missingServer = requiredServer.filter(k => !process.env[k]);

  if (missingPublic.length > 0) {
    throw new Error(`Missing required public env(s) in production: ${missingPublic.join(", ")}`);
  }

  if (missingServer.length > 0) {
    throw new Error(`Missing required server env(s) in production: ${missingServer.join(", ")}`);
  }
} else if (isPreviewBuild) {
  // Preview: warn but don't fail
  const missingPublic = requiredPublic.filter(k => !process.env[k]);
  const missingServer = requiredServer.filter(k => !process.env[k]);

  if (missingPublic.length > 0) {
    console.warn(`⚠️  Missing public env(s) in preview: ${missingPublic.join(", ")}`);
  }

  if (missingServer.length > 0) {
    console.warn(`⚠️  Missing server env(s) in preview: ${missingServer.join(", ")}`);
  }
} else {
  // Local builds and development: just warn
  console.log("📦 Building locally - env validation relaxed");
  const missingPublic = requiredPublic.filter(k => !process.env[k]);
  const missingServer = requiredServer.filter(k => !process.env[k]);

  if (missingPublic.length > 0) {
    console.warn(`⚠️  Missing public env(s): ${missingPublic.join(", ")}`);
  }

  if (missingServer.length > 0) {
    console.warn(`⚠️  Missing server env(s): ${missingServer.join(", ")}`);
  }
}

const nextConfig: NextConfig = {
  // Opt into Turbopack for dev server
  experimental: {
    // turbo: {},
  },
  // Suppress specific build warnings if needed
  typescript: {
    // Don't fail build on TS errors except in Vercel production
    ignoreBuildErrors: !isVercelProduction,
  },
  eslint: {
    // Don't fail build on ESLint errors except in Vercel production
    ignoreDuringBuilds: !isVercelProduction,
  },
};

export default nextConfig;