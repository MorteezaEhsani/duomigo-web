'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: string;
  type: string;
  skill_type: string;
  prompt: string;
  prep_seconds: number;
  min_seconds: number;
  max_seconds: number;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
}

interface PracticeSessionClientProps {
  questions: Question[];
  sessionId: string;
  supabaseUserId: string;
  isPremium: boolean;
}

function getSkillIcon(skillType: string) {
  switch (skillType) {
    case 'speaking':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      );
    case 'writing':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'listening':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    case 'reading':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    default:
      return null;
  }
}

function getSkillColor(skillType: string) {
  switch (skillType) {
    case 'speaking':
      return 'bg-blue-100 text-blue-700';
    case 'writing':
      return 'bg-purple-100 text-purple-700';
    case 'listening':
      return 'bg-green-100 text-green-700';
    case 'reading':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getPracticeUrl(question: Question): string {
  const skillType = question.skill_type;

  switch (skillType) {
    case 'speaking':
      return `/app/practice/${question.type}`;
    case 'writing':
      return `/app/writing/practice/${question.type}`;
    case 'listening':
      return `/app/listening/practice/${question.type}`;
    case 'reading':
      return `/app/reading/practice/${question.type}`;
    default:
      return `/app/practice/${question.type}`;
  }
}

export default function PracticeSessionClient({
  questions,
  isPremium
}: PracticeSessionClientProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [started, setStarted] = useState(false);

  const handleStartPractice = () => {
    if (questions.length > 0) {
      const question = questions[0];
      router.push(getPracticeUrl(question));
    }
  };

  const handleContinue = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCompletedCount(completedCount + 1);
      const question = questions[nextIndex];
      router.push(getPracticeUrl(question));
    } else {
      // Session complete - go back to dashboard
      router.push('/app');
    }
  };

  if (!started) {
    return (
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Practice Session
            </h1>
            <p className="text-gray-600">
              {questions.length} personalized questions based on your weak areas
            </p>
          </div>

          {/* Questions Preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Your Practice Set</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {questions.map((question, index) => (
                <div key={question.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                    {index + 1}
                  </div>
                  <div className={`flex-shrink-0 p-2 rounded-lg ${getSkillColor(question.skill_type)}`}>
                    {getSkillIcon(question.skill_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 capitalize">
                      {question.skill_type}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {question.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => {
              setStarted(true);
              handleStartPractice();
            }}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            Start Practice
          </button>

          {/* Back Link */}
          <div className="text-center mt-4">
            <Link
              href="/app"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to Home
            </Link>
          </div>

          {/* Info Card */}
          {!isPremium && (
            <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">Free Practice</h4>
                  <p className="text-sm text-amber-700">
                    This practice session uses 1 of your free practices. Upgrade to Premium for unlimited sessions!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Session in progress or complete - show progress indicator
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < completedCount
                    ? 'bg-green-500'
                    : index === currentIndex
                    ? 'bg-amber-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-gray-600">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        {completedCount === questions.length && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm mx-auto">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Session Complete!
            </h2>
            <p className="text-gray-600 mb-4">
              You've completed all {questions.length} questions.
            </p>
            <Link
              href="/app/leaderboards"
              className="block w-full py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors mb-2"
            >
              View Leaderboard
            </Link>
            <Link
              href="/app"
              className="block w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
