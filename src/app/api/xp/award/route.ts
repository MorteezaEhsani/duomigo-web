import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();

    // Verify the attempt belongs to this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify attempt ownership
    const { data: attempt } = await supabase
      .from('attempts')
      .select('user_id, fluency_score')
      .eq('id', attemptId)
      .single();

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    if (attempt.user_id !== profile.user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if attempt has been scored
    if (attempt.fluency_score === null) {
      return NextResponse.json(
        { error: 'Attempt has not been scored yet' },
        { status: 400 }
      );
    }

    // Award XP
    const { data: xpEarned, error } = await supabase.rpc('award_xp_for_attempt', {
      p_attempt_id: attemptId
    });

    if (error) {
      console.error('Error awarding XP:', error);
      return NextResponse.json(
        { error: 'Failed to award XP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      xpEarned: xpEarned || 0
    });

  } catch (error) {
    console.error('Error in XP award API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
