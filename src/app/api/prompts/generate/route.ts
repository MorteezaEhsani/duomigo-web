/**
 * API Route: Generate Prompts
 *
 * POST /api/prompts/generate
 *
 * Generates new prompts for a specific skill/question type/level.
 * This is mainly for batch generation and admin purposes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { preGeneratePrompts, getPromptInventory } from '@/lib/prompts/selector';
import { SkillArea, QuestionType, CEFRLevel } from '@/lib/prompts/types';

// Valid values
const VALID_SKILL_AREAS = ['speaking', 'writing', 'listening', 'reading'] as const;
const VALID_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const VALID_QUESTION_TYPES: Record<SkillArea, readonly string[]> = {
  speaking: ['listen_then_speak', 'read_then_speak'],
  writing: ['writing_sample', 'interactive_writing'],
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

    // Check if user is admin (optional: remove this check for development)
    const supabase = getAdminSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('clerk_user_id', clerkUserId)
      .single();

    // For now, allow any authenticated user to generate (can restrict later)
    // if (!profile?.is_admin) {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    // }

    // Parse request body
    const body = await request.json();
    const { skillArea, questionType, cefrLevel, count = 5 } = body;

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

    if (!cefrLevel || !VALID_CEFR_LEVELS.includes(cefrLevel)) {
      return NextResponse.json(
        { error: 'Invalid or missing cefrLevel' },
        { status: 400 }
      );
    }

    if (typeof count !== 'number' || count < 1 || count > 20) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Generate prompts
    const result = await preGeneratePrompts(
      skillArea as SkillArea,
      questionType as QuestionType,
      cefrLevel as CEFRLevel,
      count
    );

    return NextResponse.json({
      success: true,
      generated: result.generated,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error generating prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get prompt inventory
export async function GET() {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inventory = await getPromptInventory();

    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error('Error getting inventory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
