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

    const body = await request.json();
    const { attemptId, sessionId, questionId, questionType, promptText, audioUrl } = body;

    if (!attemptId || !sessionId || !questionId || !audioUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Insert attempt using admin client (bypasses RLS)
    const attemptData = {
      id: attemptId,
      session_id: sessionId,
      question_id: questionId,
      user_id: supabaseUserId,
      type_id: questionType,
      prompt_text: promptText || '',
      audio_url: audioUrl,
      transcript: null,
      score: null,
      feedback: null,
      attempted_at: new Date().toISOString()
    };

    console.log('Inserting attempt:', attemptData);

    const { error: attemptError } = await supabase
      .from('attempts')
      .insert(attemptData);

    if (attemptError) {
      console.error('Attempt insert error:', attemptError);
      return NextResponse.json({
        error: attemptError.message || 'Failed to create attempt'
      }, { status: 500 });
    }

    // Activity will be updated via /api/activity/ping endpoint

    return NextResponse.json({
      success: true,
      attemptId,
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