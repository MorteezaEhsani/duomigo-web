import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { GetOrCreateUserParams } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Get or create Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User'
      } satisfies GetOrCreateUserParams
    );

    if (userError) {
      console.error('RPC error:', userError);
      return NextResponse.json({ error: `Database error: ${userError.message}` }, { status: 500 });
    }

    if (!supabaseUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create a new practice session using admin client (bypasses RLS)
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: supabaseUserId,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({
        error: sessionError.message || 'Failed to create practice session'
      }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({
        error: 'Failed to create practice session - no data returned'
      }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: session.id,
      userId: supabaseUserId
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}