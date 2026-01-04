import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { FREE_TIER_LIFETIME_LIMIT } from '@/lib/subscription/constants';
import type { UsageCheckResult } from '@/types/subscription.types';
import PracticeSessionClient from './PracticeSessionClient';

interface WeakSkillType {
  skill_type: string;
  avg_score: number;
  attempt_count: number;
}

// Map skill types to valid practice question types
const SKILL_TO_PRACTICE_TYPE: Record<string, string[]> = {
  speaking: ['listen_then_speak', 'speak_about_photo', 'read_then_speak'],
  writing: ['writing_sample', 'interactive_writing', 'write_about_photo'],
  listening: ['listen_and_type', 'listen_and_respond', 'listen_and_complete', 'listen_and_summarize'],
  reading: ['read_and_select', 'fill_in_the_blanks', 'read_and_complete', 'interactive_reading']
};

export default async function PracticeSessionPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    return null;
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
    console.error('Error getting/creating user:', userError);
    redirect('/app');
  }

  // Check if user has access (premium or free tier limit not reached)
  // For the practice session, we check 4 times (one for each question)
  const { data: usageCheck, error: usageError } = await supabase.rpc(
    'check_and_increment_free_usage',
    {
      p_user_id: supabaseUserId,
      p_lifetime_limit: FREE_TIER_LIFETIME_LIMIT,
    }
  );

  if (usageError) {
    console.error('Error checking usage:', usageError);
    redirect('/app');
  }

  const usage = usageCheck as unknown as UsageCheckResult;

  // If not allowed (limit reached and not premium), redirect to upgrade
  if (!usage.allowed) {
    redirect('/app?upgrade=required');
  }

  // Check how many attempts the user has completed
  const { count: attemptCount } = await supabase
    .from('attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', supabaseUserId);

  const hasEnoughHistory = (attemptCount || 0) >= 4;

  // Only use weak skill detection if user has enough practice history
  let targetSkills: string[] = ['speaking', 'writing', 'listening', 'reading'];

  if (hasEnoughHistory) {
    // Get user's weak skill types
    const { data: weakSkills, error: weakSkillsError } = await supabase.rpc('get_weak_skill_types', {
      p_user_id: supabaseUserId,
      p_limit: 4
    });

    if (weakSkillsError) {
      console.error('Error getting weak skills:', JSON.stringify(weakSkillsError, null, 2));
      console.error('Error details:', weakSkillsError.message, weakSkillsError.code, weakSkillsError.details);
      // Fall back to all skill types (already set)
    } else {
      const skillTypes = (weakSkills as unknown as WeakSkillType[] || []).map(s => s.skill_type);
      if (skillTypes.length > 0) {
        targetSkills = skillTypes;
      }
    }
  }
  // For new users (< 4 attempts), we use all skill types in random order
  else {
    // Shuffle the skill types for variety
    targetSkills = targetSkills.sort(() => Math.random() - 0.5);
  }

  // Fetch one question for each skill type
  const questions: Array<{
    id: string;
    type: string;
    skill_type: string;
    prompt: string;
    prep_seconds: number;
    min_seconds: number;
    max_seconds: number;
    image_url: string | null;
    metadata: Record<string, unknown> | null;
  }> = [];

  for (const skillType of targetSkills.slice(0, 4)) {
    const practiceTypes = SKILL_TO_PRACTICE_TYPE[skillType] || [];

    if (practiceTypes.length === 0) continue;

    // Get a random practice type for this skill
    const randomPracticeType = practiceTypes[Math.floor(Math.random() * practiceTypes.length)];

    // Get recent questions to avoid repetition
    const { data: recentAttempts } = await supabase
      .from('attempts')
      .select('question_id')
      .eq('user_id', supabaseUserId)
      .gte('attempted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('attempted_at', { ascending: false })
      .limit(20);

    const recentQuestionIds = recentAttempts?.map(a => a.question_id) || [];

    // Fetch questions of this practice type
    let query = supabase
      .from('questions')
      .select('*')
      .eq('type', randomPracticeType);

    if (recentQuestionIds.length > 0) {
      query = query.not('id', 'in', `(${recentQuestionIds.join(',')})`);
    }

    const { data: availableQuestions } = await query.limit(10);

    let selectedQuestion;
    if (availableQuestions && availableQuestions.length > 0) {
      selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    } else {
      // Fallback: get any question of this type
      const { data: fallbackQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('type', randomPracticeType)
        .limit(10);

      if (fallbackQuestions && fallbackQuestions.length > 0) {
        selectedQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      }
    }

    if (selectedQuestion) {
      questions.push({
        ...selectedQuestion,
        skill_type: skillType,
        metadata: selectedQuestion.metadata as Record<string, unknown> | null
      });
    }
  }

  // If we couldn't get 4 questions, redirect to home
  if (questions.length === 0) {
    redirect('/app');
  }

  // Create a session ID for this practice session
  const sessionId = `practice_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return (
    <PracticeSessionClient
      questions={questions}
      sessionId={sessionId}
      supabaseUserId={supabaseUserId}
      isPremium={usage.is_premium}
    />
  );
}
