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
    // Check if this is a temporary session (not yet in database)
    if (resolvedSearchParams.session.startsWith('temp_')) {
      // Create a temporary session object
      session = {
        id: resolvedSearchParams.session,
        user_id: supabaseUserId,
        started_at: new Date().toISOString()
      };
    } else {
      // Fetch the existing session from database
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
    }

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
    // We'll pass a temporary session ID that will be created after completion
    session = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      user_id: supabaseUserId,
      started_at: new Date().toISOString()
    };

    // First, get the user's recent attempts to avoid showing the same questions
    // Get the last 10 attempts for this question type by this user
    const recentDays = 7; // Look at questions from the last 7 days
    const recentLimit = 10; // Track the last 10 questions shown
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - recentDays);

    const { data: recentAttempts } = await supabase
      .from('attempts')
      .select('question_id')
      .eq('user_id', supabaseUserId)
      .eq('type_id', resolvedParams.type)
      .gte('attempted_at', cutoffDate.toISOString())
      .order('attempted_at', { ascending: false })
      .limit(recentLimit);

    const recentQuestionIds = recentAttempts?.map(a => a.question_id) || [];

    // Fetch all questions of the given type
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('type', resolvedParams.type);

    if (allQuestionsError || !allQuestions || allQuestions.length === 0) {
      console.error('Error fetching questions:', allQuestionsError);
      redirect('/app');
    }

    // Filter out recently shown questions if possible
    let availableQuestions = allQuestions.filter(q => !recentQuestionIds.includes(q.id));

    // If all questions have been shown recently, use all questions but prefer the least recently shown
    if (availableQuestions.length === 0) {
      console.log('All questions shown recently, using full pool');
      availableQuestions = allQuestions;

      // If we have more questions than recent attempts, we can still filter
      if (allQuestions.length > recentQuestionIds.length && recentQuestionIds.length > 0) {
        // Sort questions to prioritize those not in recent list
        availableQuestions = [
          ...allQuestions.filter(q => !recentQuestionIds.includes(q.id)),
          ...allQuestions.filter(q => recentQuestionIds.includes(q.id))
        ];
      }
    }

    // Select a random question from available pool
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    question = availableQuestions[randomIndex];

    if (!question) {
      console.error('No question selected');
      redirect('/app');
    }

    console.log(`Selected question: ${question.id} from pool of ${availableQuestions.length} questions (${allQuestions.length} total, ${recentQuestionIds.length} recent)`);
  }

  return (
    <PracticeRunnerClient 
      question={question}
      sessionId={session.id}
      supabaseUserId={supabaseUserId}
    />
  );
}