import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import AdminQuestionsClient from './AdminQuestionsClient';

// Create Supabase client with service role for server operations
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export default async function AdminQuestionsPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = getSupabaseClient();

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
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  // Define the only allowed question types for admin
  const questionTypes = [
    { id: 'listen_then_speak', label: 'Listen, Then Speak', description: 'User hears a prompt and speaks about it' },
    { id: 'read_then_speak', label: 'Read, Then Speak', description: 'User reads text and speaks about it' },
    { id: 'speak_about_photo', label: 'Speak About the Photo', description: 'User describes what they see in a photo' }
  ];

  return (
    <AdminQuestionsClient 
      initialQuestions={questions || []}
      questionTypes={questionTypes}
      supabaseUserId={supabaseUserId}
    />
  );
}