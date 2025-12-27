/**
 * API Route: Select Prompt
 *
 * GET /api/prompts/select?skillArea=speaking&questionType=listen_then_speak
 *
 * Selects an appropriate prompt for the authenticated user based on their skill level.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { selectPromptForUser } from '@/lib/prompts/selector';
import { SkillArea, QuestionType } from '@/lib/prompts/types';

// Valid skill areas and question types
const VALID_SKILL_AREAS = ['speaking', 'writing', 'listening', 'reading'] as const;
const VALID_QUESTION_TYPES: Record<SkillArea, readonly string[]> = {
  speaking: ['listen_then_speak', 'read_then_speak'],
  writing: ['writing_sample', 'interactive_writing'],
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const skillArea = searchParams.get('skillArea') as SkillArea | null;
    const questionType = searchParams.get('questionType') as QuestionType | null;

    // Validate parameters
    if (!skillArea || !VALID_SKILL_AREAS.includes(skillArea)) {
      return NextResponse.json(
        { error: 'Invalid or missing skillArea parameter' },
        { status: 400 }
      );
    }

    if (!questionType || !VALID_QUESTION_TYPES[skillArea].includes(questionType)) {
      return NextResponse.json(
        { error: 'Invalid or missing questionType parameter' },
        { status: 400 }
      );
    }

    // Get Supabase user ID from Clerk ID
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

    // Select prompt for user
    const result = await selectPromptForUser(
      supabaseUserId,
      skillArea,
      questionType
    );

    if (!result.prompt) {
      return NextResponse.json(
        {
          error: 'No prompt available',
          reason: result.fallbackReason,
          userLevel: result.userLevel,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt: result.prompt,
      source: result.source,
      userLevel: result.userLevel,
    });
  } catch (error) {
    console.error('Error selecting prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
