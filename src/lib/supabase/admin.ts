/**
 * Admin Supabase client for server-side operations
 * Uses the service role key for full database access
 * ONLY use this in server components and API routes
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_ENV, SERVER_ENV } from '../env.server';

// Create a single admin client instance
let adminClient: ReturnType<typeof createClient> | null = null;

/**
 * Get the admin Supabase client with service role privileges
 * This client bypasses Row Level Security and should only be used server-side
 */
export function getAdminSupabaseClient() {
  // Return existing client if already created
  if (adminClient) {
    return adminClient;
  }

  // Ensure we're in a server environment
  if (typeof window !== 'undefined') {
    throw new Error('Admin Supabase client can only be used on the server');
  }

  // Validate environment variables
  if (!PUBLIC_ENV.SUPABASE_URL || !SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables for admin client');
  }

  // Create and cache the admin client
  adminClient = createClient(
    PUBLIC_ENV.SUPABASE_URL,
    SERVER_ENV.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return adminClient;
}