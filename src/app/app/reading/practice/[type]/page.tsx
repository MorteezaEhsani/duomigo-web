import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import ReadingRunnerClient from './ReadingRunnerClient';
import { selectPromptForUser } from '@/lib/prompts/selector';
import { ReadAndSelectPrompt, FillInTheBlanksPrompt, ReadAndCompletePrompt, InteractiveReadingPrompt } from '@/lib/prompts/types';
// import { FREE_TIER_LIFETIME_LIMIT } from '@/lib/subscription/constants';
// import type { UsageCheckResult } from '@/types/subscription.types';

const VALID_READING_TYPES = [
  'read_and_select',
  'fill_in_the_blanks',
  'read_and_complete',
  'interactive_reading'
];

// All reading types use adaptive prompts
const ADAPTIVE_TYPES = VALID_READING_TYPES;

type ReadingPromptData = ReadAndSelectPrompt | FillInTheBlanksPrompt | ReadAndCompletePrompt | InteractiveReadingPrompt;

interface PageProps {
  params: Promise<{
    type: string;
  }>;
}

export default async function ReadingPracticePage({ params }: PageProps) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    return null;
  }

  const resolvedParams = await params;

  // Validate reading type
  if (!VALID_READING_TYPES.includes(resolvedParams.type)) {
    redirect('/app/reading');
  }

  // Get or create Supabase user ID
  const supabase = getAdminSupabaseClient();
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
    redirect('/app/reading');
  }

  // PREMIUM FEATURE DISABLED - Unlimited access for all users
  // Check if user has access (premium or free tier limit not reached)
  // const { data: usageCheck, error: usageError } = await supabase.rpc(
  //   'check_and_increment_free_usage',
  //   {
  //     p_user_id: supabaseUserId,
  //     p_lifetime_limit: FREE_TIER_LIFETIME_LIMIT,
  //   }
  // );

  // if (usageError) {
  //   console.error('Error checking usage:', usageError);
  //   redirect('/app');
  // }

  // const usage = usageCheck as unknown as UsageCheckResult;

  // // If not allowed (limit reached and not premium), redirect to upgrade
  // if (!usage.allowed) {
  //   redirect('/app?upgrade=required');
  // }

  // Create a temporary session
  const session = {
    id: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    user_id: supabaseUserId,
    started_at: new Date().toISOString()
  };

  let adaptivePromptData: ReadingPromptData | null = null;
  let promptId: string | null = null;

  // Check if this is an adaptive type (AI-generated prompts)
  if (ADAPTIVE_TYPES.includes(resolvedParams.type)) {
    try {
      const result = await selectPromptForUser(
        supabaseUserId,
        'reading',
        resolvedParams.type as 'read_and_select' | 'fill_in_the_blanks' | 'read_and_complete' | 'interactive_reading'
      );

      if (result.prompt && result.prompt.prompt_data) {
        adaptivePromptData = result.prompt.prompt_data as ReadingPromptData;
        promptId = result.prompt.id;
        console.log(`Selected adaptive reading prompt: ${result.prompt.id} (Level: ${result.userLevel}, Source: ${result.source})`);
      } else {
        console.log('No adaptive prompt available, using fallback');
      }
    } catch (error) {
      console.error('Error selecting adaptive prompt:', error);
    }
  }

  return (
    <ReadingRunnerClient
      sessionId={session.id}
      supabaseUserId={supabaseUserId}
      readingType={resolvedParams.type}
      adaptivePromptData={adaptivePromptData}
      promptId={promptId}
    />
  );
}
