'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { PracticeSkeleton } from '@/components/LoadingSkeleton';

// Create Supabase client for data operations only (no auth)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Question {
  id: string;
  type: string;
  prompt: string;
  target_language: string;
  source_language: string;
}

const VALID_PRACTICE_TYPES = [
  'listen_then_speak',
  'read_aloud',
  'describe_image',
  'answer_question',
  'speak_on_topic'
];

interface PracticeClientProps {
  initialUserId?: string;
  supabaseUserId?: string;
}

export default function PracticeClient({ initialUserId, supabaseUserId }: PracticeClientProps) {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const type = params.type as string;
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      toast.error('Please sign in to practice');
      router.push('/sign-in');
      return;
    }

    // Check if practice type is valid
    if (!VALID_PRACTICE_TYPES.includes(type)) {
      setError(`Unknown practice type: ${type}`);
      setLoading(false);
      return;
    }
    
    if (supabaseUserId) {
      startPracticeSession();
    }
  }, [type, isLoaded, isSignedIn, supabaseUserId]);

  const startPracticeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabaseUserId) {
        throw new Error('User not found in database');
      }

      // Start a new practice session
      const { data: session, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: supabaseUserId,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error('Failed to create practice session');
      }
      setSessionId(session.id);

      // Fetch a random question of the given type
      const { count, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('type', type);

      if (countError) {
        throw new Error('Failed to fetch questions');
      }
      if (!count || count === 0) {
        setError(`No questions available for "${type.replace(/_/g, ' ')}" practice`);
        toast.warning('No questions available for this practice type');
        return;
      }

      // Get random offset
      const randomOffset = Math.floor(Math.random() * count);

      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('type', type)
        .range(randomOffset, randomOffset)
        .single();

      if (questionError) {
        throw new Error('Failed to load question');
      }
      setQuestion(questionData);

    } catch (err) {
      console.error('Error starting practice session:', err);
      const message = err instanceof Error ? err.message : 'Failed to start practice session';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId || !question || !supabaseUserId) return;

    try {
      setSubmitting(true);
      setError(null);

      // Insert an attempt with placeholder transcript
      const { error: attemptError } = await supabase
        .from('attempts')
        .insert({
          session_id: sessionId,
          question_id: question.id,
          user_id: supabaseUserId,
          transcript: 'Placeholder transcript for testing',
          attempted_at: new Date().toISOString()
        });

      if (attemptError) {
        throw new Error('Failed to submit answer');
      }

      // Call activity ping API to update daily activity
      const response = await fetch('/api/activity/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to update daily activity');
      } else {
        toast.success('Answer submitted successfully!');
      }

      // Redirect to dashboard
      router.push('/app');

    } catch (err) {
      console.error('Error submitting attempt:', err);
      const message = err instanceof Error ? err.message : 'Failed to submit attempt';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return <PracticeSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            {error.includes('Unknown practice type') ? '404 - Practice Type Not Found' : 'Error Loading Practice'}
          </h2>
          <p className="text-zinc-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/app')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-amber-50 border-2 border-amber-200 rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">No Questions Available</h2>
          <p className="text-zinc-600 mb-6">
            There are no questions available for "{type.replace(/_/g, ' ')}" practice at the moment.
          </p>
          <button 
            onClick={() => router.push('/app')}
            className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Practice: {type}</h1>
      
      <div style={{
        padding: '2rem',
        marginBottom: '2rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h2 style={{ marginTop: 0 }}>Question</h2>
        <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          {question.prompt}
        </p>
        <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
          <p>Type: {question.type}</p>
          <p>Target Language: {question.target_language}</p>
          <p>Source Language: {question.source_language}</p>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: '0.75rem 2rem',
            fontSize: '1.125rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.6 : 1
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </div>

      {sessionId && (
        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#6c757d', textAlign: 'center' }}>
          Session ID: {sessionId}
        </p>
      )}
    </div>
  );
}