import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import WritingRunnerClient from './WritingRunnerClient';
import { selectPromptForUser } from '@/lib/prompts/selector';
import { WritingSamplePrompt, InteractiveWritingPrompt } from '@/lib/prompts/types';
// import { FREE_TIER_LIFETIME_LIMIT } from '@/lib/subscription/constants';
// import type { UsageCheckResult } from '@/types/subscription.types';

const VALID_WRITING_TYPES = [
  'writing_sample',
  'interactive_writing',
  'write_about_photo',
  'custom_writing'
];

// Types that use adaptive AI-generated prompts
const ADAPTIVE_TYPES = ['writing_sample', 'interactive_writing'];

interface PageProps {
  params: Promise<{
    type: string;
  }>;
}

export default async function WritingPracticePage({ params }: PageProps) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    return null;
  }

  const resolvedParams = await params;

  // Validate writing type
  if (!VALID_WRITING_TYPES.includes(resolvedParams.type)) {
    redirect('/app/writing');
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
    redirect('/app/writing');
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

  let question;

  // Check if this is an adaptive type (AI-generated prompts)
  if (ADAPTIVE_TYPES.includes(resolvedParams.type)) {
    // Use the adaptive prompt system
    try {
      const result = await selectPromptForUser(
        supabaseUserId,
        'writing',
        resolvedParams.type as 'writing_sample' | 'interactive_writing'
      );

      if (result.prompt && result.prompt.prompt_data) {
        const promptData = result.prompt.prompt_data as WritingSamplePrompt | InteractiveWritingPrompt;

        // Convert adaptive prompt to Question format
        let promptText = '';
        if (promptData.type === 'writing_sample') {
          promptText = promptData.topic;
        } else if (promptData.type === 'interactive_writing') {
          promptText = promptData.step1Prompt;
        }

        question = {
          id: result.prompt.id,
          type: resolvedParams.type,
          prompt: promptText,
          image_url: null,
          prep_seconds: resolvedParams.type === 'writing_sample' ? 30 : 0,
          min_seconds: resolvedParams.type === 'interactive_writing' ? 480 : 60,
          max_seconds: resolvedParams.type === 'interactive_writing' ? 480 : 300,
          target_language: 'en',
          source_language: 'en'
        };

        console.log(`Selected adaptive writing prompt: ${result.prompt.id} (Level: ${result.userLevel}, Source: ${result.source})`);
      } else {
        // Fallback to database questions if no adaptive prompt available
        console.log('No adaptive prompt available, falling back to database');
      }
    } catch (error) {
      console.error('Error selecting adaptive prompt:', error);
      // Fall through to database fallback
    }
  }

  // Fallback: use database questions (for write_about_photo, custom_writing, or if adaptive fails)
  if (!question) {
    // Try to fetch question from database
    const { data: dbQuestion } = await supabase
      .from('questions')
      .select('*')
      .eq('type', resolvedParams.type)
      .limit(1)
      .single();

    if (dbQuestion) {
      question = {
        id: dbQuestion.id,
        type: resolvedParams.type,
        prompt: dbQuestion.prompt,
        image_url: dbQuestion.image_url,
        prep_seconds: dbQuestion.prep_seconds || (resolvedParams.type === 'writing_sample' ? 30 : resolvedParams.type === 'write_about_photo' ? 20 : 0),
        min_seconds: dbQuestion.min_seconds || (resolvedParams.type === 'interactive_writing' ? 480 : resolvedParams.type === 'write_about_photo' ? 20 : 60),
        max_seconds: dbQuestion.max_seconds || (resolvedParams.type === 'interactive_writing' ? 480 : resolvedParams.type === 'write_about_photo' ? 60 : 300),
        target_language: dbQuestion.target_language,
        source_language: dbQuestion.source_language
      };
    }
  }

  // Final fallback to mock question if nothing found
  if (!question) {
    question = {
      id: `${resolvedParams.type}_${Date.now()}`,
      type: resolvedParams.type,
      prompt: getPromptForType(resolvedParams.type),
      image_url: resolvedParams.type === 'write_about_photo' ? '/sample-photo.jpg' : null,
      prep_seconds: resolvedParams.type === 'writing_sample' ? 30 :
                    resolvedParams.type === 'write_about_photo' ? 20 : 0,
      min_seconds: resolvedParams.type === 'interactive_writing' ? 480 :
                   resolvedParams.type === 'write_about_photo' ? 20 :
                   resolvedParams.type === 'writing_sample' ? 60 : 60,
      max_seconds: resolvedParams.type === 'interactive_writing' ? 480 :
                   resolvedParams.type === 'write_about_photo' ? 60 :
                   resolvedParams.type === 'writing_sample' ? 300 : 300,
      target_language: 'en',
      source_language: 'en'
    };
  }

  return (
    <WritingRunnerClient
      question={question}
      sessionId={session.id}
      supabaseUserId={supabaseUserId}
      writingType={resolvedParams.type}
    />
  );
}

function getPromptForType(type: string): string {
  switch (type) {
    case 'writing_sample':
      return 'Describe a memorable experience from your childhood. What made it special and how did it influence who you are today?';
    case 'interactive_writing':
      return 'What are the benefits and drawbacks of remote work? Discuss your perspective.';
    case 'write_about_photo':
      return 'Write a description of the image below for 1 minute.';
    case 'custom_writing':
      return 'Enter your custom writing prompt...';
    default:
      return 'Write about the topic below.';
  }
}
