'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FeedbackCard from '@/components/FeedbackCard';

// Types
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

type Feedback = {
  overall: number;
  fluency: number;
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  coherence: number;
  task?: number;
  strengths: string | string[];
  improvements: string | string[];
  actionable_tips: string[];
  grammarIssues?: {
    before: string;
    after: string;
    explanation: string;
  }[];
  transcript?: string;
  metrics?: {
    durationSec: number;
    wordsPerMinute: number;
    fillerPerMin: number;
    typeTokenRatio: number;
    fillerCount: number;
    wordCount: number;
  };
  cefr?: string;
};

// Skeleton Component
function FeedbackSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error Component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Feedback</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Main Feedback Page Component
export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analysis data
  const fetchAnalysis = async () => {
    if (!attemptId) {
      setError('No attempt ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use Next.js API route instead of external backend
      const response = await fetch(`/api/attempts/${attemptId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze attempt: ${response.statusText}`);
      }

      const result: AnalyzeResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [attemptId]);

  // Handle retry - go back to dashboard
  const handleRetry = () => {
    router.push('/app');
  };

  if (loading) return <FeedbackSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchAnalysis} />;
  if (!data) return <ErrorState error="No data available" onRetry={fetchAnalysis} />;

  // Transform AnalyzeResponse to Feedback format
  const feedback: Feedback = {
    overall: data.overall,
    fluency: data.rubric.fluency,
    pronunciation: data.rubric.pronunciation,
    grammar: data.rubric.grammar,
    vocabulary: data.rubric.vocabulary,
    coherence: data.rubric.coherence,
    task: data.rubric.task,
    strengths: '', // Not provided by API
    improvements: '', // Not provided by API
    actionable_tips: data.actionPlan,
    grammarIssues: data.grammarIssues,
    transcript: data.transcript,
    metrics: data.metrics,
    cefr: data.cefr,
  };

  return <FeedbackCard feedback={feedback} onRetry={handleRetry} />;
}
