'use client';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  Tooltip,
} from 'recharts';

interface Feedback {
  overall: number;
  fluency: number;
  pronunciation: number;
  grammar: number;
  vocabulary: number;
  coherence: number;
  task?: number;
  strengths: string | string[];          // kept for compatibility, not rendered (Flutter UI doesn't show)
  improvements: string | string[];       // kept for compatibility, not rendered
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
    typeTokenRatio: number; // 0..1
    fillerCount: number;
    wordCount: number;
  };
  cefr?: 'A2' | 'B1' | 'B2' | 'C1' | string;
}

interface FeedbackCardProps {
  feedback: Feedback;
  onRetry: () => void;
}

export default function FeedbackCard({ feedback, onRetry }: FeedbackCardProps) {
  const router = useRouter();

  // ----- Helpers -----
  const cefrClasses = (cefr?: string) => {
    switch (cefr) {
      case 'A2':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'B1':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'B2':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400';
      case 'C1':
        return 'bg-blue-100 text-blue-900 border-blue-400';
      case 'C2':
        return 'bg-violet-100 text-violet-900 border-violet-400';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const pretty = (k: string) =>
    k.substring(0, 1).toUpperCase() + k.substring(1).replaceAll('_', ' ');

  // Radar (rubric) data
  const rubricLabels = ['fluency', 'pronunciation', 'grammar', 'vocabulary', 'coherence', 'task'];
  const rubricMap: Record<string, number> = {
    fluency: feedback.fluency ?? 0,
    pronunciation: feedback.pronunciation ?? 0,
    grammar: feedback.grammar ?? 0,
    vocabulary: feedback.vocabulary ?? 0,
    coherence: feedback.coherence ?? 0,
    task: (feedback.task ?? feedback.coherence) ?? 0,
  };
  const radarData = rubricLabels.map((key) => ({
    label: pretty(key),
    value: Math.max(0, Math.min(100, rubricMap[key] || 0)),
  }));

  // Bar (metrics) data
  const metrics = feedback.metrics;
  const bars = metrics
    ? [
        { name: 'WPM', value: metrics.wordsPerMinute ?? 0 },
        { name: 'Fillers/min', value: metrics.fillerPerMin ?? 0 },
        { name: 'TTR', value: Math.round((metrics.typeTokenRatio ?? 0) * 100) },
      ]
    : [];

  const handleCopyFeedback = () => {
    const transcriptSection = feedback.transcript
      ? `\nYour Response:\n${feedback.transcript.trim() || 'No speech detected'}\n\n`
      : '';

    const metricsSection = feedback.metrics
      ? `\nSpeaking Metrics:\n• Words per minute: ${feedback.metrics.wordsPerMinute}\n• Fillers per minute: ${feedback.metrics.fillerPerMin}\n• Type-token ratio: ${Math.round(
          feedback.metrics.typeTokenRatio * 100
        )}%\n• Duration: ${feedback.metrics.durationSec}s\n• Word count: ${feedback.metrics.wordCount}\n\n`
      : '';

    const grammarSection =
      feedback.grammarIssues && feedback.grammarIssues.length > 0
        ? `\nGrammar Corrections:\n${feedback.grammarIssues
            .map((i) => `• "${i.before}" → "${i.after}" (${i.explanation})`)
            .join('\n')}\n\n`
        : '';

    const subs = [
      `• Fluency: ${feedback.fluency}/100`,
      `• Pronunciation: ${feedback.pronunciation}/100`,
      `• Grammar: ${feedback.grammar}/100`,
      `• Vocabulary: ${feedback.vocabulary}/100`,
      `• Coherence: ${feedback.coherence}/100`,
      `• Task: ${(feedback.task ?? feedback.coherence)}/100`,
    ].join('\n');

    const tips = feedback.actionable_tips.map((t) => `• ${t}`).join('\n');

    const feedbackText = `
Speaking Assessment Results
Overall Score: ${feedback.overall}/100 ${feedback.cefr ? `(${feedback.cefr})` : ''}

${transcriptSection}Subscores:
${subs}

${metricsSection}Actionable Tips:
${tips}
${grammarSection}`.trim();

    navigator.clipboard.writeText(feedbackText);
    toast.success('Feedback copied to clipboard!');
  };

  return (
    <div className="h-viewport bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-y-auto safe-top">
        <div className="max-w-4xl mx-auto p-2 sm:p-4 md:p-6">
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header (Overall + CEFR badge) */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            Overall: <span className="text-amber-600">{Math.round(feedback.overall ?? 0)}</span>
          </h2>
          <span
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold ${cefrClasses(
              feedback.cefr
            )}`}
          >
            CEFR: {feedback.cefr ?? '—'}
          </span>
        </div>

        {/* Charts row: Radar (rubric) + Bar (metrics) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 border-b border-gray-200 bg-gray-50">
          {/* Speaking Subscores (Radar) */}
          <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="p-3 sm:p-4 pb-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Speaking Subscores</h3>
            </div>
            <div className="h-64 w-full p-4" aria-label="Radar chart of speaking subscores">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="80%">
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <PolarRadiusAxis domain={[0, 100]} tickCount={6} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Radar dataKey="value" fill="#f59e0b" fillOpacity={0.25} stroke="#f59e0b" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delivery Metrics (Bar) */}
          <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="p-3 sm:p-4 pb-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Delivery Metrics</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                WPM, fillers/min (lower is better), and lexical diversity (TTR).
              </p>
            </div>
            <div className="h-60 w-full p-4" aria-label="Bar chart of delivery metrics">
              {metrics ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-sm text-gray-500">No metrics available</div>
              )}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 bg-white">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Transcript</h3>
          <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
            {feedback.transcript?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{feedback.transcript.trim()}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">No speech detected.</p>
            )}
          </div>
        </div>

        {/* Strengths */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 bg-white">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Strengths
          </h3>
          <div className="rounded-lg sm:rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-3 sm:p-4">
            <p className="text-sm text-emerald-900 leading-relaxed font-medium">
              {typeof feedback.strengths === 'string'
                ? feedback.strengths
                : Array.isArray(feedback.strengths)
                  ? feedback.strengths.join(' ')
                  : 'No strengths feedback available.'}
            </p>
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 bg-white">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Areas for Improvement
          </h3>
          <div className="rounded-lg sm:rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-3 sm:p-4">
            <p className="text-sm text-amber-900 leading-relaxed font-medium">
              {typeof feedback.improvements === 'string'
                ? feedback.improvements
                : Array.isArray(feedback.improvements)
                  ? feedback.improvements.join(' ')
                  : 'No improvement feedback available.'}
            </p>
          </div>
        </div>

        {/* Grammar Suggestions */}
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 bg-white">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Grammar Suggestions
          </h3>
          {feedback.grammarIssues && feedback.grammarIssues.length > 0 ? (
            <ul className="space-y-3">
              {feedback.grammarIssues.map((g, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-amber-500 border-2 border-amber-200 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      <span className="line-through opacity-60 text-rose-600 mr-1">{g.before}</span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className="text-emerald-700">{g.after}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{g.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No major grammar issues detected.</p>
          )}
        </div>

        {/* Action Plan */}
        <div className="p-3 sm:p-4 md:p-6 bg-white">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Action Plan (next attempt)
          </h3>
          {feedback.actionable_tips?.length ? (
            <ul className="space-y-2">
              {feedback.actionable_tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <svg className="mt-0.5 h-4 w-4 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-800 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No tips provided.</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 sm:justify-center safe-bottom">
          <button
            onClick={() => router.push('/app')}
            className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg sm:rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg hover:shadow-xl text-xs sm:text-sm md:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </button>
          <button
            onClick={onRetry}
            className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white text-gray-700 font-semibold border border-gray-300 sm:border-2 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg text-xs sm:text-sm md:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Re-try This Prompt</span>
            <span className="sm:hidden">Retry</span>
          </button>
          <button
            onClick={handleCopyFeedback}
            className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white text-gray-700 font-semibold border border-gray-300 sm:border-2 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg text-xs sm:text-sm md:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Copy Feedback</span>
            <span className="sm:hidden">Copy</span>
          </button>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}