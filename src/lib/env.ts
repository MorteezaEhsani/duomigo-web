/**
 * Client-side environment variables
 * This file provides a centralized, type-safe way to access environment variables
 * in client components. It validates at runtime but won't crash preview builds.
 */

// Detect environment
const isProd = process.env.NODE_ENV === "production";
const isVercelProd = process.env.VERCEL_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview";

// Define the environment object with temporary fallbacks for missing variables
export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "https://duomigo.com",
} as const;

// Runtime validation (client-side)
// Only throw in production, warn in preview/development
if (typeof window !== "undefined") {
  const missing: string[] = [];

  for (const [key, value] of Object.entries(ENV)) {
    if (!value || value === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variable(s): ${missing.join(", ")}`;

    if (isProd || isVercelProd) {
      // Production: log error but don't crash the app
      console.error(`❌ ${message}`);
      // You could also send this to an error tracking service
    } else if (isPreview) {
      // Preview: just warn
      console.warn(`⚠️  ${message}`);
    } else {
      // Development: info log
      console.info(`ℹ️  ${message} (using defaults where available)`);
    }
  }
}

// Type-safe environment access
export type EnvConfig = typeof ENV;