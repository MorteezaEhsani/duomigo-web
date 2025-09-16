import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import PracticeRunnerClient from './PracticeRunnerClient';

const VALID_PRACTICE_TYPES = [
  'listen_then_speak',
  'speak_about_photo',
  'read_then_speak',
  'custom_prompt'
];

interface PageProps {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<{
    session?: string;
    question?: string;
  }>;
}

export default async function PracticeRunnerPage({ params, searchParams }: PageProps) {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId) {
    return null; // Middleware will handle redirect
  }

  // Await params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Validate practice type
  if (!VALID_PRACTICE_TYPES.includes(resolvedParams.type)) {
    redirect('/app');
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
    redirect('/app');
  }

  let session;
  let question;

  // Check if this is a custom prompt with existing session and question
  if (resolvedParams.type === 'custom_prompt' && resolvedSearchParams.session && resolvedSearchParams.question) {
    // Fetch the existing session
    const { data: existingSession, error: sessionError } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', resolvedSearchParams.session)
      .eq('user_id', supabaseUserId)
      .single();

    if (sessionError || !existingSession) {
      console.error('Error fetching session:', sessionError);
      redirect('/app');
    }
    session = existingSession;

    // Fetch the specific question
    const { data: specificQuestion, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', resolvedSearchParams.question)
      .single();

    if (questionError || !specificQuestion) {
      console.error('Error fetching question:', questionError);
      redirect('/app');
    }
    question = specificQuestion;

  } else {
    // Regular flow for non-custom prompts
    // Create a practice session
    const { data: newSession, error: sessionError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: supabaseUserId,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError || !newSession) {
      console.error('Error creating session:', sessionError);
      redirect('/app');
    }
    session = newSession;

    // Fetch a random question of the given type
    const { count } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('type', resolvedParams.type);

    if (!count || count === 0) {
      redirect('/app');
    }

    // Get random offset
    const randomOffset = Math.floor(Math.random() * count);

    const { data: randomQuestion, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('type', resolvedParams.type)
      .range(randomOffset, randomOffset)
      .single();

    if (questionError || !randomQuestion) {
      console.error('Error fetching question:', questionError);
      redirect('/app');
    }
    question = randomQuestion;
  }

  return (
    <PracticeRunnerClient 
      question={question}
      sessionId={session.id}
      supabaseUserId={supabaseUserId}
    />
  );
}