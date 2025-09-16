'use client';

import { toast } from 'sonner';
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
  strengths: string | string[];          // kept for compatibility, not rendered (Flutter UI doesn’t show)
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
  // ----- Helpers -----
  const cefrClasses = (cefr?: string) => {
    switch (cefr) {
      case 'A2':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'B1':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'B2':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'C1':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'C2':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-300';
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
        {/* Header (Overall + CEFR badge) */}
        <div className="p-6 border-b flex items-center justify-between bg-white">
          <h2 className="text-2xl font-semibold text-zinc-900">Overall: {Math.round(feedback.overall ?? 0)}</h2>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${cefrClasses(
              feedback.cefr
            )}`}
          >
            CEFR: {feedback.cefr ?? '—'}
          </span>
        </div>

        {/* Charts row: Radar (rubric) + Bar (metrics) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b">
          {/* Speaking Subscores (Radar) */}
          <div className="rounded-xl border bg-white">
            <div className="p-4 pb-0">
              <h3 className="text-base font-semibold text-zinc-900">Speaking Subscores</h3>
            </div>
            <div className="h-64 w-full p-4" aria-label="Radar chart of speaking subscores">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="80%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tickCount={6} tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" fill="currentColor" fillOpacity={0.15} stroke="currentColor" />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delivery Metrics (Bar) */}
          <div className="rounded-xl border bg-white">
            <div className="p-4 pb-0">
              <h3 className="text-base font-semibold text-zinc-900">Delivery Metrics</h3>
              <p className="text-sm text-zinc-600 mt-1">
                WPM, fillers/min (lower is better), and lexical diversity (TTR).
              </p>
            </div>
            <div className="h-60 w-full p-4" aria-label="Bar chart of delivery metrics">
              {metrics ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-sm text-zinc-500">No metrics available</div>
              )}
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="p-6 border-b">
          <h3 className="text-base font-semibold text-zinc-900 mb-2">Transcript</h3>
          <div className="rounded-xl border bg-white p-4">
            {feedback.transcript?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">{feedback.transcript.trim()}</p>
            ) : (
              <p className="text-sm text-zinc-500 italic">No speech detected.</p>
            )}
          </div>
        </div>

        {/* Strengths */}
        <div className="p-6 border-b">
          <h3 className="text-base font-semibold text-zinc-900 mb-2">Strengths</h3>
          <div className="rounded-xl border bg-green-50 p-4">
            <p className="text-sm text-zinc-800">
              {typeof feedback.strengths === 'string' 
                ? feedback.strengths 
                : Array.isArray(feedback.strengths) 
                  ? feedback.strengths.join(' ') 
                  : 'No strengths feedback available.'}
            </p>
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="p-6 border-b">
          <h3 className="text-base font-semibold text-zinc-900 mb-2">Areas for Improvement</h3>
          <div className="rounded-xl border bg-blue-50 p-4">
            <p className="text-sm text-zinc-800">
              {typeof feedback.improvements === 'string' 
                ? feedback.improvements 
                : Array.isArray(feedback.improvements) 
                  ? feedback.improvements.join(' ') 
                  : 'No improvement feedback available.'}
            </p>
          </div>
        </div>

        {/* Grammar Suggestions */}
        <div className="p-6 border-b">
          <h3 className="text-base font-semibold text-zinc-900 mb-2">Grammar Suggestions</h3>
          {feedback.grammarIssues && feedback.grammarIssues.length > 0 ? (
            <ul className="space-y-3">
              {feedback.grammarIssues.map((g, i) => (
                <li key={i} className="flex gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full border border-zinc-300" />
                  <div>
                    <div className="text-sm font-medium">
                      <span className="line-through opacity-70 mr-1">{g.before}</span>
                      <span className="mx-1">→</span>
                      <span>{g.after}</span>
                    </div>
                    <p className="text-sm text-zinc-600">{g.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600">No major grammar issues detected.</p>
          )}
        </div>

        {/* Action Plan */}
        <div className="p-6">
          <h3 className="text-base font-semibold text-zinc-900 mb-2">Action Plan (next attempt)</h3>
          {feedback.actionable_tips?.length ? (
            <ul className="space-y-2">
              {feedback.actionable_tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <svg className="mt-0.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-800">{tip}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600">No tips provided.</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-brand-background flex gap-4 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-brand-amber text-white font-medium rounded-xl hover:bg-brand-amber-dark transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-amber focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-try This Prompt
          </button>
          <button
            onClick={handleCopyFeedback}
            className="px-6 py-3 bg-brand-surface text-brand-text-primary font-medium border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
