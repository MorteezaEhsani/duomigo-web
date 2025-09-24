'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PUBLIC_ENV } from '../env.server';
import type { Database } from '@/types/database.types';

/**
 * Create a Supabase client on the server.
 * This reads/writes the Supabase auth cookies via Next.js's cookies() API.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    PUBLIC_ENV.SUPABASE_URL!,
    PUBLIC_ENV.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Helper: fetch the current authenticated user on the server.
 */
export async function getServerUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
