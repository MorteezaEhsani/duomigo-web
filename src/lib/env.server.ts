/**
 * Server-side environment variables
 * This file should ONLY be imported in server components and API routes
 * Never import this in client components
 */

// Server-only environment variables (not prefixed with NEXT_PUBLIC_)
export const SERVER_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
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
  // Core required variables
  const required = {
    SUPABASE_SERVICE_ROLE_KEY: SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY,
    CLERK_SECRET_KEY: SERVER_ENV.CLERK_SECRET_KEY,
    ...PUBLIC_ENV,
  };

  // Optional variables (warn but don't throw)
  const optional = {
    STRIPE_SECRET_KEY: SERVER_ENV.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: SERVER_ENV.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: SERVER_ENV.STRIPE_PRICE_ID,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required server environment variable: ${key}`);
    }
  }

  // Warn about missing optional vars
  for (const [key, value] of Object.entries(optional)) {
    if (!value) {
      console.warn(`Optional environment variable not set: ${key}`);
    }
  }
}

// Only validate in server context
if (typeof window === 'undefined') {
  validateServerEnv();
}