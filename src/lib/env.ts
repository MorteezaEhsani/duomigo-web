export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
} as const;

for (const [k, v] of Object.entries(ENV)) {
  if (!v) {
    throw new Error(`Missing required NEXT_PUBLIC env: ${k}`);
  }
}