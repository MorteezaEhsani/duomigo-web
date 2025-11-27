import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import AdminQuestionsClient from './AdminQuestionsClient';

export default async function AdminQuestionsPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId) {
    redirect('/sign-in');
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

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', supabaseUserId)
    .single();

  if (!profile?.is_admin) {
    redirect('/app');
  }

  // Fetch all questions
  const { data: questionsRaw } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  // Type cast to match AdminQuestionsClient interface
  const questions = questionsRaw?.map(q => ({
    ...q,
    metadata: q.metadata as Record<string, unknown> | null
  })) || [];

  // Define the only allowed question types for admin
  const questionTypes = [
    // Speaking types
    { id: 'listen_then_speak', label: 'Listen, Then Speak', description: 'User hears a prompt and speaks about it' },
    { id: 'read_then_speak', label: 'Read, Then Speak', description: 'User reads text and speaks about it' },
    { id: 'speak_about_photo', label: 'Speak About the Photo', description: 'User describes what they see in a photo' },
    // Writing types
    { id: 'writing_sample', label: 'Writing Sample', description: 'User writes about a topic for up to 5 minutes' },
    { id: 'interactive_writing', label: 'Interactive Writing', description: 'User writes an initial response, then a follow-up for 3 minutes' },
    { id: 'write_about_photo', label: 'Write About Photo', description: 'User describes an image in writing for 1 minute' }
  ];

  return (
    <AdminQuestionsClient
      initialQuestions={questions}
      questionTypes={questionTypes}
      supabaseUserId={supabaseUserId}
    />
  );
}