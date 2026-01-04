import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { GetOrCreateUserParams } from '@/types/api';
import { updateUserLevel, updatePromptUsageScore } from '@/lib/prompts/selector';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, questionId, questionType, userAnswer, correctAnswer, isCorrect, score } = body;

    if (!sessionId || !questionId) {
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

    // Generate attempt ID
    const attemptId = crypto.randomUUID();

    // Insert attempt using admin client (bypasses RLS)
    const attemptData = {
      id: attemptId,
      session_id: sessionId,
      question_id: questionId,
      user_id: supabaseUserId,
      type_id: questionType,
      prompt_text: correctAnswer || '',
      transcript: userAnswer || '',
      score: score || 0,
      feedback: JSON.stringify({
        isCorrect,
        score,
        userAnswer,
        correctAnswer
      }),
      attempted_at: new Date().toISOString()
    };

    console.log('Inserting listening attempt:', attemptData);

    const { error: attemptError } = await supabase
      .from('attempts')
      .insert(attemptData);

    if (attemptError) {
      console.error('Attempt insert error:', attemptError);
      return NextResponse.json({
        error: attemptError.message || 'Failed to create attempt'
      }, { status: 500 });
    }

    // Update user's adaptive skill level for listening exercises
    const adaptiveTypes = ['listen_and_type', 'listen_and_respond', 'listen_and_complete', 'listen_and_summarize'];
    if (questionType && adaptiveTypes.includes(questionType)) {
      try {
        await updateUserLevel(
          supabaseUserId,
          'listening',
          questionType as 'listen_and_type' | 'listen_and_respond' | 'listen_and_complete' | 'listen_and_summarize',
          score || 0
        );
        console.log(`Updated user level for ${questionType} with score ${score || 0}`);

        // Try to update prompt usage score - the questionId may be from generated_prompts
        try {
          await updatePromptUsageScore(supabaseUserId, questionId, score || 0);
        } catch {
          // Ignore - question might be from questions table, not generated_prompts
        }
      } catch (levelError) {
        console.error('Error updating user level:', levelError);
        // Continue - don't fail the attempt response
      }
    }

    // Award XP for this attempt
    let xpAwarded = 0;
    try {
      const { data: xpResult, error: xpError } = await supabase.rpc('award_xp_for_attempt', {
        p_attempt_id: attemptId
      });

      if (xpError) {
        console.error('Error awarding XP:', xpError);
      } else {
        xpAwarded = xpResult || 0;
      }
    } catch (xpErr) {
      console.error('Exception awarding XP:', xpErr);
    }

    return NextResponse.json({
      success: true,
      attemptId,
      userId: supabaseUserId,
      xpAwarded
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
