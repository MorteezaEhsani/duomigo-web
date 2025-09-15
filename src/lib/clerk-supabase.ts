import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with Clerk user context.
 * This allows us to use Clerk for auth while keeping Supabase for data.
 */
export async function createClerkSupabaseClient() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }

  // Create a Supabase client with service role for server-side operations
  // We'll use Clerk's userId as the user identifier in Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for server-side
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'x-clerk-user-id': userId, // Pass Clerk user ID for tracking
        },
      },
    }
  );

  return { supabase, userId };
}

/**
 * Maps Clerk user ID to Supabase user ID.
 * This creates a consistent user record in Supabase based on Clerk auth.
 */
export async function ensureSupabaseUser(clerkUserId: string, email?: string | null) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Check if user exists in profiles table
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (existingProfile) {
    return existingProfile.user_id;
  }

  // Create a new user record
  // We'll use Clerk's user ID as a unique identifier
  const supabaseUserId = crypto.randomUUID();
  
  const { error } = await supabase
    .from('profiles')
    .insert({
      user_id: supabaseUserId,
      clerk_user_id: clerkUserId,
      email: email,
      display_name: email?.split('@')[0] || 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating Supabase user:', error);
    throw error;
  }

  return supabaseUserId;
}