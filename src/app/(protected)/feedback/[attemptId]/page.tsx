'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

// Skeleton Component
function FeedbackSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-zinc-200 rounded-full"></div>
          </div>
          <div className="h-8 bg-zinc-200 rounded-lg w-48 mx-auto"></div>
        </div>

        {/* Subscores Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-zinc-200 rounded w-32"></div>
                <div className="h-2 bg-zinc-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-6 bg-zinc-200 rounded w-20 mx-auto mb-2"></div>
                <div className="h-4 bg-zinc-200 rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Error Component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Failed to Load Feedback</h2>
        <p className="text-zinc-600 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
  }, [attemptId, fetchAnalysis]);

  // Handle retry
  const handleRetry = () => {
    router.push('/');
  };

  // Handle copy feedback
  const handleCopyFeedback = () => {
    if (!data) return;

    const feedbackText = `
Speaking Assessment Results
Overall Score: ${data.overall}/100 (${data.cefr})

Subscores:
• Fluency: ${(data.rubric.fluency / 20).toFixed(1)}/5.0
• Pronunciation: ${(data.rubric.pronunciation / 20).toFixed(1)}/5.0
• Grammar: ${(data.rubric.grammar / 20).toFixed(1)}/5.0
• Vocabulary: ${(data.rubric.vocabulary / 20).toFixed(1)}/5.0
• Coherence: ${(data.rubric.coherence / 20).toFixed(1)}/5.0
• Task Completion: ${(data.rubric.task / 20).toFixed(1)}/5.0

Speaking Metrics:
• Words per minute: ${data.metrics.wordsPerMinute}
• Fillers per minute: ${data.metrics.fillerPerMin.toFixed(1)}
• Type-token ratio: ${(data.metrics.typeTokenRatio * 100).toFixed(0)}%
• Duration: ${data.metrics.durationSec.toFixed(1)}s
• Word count: ${data.metrics.wordCount}

Transcript:
${data.transcript}

Action Plan:
${data.actionPlan.map(item => `• ${item}`).join('\n')}

Grammar Issues:
${data.grammarIssues.map(issue => 
  `• "${issue.before}" → "${issue.after}" (${issue.explanation})`
).join('\n')}
    `.trim();

    navigator.clipboard.writeText(feedbackText);
    toast.success('Feedback copied to clipboard!');
  };

  // Get color based on score
  const _getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getProgressBarColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCEFRColor = (cefr: string) => {
    switch (cefr) {
      case 'C1': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'B2': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'B1': return 'bg-green-100 text-green-800 border-green-300';
      case 'A2': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-zinc-100 text-zinc-800 border-zinc-300';
    }
  };

  if (loading) return <FeedbackSkeleton />;
  if (error) return <ErrorState error={error} onRetry={fetchAnalysis} />;
  if (!data) return <ErrorState error="No data available" onRetry={fetchAnalysis} />;

  const subscores = [
    { name: 'Fluency', key: 'fluency' as keyof Rubric, icon: '💬' },
    { name: 'Pronunciation', key: 'pronunciation' as keyof Rubric, icon: '🗣️' },
    { name: 'Grammar', key: 'grammar' as keyof Rubric, icon: '📝' },
    { name: 'Vocabulary', key: 'vocabulary' as keyof Rubric, icon: '📚' },
    { name: 'Coherence', key: 'coherence' as keyof Rubric, icon: '🔗' },
    { name: 'Task Completion', key: 'task' as keyof Rubric, icon: '✅' },
  ];

  const metrics = [
    { label: 'WPM', value: data.metrics.wordsPerMinute, suffix: '' },
    { label: 'Fillers/min', value: data.metrics.fillerPerMin.toFixed(1), suffix: '' },
    { label: 'TTR', value: `${(data.metrics.typeTokenRatio * 100).toFixed(0)}`, suffix: '%' },
    { label: 'Duration', value: data.metrics.durationSec.toFixed(1), suffix: 's' },
    { label: 'Words', value: data.metrics.wordCount, suffix: '' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Overall Score */}
        <div className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-2xl shadow-lg p-8 text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-6">Speaking Assessment Results</h1>
            
            {/* Overall Score Circle */}
            <div className="relative inline-block mb-4">
              <div className={`w-32 h-32 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border-4 border-white/30`}>
                <span className="text-5xl font-bold text-white">{data.overall}</span>
              </div>
              <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-sm font-semibold border ${getCEFRColor(data.cefr)}`}>
                {data.cefr}
              </div>
            </div>
            
            <p className="text-white/90">Overall Score</p>
          </div>
        </div>

        {/* Subscores Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">Detailed Scores</h2>
          <div className="space-y-4">
            {subscores.map((subscore) => {
              const score = data.rubric[subscore.key];
              const displayScore = score / 20; // Convert 0-100 to 0-5
              
              return (
                <div key={subscore.key}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{subscore.icon}</span>
                      <span className="font-medium text-zinc-900">{subscore.name}</span>
                    </div>
                    <span className="font-semibold text-zinc-700">
                      {displayScore.toFixed(1)}/5.0
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speaking Metrics Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">Speaking Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center p-3 bg-zinc-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {metric.value}{metric.suffix}
                </div>
                <div className="text-sm text-zinc-600 mt-1">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">Your Response</h2>
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
              {data.transcript || <span className="text-zinc-400 italic">No transcript available</span>}
            </p>
          </div>
        </div>

        {/* Action Plan Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Action Plan
          </h2>
          <ul className="space-y-3">
            {data.actionPlan.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="text-zinc-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Grammar Issues Card */}
        {data.grammarIssues.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Grammar Corrections
            </h2>
            <div className="space-y-4">
              {data.grammarIssues.map((issue, index) => (
                <div key={index} className="border-l-4 border-yellow-400 pl-4 py-2">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-red-600 line-through">{issue.before}</span>
                    <span className="text-zinc-500">→</span>
                    <span className="text-green-600 font-medium">{issue.after}</span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">{issue.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pb-8">
          <button
            onClick={handleRetry}
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-try This Prompt
          </button>
          
          <button
            onClick={handleCopyFeedback}
            className="px-8 py-3 bg-white text-zinc-700 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Feedback
          </button>
        </div>
      </div>
    </div>
  );
}