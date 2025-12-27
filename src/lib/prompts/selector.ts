/**
 * Prompt Selector
 *
 * Selects appropriate prompts for users based on their skill level.
 * Implements caching logic to avoid repetition and prefer less-used prompts.
 */

import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  CEFRLevel,
  SkillArea,
  QuestionType,
  PromptData,
  GeneratedPrompt,
  PromptSelectionResult,
  UserSkillLevel,
} from './types';
import { generatePrompts } from './generator';
import { getAdjacentLevels, numericToCEFR } from '../levels/adjuster';

// =====================================================
// MAIN SELECTION FUNCTION
// =====================================================

/**
 * Select an appropriate prompt for a user based on their skill level.
 * Follows this priority:
 * 1. Unused cached prompt at user's level
 * 2. Unused cached prompt at adjacent levels
 * 3. Generate new prompt on-demand
 * 4. Fall back to any available prompt
 */
export async function selectPromptForUser(
  userId: string,
  skillArea: SkillArea,
  questionType: QuestionType
): Promise<PromptSelectionResult> {
  const supabase = getAdminSupabaseClient();

  console.log(`[Selector] Starting prompt selection for ${skillArea}/${questionType}`);

  // 1. Get user's current level (or create with defaults)
  const userLevel = await getOrCreateUserLevel(userId, skillArea, questionType);
  const cefrLevel = userLevel.cefr_level as CEFRLevel;
  console.log(`[Selector] User level: ${cefrLevel}`);

  // 2. Try to find unused prompt at user's level
  const cachedPrompt = await findUnusedPrompt(userId, skillArea, questionType, cefrLevel);
  if (cachedPrompt && cachedPrompt.id) {
    console.log(`[Selector] Found cached prompt: ${cachedPrompt.id}`);
    await markPromptAsUsed(userId, cachedPrompt.id);
    return {
      prompt: cachedPrompt,
      source: 'cache',
      userLevel: cefrLevel,
    };
  }
  console.log(`[Selector] No cached prompt at level ${cefrLevel}, trying adjacent levels...`);

  // 3. Try adjacent levels (one above or below)
  const adjacentLevels = getAdjacentLevels(cefrLevel);
  for (const level of adjacentLevels) {
    const adjacentPrompt = await findUnusedPrompt(userId, skillArea, questionType, level);
    if (adjacentPrompt) {
      await markPromptAsUsed(userId, adjacentPrompt.id);
      return {
        prompt: adjacentPrompt,
        source: 'cache',
        userLevel: cefrLevel,
      };
    }
  }

  // 4. Generate new prompt on-demand
  console.log(`[Selector] Attempting to generate new prompt...`);
  try {
    const result = await generatePrompts({
      skillArea,
      questionType,
      cefrLevel,
      count: 1,
    });

    console.log(`[Selector] Generation result: success=${result.success}, prompts=${result.prompts.length}, errors=${result.errors?.join(', ') || 'none'}`);

    if (result.success && result.prompts.length > 0) {
      // Store the generated prompt in the cache
      console.log(`[Selector] Storing generated prompt...`);
      const storedPrompt = await storeGeneratedPrompt(
        skillArea,
        questionType,
        cefrLevel,
        result.prompts[0]
      );

      if (storedPrompt) {
        console.log(`[Selector] Stored prompt: ${storedPrompt.id}`);
        await markPromptAsUsed(userId, storedPrompt.id);
        return {
          prompt: storedPrompt,
          source: 'generated',
          userLevel: cefrLevel,
        };
      } else {
        console.log(`[Selector] Failed to store generated prompt`);
      }
    }
  } catch (error) {
    console.error('[Selector] Failed to generate prompt on-demand:', error);
  }

  // 5. Fallback: get any available prompt (even if used before)
  const fallbackPrompt = await findAnyPrompt(skillArea, questionType, cefrLevel);
  if (fallbackPrompt) {
    await markPromptAsUsed(userId, fallbackPrompt.id);
    return {
      prompt: fallbackPrompt,
      source: 'fallback',
      fallbackReason: 'No unused prompts available, using previously seen prompt',
      userLevel: cefrLevel,
    };
  }

  // 6. No prompts available at all
  return {
    prompt: null,
    source: 'fallback',
    fallbackReason: 'No prompts available for this question type',
    userLevel: cefrLevel,
  };
}

// =====================================================
// USER LEVEL MANAGEMENT
// =====================================================

/**
 * Get or create user skill level for a specific skill/question type
 */
export async function getOrCreateUserLevel(
  userId: string,
  skillArea: SkillArea,
  questionType: QuestionType
): Promise<UserSkillLevel> {
  const supabase = getAdminSupabaseClient();

  // Use the database function to get or create
  // Note: Using type assertion since the new RPC functions aren't in generated types yet
  const { data, error } = await (supabase.rpc as (name: string, params: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)('get_or_create_user_skill_level', {
    p_user_id: userId,
    p_skill_area: skillArea,
    p_question_type: questionType,
  });

  if (error) {
    console.error('Error getting user skill level:', error);
    // Return default if error
    return {
      id: '',
      user_id: userId,
      skill_area: skillArea,
      question_type: questionType,
      cefr_level: 'A2',
      numeric_level: 2.0,
      attempts_at_level: 0,
      correct_streak: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return data as unknown as UserSkillLevel;
}

/**
 * Update user skill level after completing an exercise
 */
export async function updateUserLevel(
  userId: string,
  skillArea: SkillArea,
  questionType: QuestionType,
  score: number
): Promise<UserSkillLevel | null> {
  const supabase = getAdminSupabaseClient();

  const { data, error } = await (supabase.rpc as (name: string, params: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)('update_user_skill_level', {
    p_user_id: userId,
    p_skill_area: skillArea,
    p_question_type: questionType,
    p_score: Math.round(score),
  });

  if (error) {
    console.error('Error updating user skill level:', error);
    return null;
  }

  return data as unknown as UserSkillLevel;
}

/**
 * Get all skill levels for a user
 */
export async function getAllUserLevels(userId: string): Promise<UserSkillLevel[]> {
  const supabase = getAdminSupabaseClient();

  // Note: Using type assertion since new tables aren't in generated types yet
  const { data, error } = await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('user_skill_levels')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error getting all user levels:', error);
    return [];
  }

  return data as unknown as UserSkillLevel[];
}

// =====================================================
// PROMPT FINDING
// =====================================================

/**
 * Find an unused prompt for the user at the specified level
 */
async function findUnusedPrompt(
  userId: string,
  skillArea: SkillArea,
  questionType: QuestionType,
  cefrLevel: CEFRLevel
): Promise<GeneratedPrompt | null> {
  const supabase = getAdminSupabaseClient();

  // Use the database function
  const { data, error } = await (supabase.rpc as (name: string, params: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)('find_unused_prompt', {
    p_user_id: userId,
    p_skill_area: skillArea,
    p_question_type: questionType,
    p_cefr_level: cefrLevel,
  });

  if (error || !data) {
    return null;
  }

  // RPC returns an object with null id if no prompt found
  const prompt = data as unknown as GeneratedPrompt;
  if (!prompt.id) {
    return null;
  }

  return prompt;
}

/**
 * Find any available prompt (even if used before)
 */
async function findAnyPrompt(
  skillArea: SkillArea,
  questionType: QuestionType,
  cefrLevel: CEFRLevel
): Promise<GeneratedPrompt | null> {
  const supabase = getAdminSupabaseClient();

  // First try exact level
  const { data, error } = await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('generated_prompts')
    .select('*')
    .eq('skill_area', skillArea)
    .eq('question_type', questionType)
    .eq('cefr_level', cefrLevel)
    .eq('is_active', true)
    .order('times_used', { ascending: true })
    .limit(1)
    .single();

  if (!error && data) {
    return data as unknown as GeneratedPrompt;
  }

  // Try any level for this question type
  const result = await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('generated_prompts')
    .select('*')
    .eq('skill_area', skillArea)
    .eq('question_type', questionType)
    .eq('is_active', true)
    .order('times_used', { ascending: true })
    .limit(1)
    .single();

  if (!result.error && result.data) {
    return result.data as unknown as GeneratedPrompt;
  }

  return null;
}

// =====================================================
// PROMPT STORAGE & TRACKING
// =====================================================

/**
 * Store a newly generated prompt in the cache
 */
async function storeGeneratedPrompt(
  skillArea: SkillArea,
  questionType: QuestionType,
  cefrLevel: CEFRLevel,
  promptData: PromptData
): Promise<GeneratedPrompt | null> {
  const supabase = getAdminSupabaseClient();

  const { data, error } = await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('generated_prompts')
    .insert({
      skill_area: skillArea,
      question_type: questionType,
      cefr_level: cefrLevel,
      prompt_data: promptData as unknown as Record<string, unknown>,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o-mini',
      },
      times_used: 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error storing generated prompt:', error);
    return null;
  }

  return data as unknown as GeneratedPrompt;
}

/**
 * Mark a prompt as used by a user
 */
async function markPromptAsUsed(userId: string, promptId: string): Promise<void> {
  const supabase = getAdminSupabaseClient();

  // Use the database function
  await (supabase.rpc as (name: string, params: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)('record_prompt_usage', {
    p_user_id: userId,
    p_prompt_id: promptId,
    p_score: null,
  });
}

/**
 * Update the score for a prompt usage
 */
export async function updatePromptUsageScore(
  userId: string,
  promptId: string,
  score: number
): Promise<void> {
  const supabase = getAdminSupabaseClient();

  await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('prompt_usage')
    .update({ score: Math.round(score) })
    .eq('user_id', userId)
    .eq('prompt_id', promptId);
}

// =====================================================
// BATCH OPERATIONS
// =====================================================

/**
 * Get prompt inventory statistics
 */
export async function getPromptInventory(): Promise<{
  skillArea: SkillArea;
  questionType: QuestionType;
  cefrLevel: CEFRLevel;
  count: number;
}[]> {
  const supabase = getAdminSupabaseClient();

  const { data, error } = await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('generated_prompts')
    .select('skill_area, question_type, cefr_level')
    .eq('is_active', true);

  if (error || !data) {
    return [];
  }

  // Count prompts by group
  const counts: Record<string, number> = {};
  const typedData = data as unknown as Array<{ skill_area: string; question_type: string; cefr_level: string }>;
  for (const row of typedData) {
    const key = `${row.skill_area}|${row.question_type}|${row.cefr_level}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts).map(([key, count]) => {
    const [skillArea, questionType, cefrLevel] = key.split('|');
    return {
      skillArea: skillArea as SkillArea,
      questionType: questionType as QuestionType,
      cefrLevel: cefrLevel as CEFRLevel,
      count,
    };
  });
}

/**
 * Pre-generate prompts to fill the cache
 */
export async function preGeneratePrompts(
  skillArea: SkillArea,
  questionType: QuestionType,
  cefrLevel: CEFRLevel,
  targetCount: number = 10
): Promise<{ generated: number; errors: string[] }> {
  const supabase = getAdminSupabaseClient();

  // Check current count
  const { count: currentCount } = await (supabase.from as (table: string) => ReturnType<typeof supabase.from>)('generated_prompts')
    .select('*', { count: 'exact', head: true })
    .eq('skill_area', skillArea)
    .eq('question_type', questionType)
    .eq('cefr_level', cefrLevel)
    .eq('is_active', true);

  const toGenerate = Math.max(0, targetCount - (currentCount || 0));

  if (toGenerate === 0) {
    return { generated: 0, errors: [] };
  }

  const result = await generatePrompts({
    skillArea,
    questionType,
    cefrLevel,
    count: toGenerate,
  });

  let generated = 0;
  const errors: string[] = result.errors || [];

  for (const promptData of result.prompts) {
    const stored = await storeGeneratedPrompt(skillArea, questionType, cefrLevel, promptData);
    if (stored) {
      generated++;
    }
  }

  return { generated, errors };
}
