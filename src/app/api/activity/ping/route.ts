import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { z } from 'zod';

// Request body schema
const ActivityPingSchema = z.object({
  minutes: z.number().min(1).max(60).optional().default(1),
  timezone: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Get Clerk user
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'You must be logged in to update activity'
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let minutes = 1;
    let clientTimezone: string | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      const validated = ActivityPingSchema.parse(body);
      minutes = validated.minutes;
      clientTimezone = validated.timezone;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Invalid request',
            message: 'Invalid request body',
            details: error.issues 
          },
          { status: 400 }
        );
      }
    }

    const supabase = getAdminSupabaseClient();
    
    // Get or create Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User'
      }
    );

    if (userError || !supabaseUserId) {
      console.error('Error getting/creating Supabase user:', userError);
      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to get user record' 
        },
        { status: 500 }
      );
    }

    // Get user's timezone from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('user_id', supabaseUserId)
      .single();

    const timezone = profile?.timezone || clientTimezone || 'America/Los_Angeles';

    // Call timezone-aware RPC to upsert daily activity
    const { error: rpcError } = await supabase.rpc('upsert_daily_activity_tz_clerk', {
      p_user_id: supabaseUserId,
      p_tz: timezone,
      p_now_ts: new Date().toISOString(),
      p_minutes: minutes
    });

    if (rpcError) {
      console.error('Error upserting daily activity:', rpcError);
      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to update activity',
          details: rpcError.message 
        },
        { status: 500 }
      );
    }

    // Get updated streak info
    const { data: streak } = await supabase
      .from('streaks')
      .select('current_streak, best_streak')
      .eq('user_id', supabaseUserId)
      .single();

    return NextResponse.json({ 
      ok: true,
      message: 'Activity updated successfully',
      minutes,
      timezone,
      streak: streak || { current_streak: 0, best_streak: 0 }
    });
  } catch (error) {
    console.error('Error in activity ping:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}