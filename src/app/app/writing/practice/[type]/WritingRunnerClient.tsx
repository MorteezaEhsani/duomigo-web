'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';

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

interface WritingRunnerClientProps {
  question: Question;
  sessionId: string;
  supabaseUserId: string;
  writingType: string;
}

type Phase = 'prompt_input' | 'prep' | 'write' | 'step2' | 'processing' | 'feedback' | 'complete';

interface Feedback {
  overall: number;
  task_achievement: number;
  coherence: number;
  lexical_resource: number;
  grammar: number;
  strengths: string[];
  improvements: string[];
  actionable_tips: string[];
  grammarIssues?: {
    before: string;
    after: string;
    explanation: string;
  }[];
  detailed_feedback?: string;
  cefr?: string;
  step1Feedback?: {
    strengths?: string[];
    improvements?: string[];
  };
  step2Feedback?: {
    strengths?: string[];
    improvements?: string[];
  };
}

export default function WritingRunnerClient({
  question,
  sessionId,
  supabaseUserId,
  writingType
}: WritingRunnerClientProps) {
  const router = useRouter();
  const [customPrompt, setCustomPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>(
    writingType === 'custom_writing' ? 'prompt_input' :
    question.prep_seconds > 0 ? 'prep' : 'write'
  );
  const [prepTimeLeft, setPrepTimeLeft] = useState(20); // 20 seconds for custom writing
  const [timeLeft, setTimeLeft] = useState(question.max_seconds);
  const [writingText, setWritingText] = useState('');
  const [step1Text, setStep1Text] = useState('');
  const [step2FollowUpPrompt, setStep2FollowUpPrompt] = useState('');
  const [showMinTimeWarning, setShowMinTimeWarning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const writeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // Prep phase timer
  useEffect(() => {
    if (phase === 'prep' && prepTimeLeft > 0) {
      prepTimerRef.current = setInterval(() => {
        setPrepTimeLeft((prev) => {
          if (prev <= 1) {
            setPhase('write');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      };
    }
  }, [phase, prepTimeLeft]);

  // Writing phase timer
  useEffect(() => {
    if ((phase === 'write' || phase === 'step2') && timeLeft > 0) {
      writeTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (writeTimerRef.current) clearInterval(writeTimerRef.current);
      };
    }
  }, [phase, timeLeft]);

  // Auto-focus textarea when writing phase starts and track start time
  useEffect(() => {
    if ((phase === 'write' || phase === 'step2') && textareaRef.current) {
      textareaRef.current.focus();
      if (phase === 'write') {
        setStartTime(Date.now());
      }
    }
  }, [phase]);

  const handleTimeUp = useCallback(() => {
    if (writingType === 'interactive_writing' && phase === 'write') {
      // Move to step 2
      setStep1Text(writingText);
      setWritingText('');
      setTimeLeft(180); // 3 minutes for step 2
      setPhase('step2');
    } else {
      handleComplete();
    }
  }, [writingType, phase, writingText]);

  const handleComplete = async () => {
    // For interactive writing step 1, move to step 2 instead of submitting
    if (writingType === 'interactive_writing' && phase === 'write') {
      if (!writingText.trim()) {
        toast.error('Please write something before continuing');
        return;
      }

      // Save step 1 text and show processing while generating follow-up
      setStep1Text(writingText);
      setPhase('processing');

      try {
        // Generate AI follow-up question based on step 1 response
        const followUpResponse = await fetch('/api/generate-followup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalPrompt: question.prompt,
            userResponse: writingText
          })
        });

        if (!followUpResponse.ok) {
          throw new Error('Failed to generate follow-up question');
        }

        const { followUpQuestion } = await followUpResponse.json();
        setStep2FollowUpPrompt(followUpQuestion);
        setWritingText('');
        setTimeLeft(180); // 3 minutes for step 2
        setPhase('step2');
      } catch (error) {
        console.error('Error generating follow-up:', error);
        toast.error('Failed to generate follow-up question. Please try again.');
        setPhase('write');
      }
      return;
    }

    const elapsedTime = phase === 'step2' ? (180 - timeLeft) : (question.max_seconds - timeLeft);
    const minTimeRequired = phase === 'step2' ? 60 : question.min_seconds; // 1 minute for step 2

    if (elapsedTime < minTimeRequired && !showMinTimeWarning) {
      setShowMinTimeWarning(true);
      toast.error(`Please write for at least ${formatTime(minTimeRequired)}`);
      return;
    }

    if (!writingText.trim()) {
      toast.error('Please write something before submitting');
      return;
    }

    setPhase('processing');

    try {
      // Calculate actual writing duration
      const writingDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : elapsedTime;

      // Create attempt record via API
      const isTemporarySession = sessionId.startsWith('temp_');
      let actualSessionId = sessionId;

      if (isTemporarySession) {
        const sessionResponse = await fetch('/api/practice-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!sessionResponse.ok) {
          throw new Error('Failed to create practice session');
        }

        const { sessionId: newSessionId } = await sessionResponse.json();
        actualSessionId = newSessionId;
      }

      // Submit writing for feedback
      const response = await fetch('/api/writing-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writingText,
          questionId: question.id,
          questionType: writingType,
          sessionId: actualSessionId,
          duration: writingDuration,
          imageUrl: question.image_url,
          prompt: writingType === 'custom_writing' && customPrompt ? customPrompt : question.prompt,
          // For interactive writing, include both steps
          step1Text: writingType === 'interactive_writing' ? step1Text : undefined,
          step2Text: writingType === 'interactive_writing' ? writingText : undefined,
          step2Prompt: writingType === 'interactive_writing' ? step2FollowUpPrompt : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const feedbackData = await response.json();
      setFeedback(feedbackData);
      setPhase('feedback');

    } catch (error) {
      console.error('Error submitting writing:', error);
      toast.error('Failed to submit writing. Please try again.');
      setPhase('write');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseInstructions = () => {
    if (phase === 'prep') {
      return 'Read the prompt carefully and prepare your response. Writing will begin automatically.';
    }

    if (writingType === 'writing_sample') {
      return `Write about the topic below for ${formatTime(question.max_seconds)}. Minimum ${formatTime(question.min_seconds)} required.`;
    }

    if (writingType === 'interactive_writing') {
      if (phase === 'write') {
        return 'Step 1: Write about the topic below for 5 minutes.';
      } else if (phase === 'step2') {
        return 'Step 2: Write a follow-up response for 3 minutes.';
      }
    }

    if (writingType === 'write_about_photo') {
      return 'Write a description of the image below for 1 minute.';
    }

    if (writingType === 'custom_writing') {
      return 'Write your response below.';
    }

    return 'Write your response below.';
  };

  const getPrompt = () => {
    if (writingType === 'interactive_writing' && phase === 'step2' && step2FollowUpPrompt) {
      return step2FollowUpPrompt;
    }
    if (writingType === 'custom_writing' && customPrompt) {
      return customPrompt;
    }
    return question.prompt;
  };

  const handleStartCustomWriting = () => {
    if (!customPrompt.trim()) {
      toast.error('Please enter a custom prompt');
      return;
    }
    setPrepTimeLeft(20); // Reset to 20 seconds
    setPhase('prep');
  };

  if (phase === 'processing') {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analyzing Your Writing...</h2>
          <p className="text-gray-600">
            Our AI is evaluating your response based on proficiency test criteria.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'feedback' && feedback) {
    const getScoreColor = (_score: number) => {
      return 'text-gray-700';
    };

    const getCefrBadgeColor = (cefr?: string) => {
      switch (cefr) {
        case 'C2': return 'bg-violet-100 text-violet-800 border-violet-300';
        case 'C1': return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'B2': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
        case 'B1': return 'bg-green-100 text-green-800 border-green-300';
        case 'A2': return 'bg-amber-100 text-amber-800 border-amber-300';
        case 'A1': return 'bg-orange-100 text-orange-800 border-orange-300';
        default: return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 pb-20 lg:pb-6">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-gray-900">Writing Feedback</h1>
            <p className="text-sm text-gray-600 mt-1">{writingType === 'write_about_photo' ? 'Write About Photo' : 'Writing Practice'}</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Overall Score */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Overall Score</h2>
                {feedback.cefr && (
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold border ${getCefrBadgeColor(feedback.cefr)}`}>
                    CEFR Level: {feedback.cefr}
                  </span>
                )}
              </div>
              <div className={`text-5xl font-bold ${getScoreColor(feedback.overall)}`}>
                {feedback.overall}/100
              </div>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Assessment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Task Achievement</span>
                  <span className={`font-bold ${getScoreColor(feedback.task_achievement)}`}>{feedback.task_achievement}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: `${feedback.task_achievement}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Coherence & Cohesion</span>
                  <span className={`font-bold ${getScoreColor(feedback.coherence)}`}>{feedback.coherence}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: `${feedback.coherence}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Lexical Resource</span>
                  <span className={`font-bold ${getScoreColor(feedback.lexical_resource)}`}>{feedback.lexical_resource}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: `${feedback.lexical_resource}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Grammar & Accuracy</span>
                  <span className={`font-bold ${getScoreColor(feedback.grammar)}`}>{feedback.grammar}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{ width: `${feedback.grammar}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Strengths
              </h3>
              <ul className="space-y-2">
                {feedback.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-green-800">
                    <span className="text-green-600 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {feedback.improvements && feedback.improvements.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {feedback.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-amber-800">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Grammar Issues */}
          {feedback.grammarIssues && feedback.grammarIssues.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Grammar Corrections</h3>
              <div className="space-y-4">
                {feedback.grammarIssues.map((issue, idx) => (
                  <div key={idx} className="border-l-4 border-red-500 pl-4">
                    <div className="text-sm text-gray-600 mb-1">Before:</div>
                    <div className="text-red-700 mb-2 line-through">{issue.before}</div>
                    <div className="text-sm text-gray-600 mb-1">After:</div>
                    <div className="text-green-700 font-medium mb-2">{issue.after}</div>
                    <div className="text-sm text-gray-700 italic">{issue.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Tips */}
          {feedback.actionable_tips && feedback.actionable_tips.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Tips for Next Time
              </h3>
              <ul className="space-y-2">
                {feedback.actionable_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-800">
                    <span className="text-blue-600 mt-1">{idx + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step-specific feedback for Interactive Writing */}
          {writingType === 'interactive_writing' && (feedback.step1Feedback || feedback.step2Feedback) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Part-by-Part Feedback</h3>

              {/* Step 1 Feedback */}
              {feedback.step1Feedback && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">Part 1 Response</h4>
                  {feedback.step1Feedback.strengths && feedback.step1Feedback.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-green-800 mb-1">Strengths:</p>
                      <ul className="space-y-1">
                        {feedback.step1Feedback.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-green-700 text-sm">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {feedback.step1Feedback.improvements && feedback.step1Feedback.improvements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">Areas for Improvement:</p>
                      <ul className="space-y-1">
                        {feedback.step1Feedback.improvements.map((improvement, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-amber-700 text-sm">
                            <span className="text-amber-600 mt-1">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 Feedback */}
              {feedback.step2Feedback && (
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Part 2 Response</h4>
                  {feedback.step2Feedback.strengths && feedback.step2Feedback.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-green-800 mb-1">Strengths:</p>
                      <ul className="space-y-1">
                        {feedback.step2Feedback.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-green-700 text-sm">
                            <span className="text-green-600 mt-1">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {feedback.step2Feedback.improvements && feedback.step2Feedback.improvements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-800 mb-1">Areas for Improvement:</p>
                      <ul className="space-y-1">
                        {feedback.step2Feedback.improvements.map((improvement, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-amber-700 text-sm">
                            <span className="text-amber-600 mt-1">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Your Writing */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Writing</h3>

            {writingType === 'interactive_writing' && step1Text ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Part 1:</h4>
                  <div className="prose max-w-none bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{step1Text}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Part 2:</h4>
                  <div className="prose max-w-none bg-gray-50 p-4 rounded border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{writingText}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose max-w-none bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{writingText}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/app')}
              className="flex-1 px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors duration-200"
            >
              Back to Homescreen
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Try Another Question
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Prompt Input Phase for Custom Writing
  if (phase === 'prompt_input') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-gray-900">Custom Prompt</h1>
            <p className="text-sm text-gray-600 mt-1">Enter your custom writing prompt</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Custom Prompt</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter a writing prompt below. You&apos;ll have 20 seconds to prepare, then you can start writing.
              </p>
              <textarea
                ref={promptInputRef}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-gray-900"
                placeholder="Example: Describe your favorite childhood memory and explain why it's important to you..."
                autoFocus
                spellCheck={false}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => router.push('/app/writing')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartCustomWriting}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={!customPrompt.trim()}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {writingType === 'writing_sample' && 'Writing Sample'}
              {writingType === 'interactive_writing' && 'Interactive Writing'}
              {writingType === 'write_about_photo' && 'Write About Photo'}
              {writingType === 'custom_writing' && 'Custom Prompt'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">{getPhaseInstructions()}</p>
          </div>
          <div className="flex items-center gap-4">
            {phase === 'prep' && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Prep Time</div>
                <div className="text-2xl font-bold text-amber-600">{formatTime(prepTimeLeft)}</div>
              </div>
            )}
            {(phase === 'write' || phase === 'step2') && (
              <div className="text-right">
                <div className="text-sm text-gray-600">Time Left</div>
                <div className={`text-2xl font-bold ${timeLeft < 30 ? 'text-red-600' : 'text-amber-600'}`}>
                  {formatTime(timeLeft)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Prompt Display */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Prompt</h2>
            <p className="text-gray-700 leading-relaxed">{getPrompt()}</p>

            {/* Show image if it's write_about_photo type */}
            {writingType === 'write_about_photo' && question.image_url && (
              <div className="mt-4 relative w-full h-64 rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={question.image_url}
                  alt="Writing prompt image"
                  fill
                  className="object-contain"
                />
              </div>
            )}
          </div>

          {/* Show step 1 text in step 2 */}
          {phase === 'step2' && step1Text && (
            <div className="bg-gray-100 rounded-lg p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Previous Response:</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{step1Text}</p>
            </div>
          )}

          {/* Writing Area */}
          {(phase === 'write' || phase === 'step2') && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Your Response</h2>
                <div className="text-sm text-gray-600">
                  {writingText.trim().split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
                className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-gray-900"
                placeholder="Start writing here..."
                spellCheck={false}
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => router.push('/app/writing')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {writingType === 'interactive_writing' && phase === 'write' ? 'Continue' : 'Submit'}
                </button>
              </div>
            </div>
          )}

          {/* Prep Phase - Show prompt only */}
          {phase === 'prep' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <div className="text-6xl font-bold text-amber-600 mb-2">{prepTimeLeft}</div>
              <p className="text-amber-800">Preparing to write...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
