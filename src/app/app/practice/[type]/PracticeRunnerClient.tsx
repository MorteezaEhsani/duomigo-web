'use client';

import PracticeRunner from '@/components/PracticeRunner';

interface Question {
  id: string;
  type: string;
  prompt: string;
  image_url?: string | null;
  prep_seconds: number;
  min_seconds: number;
  max_seconds: number;
  target_language: string;
  source_language: string;
}

interface PracticeRunnerClientProps {
  question: Question;
  sessionId: string;
  supabaseUserId: string;
}

export default function PracticeRunnerClient({ 
  question, 
  sessionId, 
  supabaseUserId 
}: PracticeRunnerClientProps) {
  return (
    <PracticeRunner 
      question={question}
      sessionId={sessionId}
      supabaseUserId={supabaseUserId}
    />
  );
}