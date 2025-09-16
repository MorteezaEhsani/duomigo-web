/**
 * Server-side environment variables
 * This file should ONLY be imported in server components and API routes
 * Never import this in client components
 */

// Server-only environment variables (not prefixed with NEXT_PUBLIC_)
export const SERVER_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
} as const;

// Re-export client env vars for server use
export const PUBLIC_ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
} as const;

// Validate required server environment variables
function validateServerEnv() {
  const required = {
    ...SERVER_ENV,
    ...PUBLIC_ENV,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required server environment variable: ${key}`);
    }
  }
}

// Only validate in server context
if (typeof window === 'undefined') {
  validateServerEnv();
}