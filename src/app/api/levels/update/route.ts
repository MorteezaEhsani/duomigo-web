/**
 * API Route: Update User Level
 *
 * POST /api/levels/update
 *
 * Updates a user's skill level after completing an exercise.
 * This is called by the grading endpoints after scoring.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { updateUserLevel, updatePromptUsageScore } from '@/lib/prompts/selector';
import { SkillArea, QuestionType } from '@/lib/prompts/types';

// Valid values
const VALID_SKILL_AREAS = ['speaking', 'writing', 'listening', 'reading'] as const;
const VALID_QUESTION_TYPES: Record<SkillArea, readonly string[]> = {
  speaking: ['listen_then_speak', 'read_then_speak', 'speak_about_photo'],
  writing: ['writing_sample', 'interactive_writing', 'write_about_photo', 'custom_writing'],
  listening: ['listen_and_type', 'listen_and_respond', 'listen_and_complete', 'listen_and_summarize'],
  reading: ['read_and_select', 'fill_in_the_blanks', 'read_and_complete', 'interactive_reading'],
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { skillArea, questionType, score, promptId } = body;

    // Validate parameters
    if (!skillArea || !VALID_SKILL_AREAS.includes(skillArea)) {
      return NextResponse.json(
        { error: 'Invalid or missing skillArea' },
        { status: 400 }
      );
    }

    if (!questionType || !VALID_QUESTION_TYPES[skillArea as SkillArea].includes(questionType)) {
      return NextResponse.json(
        { error: 'Invalid or missing questionType' },
        { status: 400 }
      );
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json(
        { error: 'Score must be a number between 0 and 100' },
        { status: 400 }
      );
    }

    // Get Supabase user ID
    const supabase = getAdminSupabaseClient();
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: clerkUserId,
      }
    );

    if (userError || !supabaseUserId) {
      console.error('Error getting Supabase user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 500 }
      );
    }

    // Update user level
    const updatedLevel = await updateUserLevel(
      supabaseUserId,
      skillArea as SkillArea,
      questionType as QuestionType,
      score
    );

    // Update prompt usage score if promptId provided
    if (promptId) {
      await updatePromptUsageScore(supabaseUserId, promptId, score);
    }

    if (!updatedLevel) {
      return NextResponse.json(
        { error: 'Failed to update level' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      level: {
        cefrLevel: updatedLevel.cefr_level,
        numericLevel: updatedLevel.numeric_level,
        attemptsAtLevel: updatedLevel.attempts_at_level,
        correctStreak: updatedLevel.correct_streak,
      },
    });
  } catch (error) {
    console.error('Error updating level:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
