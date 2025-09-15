import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for server operations
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId) {
      return NextResponse.json({
        ok: true,
        user: null
      });
    }

    // Get or create Supabase user record
    const supabase = getSupabaseClient();
    
    const { data: supabaseUserId, error } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User'
      }
    );

    if (error) {
      console.error('Error getting/creating Supabase user:', error);
    }
    
    return NextResponse.json({
      ok: true,
      user: userId,
      supabaseUserId: supabaseUserId
    });
  } catch (error) {
    console.error('Error in ping route:', error);
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}