import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import ListeningRunnerClient from './ListeningRunnerClient';
import { selectPromptForUser } from '@/lib/prompts/selector';
import { ListenAndTypePrompt, ListenAndRespondPrompt, ListenAndCompletePrompt, ListenAndSummarizePrompt } from '@/lib/prompts/types';
import { FREE_TIER_LIFETIME_LIMIT } from '@/lib/subscription/constants';
import type { UsageCheckResult } from '@/types/subscription.types';

const VALID_LISTENING_TYPES = [
  'listen_and_type',
  'listen_and_respond',
  'listen_and_complete',
  'listen_and_summarize'
];

// All listening types use adaptive prompts
const ADAPTIVE_TYPES = VALID_LISTENING_TYPES;

interface PageProps {
  params: Promise<{
    type: string;
  }>;
}

export default async function ListeningPracticePage({ params }: PageProps) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    return null;
  }

  const resolvedParams = await params;

  // Validate listening type
  if (!VALID_LISTENING_TYPES.includes(resolvedParams.type)) {
    redirect('/app/listening');
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
    redirect('/app/listening');
  }

  // Check if user has access (premium or free tier limit not reached)
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

  // Create a temporary session
  const session = {
    id: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    user_id: supabaseUserId,
    started_at: new Date().toISOString()
  };

  type ListeningPromptData = ListenAndTypePrompt | ListenAndRespondPrompt | ListenAndCompletePrompt | ListenAndSummarizePrompt;
  let question;
  let adaptivePromptData: ListeningPromptData | null = null;

  // Check if this is an adaptive type (AI-generated prompts)
  if (ADAPTIVE_TYPES.includes(resolvedParams.type)) {
    // Use the adaptive prompt system
    try {
      const result = await selectPromptForUser(
        supabaseUserId,
        'listening',
        resolvedParams.type as 'listen_and_type' | 'listen_and_respond' | 'listen_and_complete' | 'listen_and_summarize'
      );

      if (result.prompt && result.prompt.prompt_data) {
        const promptData = result.prompt.prompt_data as ListeningPromptData;
        adaptivePromptData = promptData;

        // Convert adaptive prompt to Question format
        let promptText = '';
        if (promptData.type === 'listen_and_type') {
          promptText = promptData.audioScript;
        } else if (promptData.type === 'listen_and_respond') {
          promptText = promptData.conversationTurns[0]?.prompt || 'Listen and respond to the conversation.';
        } else if (promptData.type === 'listen_and_complete') {
          promptText = promptData.audioScript;
        } else if (promptData.type === 'listen_and_summarize') {
          promptText = promptData.audioScript;
        }

        question = {
          id: result.prompt.id,
          type: resolvedParams.type,
          prompt: promptText,
          image_url: null,
          prep_seconds: 0,
          min_seconds: 0,
          max_seconds: 60,
          target_language: 'en',
          source_language: 'en'
        };

        console.log(`Selected adaptive listening prompt: ${result.prompt.id} (Level: ${result.userLevel}, Source: ${result.source})`);
      } else {
        // Fallback to database questions if no adaptive prompt available
        console.log('No adaptive prompt available, falling back to database');
      }
    } catch (error) {
      console.error('Error selecting adaptive prompt:', error);
      // Fall through to database fallback
    }
  }

  // Fallback: use database questions or mock
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
        prep_seconds: dbQuestion.prep_seconds || 0,
        min_seconds: dbQuestion.min_seconds || 0,
        max_seconds: dbQuestion.max_seconds || 60,
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
      image_url: null,
      prep_seconds: 0,
      min_seconds: 0,
      max_seconds: 60,
      target_language: 'en',
      source_language: 'en'
    };
  }

  return (
    <ListeningRunnerClient
      question={question}
      sessionId={session.id}
      supabaseUserId={supabaseUserId}
      listeningType={resolvedParams.type}
      adaptivePromptData={adaptivePromptData}
    />
  );
}

function getPromptForType(type: string): string {
  switch (type) {
    case 'listen_and_type':
      return 'The early bird catches the worm.';
    case 'listen_and_respond':
      return 'Hi, I was wondering if you could help me with something.';
    case 'listen_and_complete':
      return 'The quick brown fox jumps over the lazy dog.';
    case 'listen_and_summarize':
      return 'Listen to the audio and write a summary of what you heard.';
    default:
      return 'Listen carefully and respond.';
  }
}
