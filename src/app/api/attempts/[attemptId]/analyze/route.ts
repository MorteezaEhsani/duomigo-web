import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // prevent static optimization of this route

// Create Supabase client with service role for server operations
function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // (optional) guard:
  // if (!url || !key) throw new Error('Supabase envs are not set');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Types matching the frontend expectations
type Rubric = {
  fluency: number;
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  coherence: number;
  task: number;
};

type AnalyzeResponse = {
  transcript: string;
  metrics: {
    durationSec: number;
    wordsPerMinute: number;
    fillerPerMin: number;
    typeTokenRatio: number;
    fillerCount: number;
    wordCount: number;
  };
  rubric: Rubric;
  overall: number;
  cefr: 'A2' | 'B1' | 'B2' | 'C1';
  actionPlan: string[];
  grammarIssues: {
    before: string;
    after: string;
    explanation: string;
  }[];
};

// Helper function to calculate metrics from transcript
function calculateMetrics(transcript: string, durationSec: number) {
  const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const wordsPerMinute = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

  const fillers = ['um', 'uh', 'like', 'you know', 'so', 'actually', 'basically', 'literally'];
  let fillerCount = 0;
  const transcriptLower = transcript.toLowerCase();
  for (const filler of fillers) {
    const regex = new RegExp(`\\b${filler}\\b`, 'g');
    const matches = transcriptLower.match(regex);
    if (matches) fillerCount += matches.length;
  }

  const fillerPerMin = durationSec > 0 ? (fillerCount / durationSec) * 60 : 0;

  const uniqueWords = new Set(words);
  const typeTokenRatio = wordCount > 0 ? uniqueWords.size / wordCount : 0;

  return {
    durationSec,
    wordsPerMinute,
    fillerPerMin: Math.round(fillerPerMin * 10) / 10,
    typeTokenRatio: Math.round(typeTokenRatio * 100) / 100,
    fillerCount,
    wordCount,
  };
}

// Helper to determine CEFR level from overall score
function getCEFRLevel(overall: number): 'A2' | 'B1' | 'B2' | 'C1' {
  if (overall >= 85) return 'C1';
  if (overall >= 70) return 'B2';
  if (overall >= 50) return 'B1';
  return 'A2';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const { attemptId } = params;

    // 1) Server auth
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabase();

    // Ensure a Supabase user row exists / get its id
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User',
      }
    );
    if (userError || !supabaseUserId) {
      console.error('Error getting user:', userError);
      return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 500 });
    }

    // 2) Fetch the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', supabaseUserId)
      .single();

    if (attemptError || !attempt) {
      console.error('Error fetching attempt:', attemptError);
      return NextResponse.json({ error: 'Attempt not found or access denied' }, { status: 404 });
    }

    // 3) Build analysis from stored data
    const transcript = attempt.transcript || '';
    const duration = attempt.duration || 30;

    const metrics = calculateMetrics(transcript, duration);

    const rubric: Rubric = {
      fluency: (attempt.fluency_score || 0) * 20,
      pronunciation: (attempt.pronunciation_score || 0) * 20,
      grammar: (attempt.grammar_score || 0) * 20,
      vocabulary: (attempt.vocabulary_score || 0) * 20,
      coherence: (attempt.coherence_score || 0) * 20,
      // Using coherence as proxy for task completion
      task: (attempt.coherence_score || 0) * 20,
    };

    const overall = attempt.overall_score || attempt.score || 0;
    const cefr = getCEFRLevel(overall);

    let actionPlan: string[] = [];
    let grammarIssues: AnalyzeResponse['grammarIssues'] = [];

    if (attempt.feedback_json) {
      actionPlan =
        attempt.feedback_json.actionable_tips ||
        attempt.feedback_json.improvements || [
          'Practice speaking more fluently',
          'Work on pronunciation clarity',
          'Expand your vocabulary range',
        ];
      grammarIssues = []; // none stored currently
    } else {
      actionPlan = [
        'Record yourself speaking and listen back to identify areas for improvement',
        'Practice speaking for the full duration without long pauses',
        'Focus on clear pronunciation and natural intonation',
      ];
    }

    if (transcript.length < 10) {
      actionPlan = [
        'Make sure your microphone is working and speak clearly',
        'Try to speak for at least 30 seconds to get meaningful feedback',
        'Practice in a quiet environment to ensure good audio quality',
      ];
    }

    const response: AnalyzeResponse = {
      transcript,
      metrics,
      rubric,
      overall,
      cefr,
      actionPlan,
      grammarIssues,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analyze API error:', error);

    if (process.env.NODE_ENV === 'development') {
      const mockResponse: AnalyzeResponse = {
        transcript: 'This is a mock transcript for testing purposes.',
        metrics: {
          durationSec: 30,
          wordsPerMinute: 120,
          fillerPerMin: 2.5,
          typeTokenRatio: 0.75,
          fillerCount: 3,
          wordCount: 60,
        },
        rubric: {
          fluency: 70,
          pronunciation: 75,
          grammar: 65,
          vocabulary: 70,
          coherence: 72,
          task: 68,
        },
        overall: 70,
        cefr: 'B2',
        actionPlan: [
          'Focus on reducing filler words like "um" and "uh"',
          'Practice speaking at a steady pace without rushing',
          'Work on using more varied vocabulary',
        ],
        grammarIssues: [
          {
            before: 'I have went there',
            after: 'I have gone there',
            explanation: 'Use past participle "gone" with "have"',
          },
        ],
      };
      return NextResponse.json(mockResponse);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
