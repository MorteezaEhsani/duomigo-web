'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { supabase } from '@/lib/supabase/client';
import FeedbackCard from '@/components/FeedbackCard';

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

interface PracticeRunnerProps {
  question: Question;
  sessionId: string;
  supabaseUserId: string;
}

type Phase = 'prep' | 'record' | 'processing' | 'complete' | 'feedback';

interface Feedback {
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
}

export default function PracticeRunner({ 
  question, 
  sessionId, 
  supabaseUserId 
}: PracticeRunnerProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('prep');
  const [prepTimeLeft, setPrepTimeLeft] = useState(question.prep_seconds || 20);
  const [isPlaying, setIsPlaying] = useState(false);
  const [_processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [_prepStarted, setPrepStarted] = useState(false);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    setPhase('processing');
    setProcessing(true);

    try {
      // Generate attempt ID
      const attemptId = crypto.randomUUID();

      // Upload audio to storage
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('attemptId', attemptId);

      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio');
      }

      const { audioUrl } = await uploadResponse.json();

      // Create attempt record
      const { error: attemptError } = await supabase
        .from('attempts')
        .insert({
          id: attemptId,
          session_id: sessionId,
          question_id: question.id,
          user_id: supabaseUserId,
          type_id: question.type,
          prompt_text: question.prompt,
          audio_url: audioUrl,
          transcript: null, // Will be filled by grading
          score: null, // Will be filled by grading
          feedback: null, // Will be filled by grading
          attempted_at: new Date().toISOString()
        });

      if (attemptError) {
        throw attemptError;
      }

      // Update daily activity
      await fetch('/api/activity/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 1 })
      });

      // Trigger grading
      try {
        console.log('Starting grading for attempt:', attemptId);
        const gradeResponse = await fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId })
        });

        if (gradeResponse.ok) {
          const gradeData = await gradeResponse.json();
          console.log('Grading response:', gradeData);

          const gradingFeedback = gradeData.feedback;
          if (!gradingFeedback) {
            throw new Error('No feedback in grading response');
          }

          // Store feedback in state
          const feedbackData = {
            overall: gradingFeedback.overall || 0,
            fluency: gradingFeedback.fluency || 0,
            pronunciation: gradingFeedback.pronunciation || 0,
            grammar: gradingFeedback.grammar || 0,
            vocabulary: gradingFeedback.vocabulary || 0,
            coherence: gradingFeedback.coherence || 0,
            task: gradingFeedback.task,
            strengths: gradingFeedback.strengths || '',
            improvements: gradingFeedback.improvements || '',
            actionable_tips: gradingFeedback.actionable_tips || [],
            grammarIssues: gradingFeedback.grammarIssues || [],
            transcript: gradingFeedback.transcript,
            metrics: gradingFeedback.metrics,
            cefr: gradingFeedback.cefr,
          };

          console.log('Setting feedback:', feedbackData);
          setFeedback(feedbackData);
          setProcessing(false);
          setPhase('feedback');
          toast.success('Recording graded successfully!');
        } else {
          const errorText = await gradeResponse.text();
          console.error('Grading failed:', errorText);
          toast.warning('Recording submitted, but grading is pending');
          setProcessing(false);
          setPhase('complete');

          // Still redirect after delay if grading fails
          setTimeout(() => {
            router.push('/app');
          }, 3000);
        }
      } catch (err) {
        console.error('Error calling grade API:', err);
        toast.warning('Recording submitted, but grading is pending');
        setProcessing(false);
        setPhase('complete');

        setTimeout(() => {
          router.push('/app');
        }, 3000);
      }

    } catch (err) {
      console.error('Error processing recording:', err);
      toast.error('Failed to submit recording');
      setProcessing(false);
      setPhase('record');
    }
  }, [sessionId, question.id, question.type, question.prompt, supabaseUserId, router]);

  const {
    isRecording,
    recordingTime,
    audioURL: _audioURL,
    error: recordError,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    maxDuration: question.max_seconds,
    onRecordingComplete: handleRecordingComplete
  });

  // Monitor recording state for auto-stop
  useEffect(() => {
    if (phase === 'record' && !isRecording && recordingTime >= question.max_seconds) {
      console.log('Recording auto-stopped at max duration');
      // Recording was auto-stopped, handleRecordingComplete will be called by the hook
    }
  }, [isRecording, recordingTime, phase, question.max_seconds]);

  const handlePrepComplete = useCallback(() => {
    setPhase('record');
    // Auto-start recording
    setTimeout(() => {
      startRecording();
    }, 500);
  }, [startRecording]);

  const handleSkipPrep = useCallback(() => {
    if (prepTimerRef.current) {
      clearTimeout(prepTimerRef.current);
    }
    setPrepTimeLeft(0);
    handlePrepComplete();
  }, [handlePrepComplete]);

  const handleFinishRecording = useCallback(() => {
    if (recordingTime < question.min_seconds) {
      toast.error(`Please speak for at least ${question.min_seconds} seconds`);
      return;
    }
    stopRecording();
  }, [recordingTime, question.min_seconds, stopRecording]);

  const handlePlayAudio = useCallback(async () => {
    if (question.type !== 'listen_then_speak') return;

    // Prevent multiple simultaneous plays
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      // Fetch audio from TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: question.prompt }),
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Failed to generate audio';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } else {
            // Response is not JSON (might be HTML error page)
            errorMessage = `TTS service error (${response.status})`;
          }
        } catch (e) {
          errorMessage = `TTS service error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      // Check if response is actually audio
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('audio')) {
        throw new Error('Invalid response from TTS service');
      }

      // Create audio blob and play it
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Clean up previous audio reference
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Create and play new audio
      audioRef.current = new Audio(audioUrl);

      audioRef.current.onended = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.onerror = (_e) => {
        // Only show error if component is still mounted and it's a real error
        if (isMountedRef.current && audioRef.current?.error?.code !== 4) { // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (happens during cleanup)
          toast.error('Audio playback failed - check your browser settings');
        }
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
        URL.revokeObjectURL(audioUrl);
      };

      await audioRef.current.play();

      // Mark audio as loaded and start prep timer
      if (!audioLoaded) {
        console.log('Audio loaded, starting prep timer with', question.prep_seconds || 20, 'seconds');
        setAudioLoaded(true);
        setPrepStarted(true);
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      const message = err instanceof Error ? err.message : 'Failed to play audio';
      toast.error(message);

      // If no API key, show helpful message
      if (message.includes('TTS service')) {
        toast.info('Tip: Add OPENAI_API_KEY to .env.local for text-to-speech');
      }

      setIsPlaying(false);
    }
  }, [question.type, question.prompt, question.prep_seconds, isPlaying, audioLoaded, isMountedRef]);

  const handleRetry = useCallback(() => {
    // Clean up any existing audio
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      try {
        audioRef.current.pause();
      } catch (e) {
        // Ignore errors during cleanup
      }
      audioRef.current.src = '';
      audioRef.current = null;
    }

    // Reset state for new attempt
    setPhase('prep');
    setPrepTimeLeft(question.prep_seconds || 20);
    setIsPlaying(false);
    setProcessing(false);
    setFeedback(null);
    setAudioLoaded(false);
  }, [question.prep_seconds]);

  // Prep timer - only starts after audio loads for listen_then_speak
  useEffect(() => {
    // For listen_then_speak, wait for audio to load first
    if (question.type === 'listen_then_speak' && !audioLoaded && phase === 'prep') {
      console.log('Waiting for audio to load before starting timer...');
      return; // Don't start timer yet
    }

    // For other types or after audio loads, start the timer
    if (phase === 'prep' && prepTimeLeft > 0) {
      console.log('Prep timer tick:', prepTimeLeft, 'seconds left');
      prepTimerRef.current = setTimeout(() => {
        setPrepTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (phase === 'prep' && prepTimeLeft === 0) {
      console.log('Prep time complete, moving to record phase');
      handlePrepComplete();
    }

    return () => {
      if (prepTimerRef.current) {
        clearTimeout(prepTimerRef.current);
      }
    };
  }, [phase, prepTimeLeft, audioLoaded, question.type, handlePrepComplete]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      if (audioRef.current) {
        // Remove event handlers first to prevent them from firing during cleanup
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onloadeddata = null;
        
        // Then pause and clean up
        try {
          audioRef.current.pause();
        } catch (e) {
          // Ignore errors during cleanup
        }
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Check for existing feedback on mount (but skip for custom prompts as they're always new)
  useEffect(() => {
    const checkExistingFeedback = async () => {
      // Skip checking for existing feedback for custom prompts
      // as each custom prompt creates a new question
      if (question.type === 'custom_prompt') {
        console.log('Skipping feedback check for custom prompt');
        return;
      }
      
      console.log('Checking for existing feedback:', {
        sessionId,
        questionId: question.id,
        userId: supabaseUserId
      });
      
      try {
        const { data: attempts } = await supabase
          .from('attempts')
          .select('feedback_json, overall_score, fluency_score, pronunciation_score, grammar_score, vocabulary_score, coherence_score, transcript')
          .eq('session_id', sessionId)
          .eq('question_id', question.id)
          .eq('user_id', supabaseUserId)  // Make sure we only get the current user's attempts
          .order('attempted_at', { ascending: false })
          .limit(1);

        console.log('Found attempts:', attempts);

        if (attempts && attempts.length > 0 && attempts[0].feedback_json) {
          const attempt = attempts[0];
          console.log('Loading existing feedback for attempt:', attempt);
          setFeedback({
            overall: (attempt.overall_score || 0) * 20, // Convert 0-5 to 0-100
            fluency: (attempt.fluency_score || 0) * 20, // Convert 0-5 to 0-100
            pronunciation: (attempt.pronunciation_score || 0) * 20, // Convert 0-5 to 0-100
            grammar: (attempt.grammar_score || 0) * 20, // Convert 0-5 to 0-100
            vocabulary: (attempt.vocabulary_score || 0) * 20, // Convert 0-5 to 0-100
            coherence: (attempt.coherence_score || 0) * 20, // Convert 0-5 to 0-100
            task: attempt.feedback_json.task,
            strengths: attempt.feedback_json.strengths || '',
            improvements: attempt.feedback_json.improvements || '',
            actionable_tips: attempt.feedback_json.actionable_tips || [],
            grammarIssues: attempt.feedback_json.grammarIssues || [],
            transcript: attempt.transcript || attempt.feedback_json.transcript,
            metrics: attempt.feedback_json.metrics,
            cefr: attempt.feedback_json.cefr,
          });
          setPhase('feedback');
        }
      } catch (error) {
        console.error('Error checking existing feedback:', error);
      }
    };

    checkExistingFeedback();
  }, [sessionId, question.id, supabaseUserId, question.type]);
  
  // Auto-load audio for listen_then_speak questions - separate effect to prevent double trigger
  useEffect(() => {
    if (question.type === 'listen_then_speak' && phase === 'prep' && !audioLoaded && !isPlaying) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        handlePlayAudio();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [question.type, phase, audioLoaded, isPlaying, handlePlayAudio]);


  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  // Keyboard shortcuts - moved here after function definitions
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          e.preventDefault();
          if (phase === 'prep') {
            handleSkipPrep();
          } else if (phase === 'record' && isRecording) {
            const canFinish = recordingTime >= question.min_seconds;
            if (canFinish) {
              handleFinishRecording();
            }
          }
          break;
        case 'n':
          if (phase === 'prep') {
            e.preventDefault();
            handleSkipPrep();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [phase, isRecording, recordingTime, question.min_seconds, handleSkipPrep, handleFinishRecording]);

  // Render prep phase
  if (phase === 'prep') {
    return (
      <div className="h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Get Ready
            </h2>
            {question.type === 'listen_then_speak' && !audioLoaded ? (
              <div>
                <div className="text-lg text-gray-600 mb-2">Loading audio...</div>
                <p className="text-sm text-gray-500">Timer will start after audio loads</p>
              </div>
            ) : (
              <>
                <div className="text-4xl font-mono font-bold text-amber-500">
                  {formatTime(prepTimeLeft)}
                </div>
                <p className="text-sm text-gray-600 mt-2">Preparation time</p>
              </>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {question.type === 'read_then_speak' ? 'Speak about the prompt below:' : 'Your Task:'}
            </h3>
            {question.type !== 'read_then_speak' && (
              <p className="text-gray-700 text-lg">{question.prompt}</p>
            )}
          </div>

          {question.type === 'listen_then_speak' && (
            <div className="flex justify-center mb-6">
              <button
                onClick={handlePlayAudio}
                disabled={isPlaying}
                className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isPlaying ? 'Playing...' : 'Play Audio'}
              </button>
            </div>
          )}

          {question.type === 'speak_about_photo' && question.image_url && (
            <div className="mb-6">
              <div className="bg-gray-100 p-4 rounded-lg">
                <Image
                  src={question.image_url}
                  alt="Describe this image"
                  width={400}
                  height={400}
                  className="w-full max-h-[400px] object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {question.type === 'read_then_speak' && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <p className="text-xl leading-relaxed text-gray-800">{question.prompt}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={handleSkipPrep}
              className="px-8 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center gap-2"
            >
              {question.type === 'speak_about_photo' ? (
                <>
                  Next
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              ) : (
                <>Skip to Recording →</>
              )}
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Press <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded">N</kbd> to continue</p>
          </div>
        </div>
      </div>
    );
  }

  // Render record phase
  if (phase === 'record') {
    const canFinish = recordingTime >= question.min_seconds;
    const timeRemaining = question.max_seconds - recordingTime;

    return (
      <div className="h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
              <div className="w-8 h-8 rounded-full bg-red-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Recording...
            </h2>
            <div className="text-4xl font-mono font-bold text-red-600">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {timeRemaining > 0 ? `${timeRemaining}s remaining` : 'Maximum time reached'}
            </p>
          </div>

          <div className="mb-8 bg-gray-50 p-4 rounded-lg">
            {question.type === 'read_then_speak' ? (
              <>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Prompt:</h4>
                <p className="text-gray-800 text-lg">{question.prompt}</p>
              </>
            ) : (
              <p className="text-gray-700">{question.prompt}</p>
            )}
            {question.type === 'listen_then_speak' && (
              <button
                onClick={handlePlayAudio}
                disabled={isPlaying}
                className="mt-3 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isPlaying ? 'Playing...' : 'Replay Audio'}
              </button>
            )}
          </div>

          {question.type === 'speak_about_photo' && question.image_url && (
            <div className="mb-6">
              <div className="bg-gray-100 p-3 rounded-lg">
                <Image
                  src={question.image_url}
                  alt="Describe this image"
                  width={320}
                  height={320}
                  className="w-full max-h-80 object-contain rounded"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-1000"
                style={{ width: `${(recordingTime / question.max_seconds) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between text-sm text-gray-600">
              <span>Min: {question.min_seconds}s</span>
              <span>Max: {question.max_seconds}s</span>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={handleFinishRecording}
              disabled={!canFinish || !isRecording}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                canFinish 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canFinish ? 'Finish Recording' : `Speak for ${question.min_seconds - recordingTime}s more`}
            </button>
          </div>

          {canFinish && (
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Press <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> to finish</p>
            </div>
          )}

          {recordError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {recordError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render processing phase
  if (phase === 'processing') {
    return (
      <div className="h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-4">
              <svg className="animate-spin h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing Your Recording
            </h2>
            <p className="text-gray-600">
              Uploading and analyzing your response...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render complete phase
  if (phase === 'complete') {
    return (
      <div className="h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Great Job!
            </h2>
            <p className="text-gray-600">
              Your recording has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render feedback phase
  if (phase === 'feedback' && feedback) {
    return <FeedbackCard feedback={feedback} onRetry={handleRetry} />;
  }

  return null;
}