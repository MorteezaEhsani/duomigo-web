/**
 * API Route: Get User Levels
 *
 * GET /api/levels/get?skillArea=speaking&questionType=listen_then_speak
 * GET /api/levels/get (returns all levels for user)
 *
 * Returns the user's skill levels.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { getOrCreateUserLevel, getAllUserLevels } from '@/lib/prompts/selector';
import { SkillArea, QuestionType } from '@/lib/prompts/types';

// Valid values
const VALID_SKILL_AREAS = ['speaking', 'writing', 'listening', 'reading'] as const;
const VALID_QUESTION_TYPES: Record<SkillArea, readonly string[]> = {
  speaking: ['listen_then_speak', 'read_then_speak', 'speak_about_photo'],
  writing: ['writing_sample', 'interactive_writing', 'write_about_photo', 'custom_writing'],
  listening: ['listen_and_type', 'listen_and_respond', 'listen_and_complete', 'listen_and_summarize'],
  reading: ['read_and_select', 'fill_in_the_blanks', 'read_and_complete', 'interactive_reading'],
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check for specific skill/question type
    const searchParams = request.nextUrl.searchParams;
    const skillArea = searchParams.get('skillArea') as SkillArea | null;
    const questionType = searchParams.get('questionType') as QuestionType | null;

    // If specific skill/question type requested
    if (skillArea && questionType) {
      // Validate
      if (!VALID_SKILL_AREAS.includes(skillArea)) {
        return NextResponse.json(
          { error: 'Invalid skillArea' },
          { status: 400 }
        );
      }

      if (!VALID_QUESTION_TYPES[skillArea].includes(questionType)) {
        return NextResponse.json(
          { error: 'Invalid questionType' },
          { status: 400 }
        );
      }

      const level = await getOrCreateUserLevel(
        supabaseUserId,
        skillArea,
        questionType
      );

      return NextResponse.json({
        success: true,
        level: {
          skillArea: level.skill_area,
          questionType: level.question_type,
          cefrLevel: level.cefr_level,
          numericLevel: level.numeric_level,
          attemptsAtLevel: level.attempts_at_level,
          correctStreak: level.correct_streak,
        },
      });
    }

    // Return all levels for user
    const levels = await getAllUserLevels(supabaseUserId);

    // Group by skill area
    const grouped: Record<string, {
      questionType: string;
      cefrLevel: string;
      numericLevel: number;
      attemptsAtLevel: number;
      correctStreak: number;
    }[]> = {};

    for (const level of levels) {
      if (!grouped[level.skill_area]) {
        grouped[level.skill_area] = [];
      }
      grouped[level.skill_area].push({
        questionType: level.question_type,
        cefrLevel: level.cefr_level,
        numericLevel: level.numeric_level,
        attemptsAtLevel: level.attempts_at_level,
        correctStreak: level.correct_streak,
      });
    }

    return NextResponse.json({
      success: true,
      levels: grouped,
    });
  } catch (error) {
    console.error('Error getting levels:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
