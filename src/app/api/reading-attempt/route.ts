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
    const { sessionId, questionId, questionType, score, details } = body;

    if (!sessionId || !questionType) {
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
      question_id: questionId || attemptId, // Use attemptId if no specific question
      user_id: supabaseUserId,
      type_id: questionType,
      score: score || 0,
      feedback: JSON.stringify(details || {}),
      attempted_at: new Date().toISOString()
    };

    console.log('Inserting reading attempt:', attemptData);

    const { error: attemptError } = await supabase
      .from('attempts')
      .insert(attemptData);

    if (attemptError) {
      console.error('Attempt insert error:', attemptError);
      return NextResponse.json({
        error: attemptError.message || 'Failed to create attempt'
      }, { status: 500 });
    }

    // Update user's adaptive skill level for reading exercises
    const adaptiveTypes = ['read_and_select', 'fill_in_the_blanks', 'read_and_complete', 'interactive_reading'];
    if (questionType && adaptiveTypes.includes(questionType)) {
      try {
        await updateUserLevel(
          supabaseUserId,
          'reading',
          questionType as 'read_and_select' | 'fill_in_the_blanks' | 'read_and_complete' | 'interactive_reading',
          score || 0
        );
        console.log(`Updated user level for ${questionType} with score ${score || 0}`);

        // Try to update prompt usage score if questionId provided
        if (questionId) {
          try {
            await updatePromptUsageScore(supabaseUserId, questionId, score || 0);
          } catch {
            // Ignore - question might not be from generated_prompts
          }
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
        console.log(`Awarded ${xpAwarded} XP for reading attempt ${attemptId}`);
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
