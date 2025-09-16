import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

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
    const supabase = getAdminSupabaseClient();
    
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