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

if (process.env.NODE_ENV === "production") {
  // Check public environment variables
  for (const k of requiredPublic) {
    if (!process.env[k]) {
      throw new Error(`Missing public env ${k} in production build`);
    }
  }

  // Check server environment variables
  for (const k of requiredServer) {
    if (!process.env[k]) {
      throw new Error(`Missing server env ${k} in production build`);
    }
  }
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
