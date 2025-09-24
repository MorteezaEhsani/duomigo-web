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
      console.log('Recording complete, blob size:', blob.size, 'type:', blob.type);

      if (!blob || blob.size === 0) {
        throw new Error('Recording is empty - please try again');
      }

      // Generate attempt ID
      const attemptId = crypto.randomUUID();

      // Determine the file extension based on blob type
      const fileExtension = blob.type.includes('mp4') ? 'mp4' :
                           blob.type.includes('aac') ? 'aac' :
                           blob.type.includes('wav') ? 'wav' : 'webm';

      // Upload audio to storage
      const formData = new FormData();
      formData.append('audio', blob, `recording.${fileExtension}`);
      formData.append('attemptId', attemptId);

      console.log('Uploading audio to /api/upload-audio...');
      const uploadResponse = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Failed to upload audio: ${uploadResponse.status}`);
      }

      const { audioUrl } = await uploadResponse.json();
      console.log('Audio uploaded successfully:', audioUrl);

      // Create attempt record
      const isTemporarySession = sessionId.startsWith('temp_');
      let actualSessionId = sessionId;

      // If it's a temporary session, create a real practice session now
      if (isTemporarySession) {
        const { data: newSession, error: sessionError } = await supabase
          .from('practice_sessions')
          .insert({
            user_id: supabaseUserId,
            started_at: new Date().toISOString(),
            ended_at: null // Will be updated when grading completes
          })
          .select()
          .single();

        if (sessionError || !newSession) {
          console.error('Error creating practice session:', sessionError);
          throw new Error('Failed to create practice session');
        }

        actualSessionId = newSession.id;
        console.log('Created new practice session:', actualSessionId);
      }

      console.log('Question details:', {
        id: question.id,
        type: question.type,
        prompt: question.prompt?.substring(0, 100) // First 100 chars
      });

      // Build the insert object
      const attemptData = {
        id: attemptId,
        session_id: actualSessionId,
        question_id: question.id,
        user_id: supabaseUserId,
        type_id: question.type,
        prompt_text: question.prompt || '',
        audio_url: audioUrl,
        transcript: null, // Will be filled by grading
        score: null, // Will be filled by grading
        feedback: null, // Will be filled by grading
        attempted_at: new Date().toISOString()
      };

      console.log('Inserting attempt with data:', attemptData);

      const { error: attemptError } = await supabase
        .from('attempts')
        .insert(attemptData);

      if (attemptError) {
        console.error('Attempt insert error:', JSON.stringify(attemptError, null, 2));
        console.error('Attempt insert error details:', {
          message: attemptError.message,
          code: attemptError.code,
          details: attemptError.details,
          hint: attemptError.hint
        });
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('empty')) {
        toast.error('Recording was empty. Please try recording again.');
      } else if (errorMessage.includes('upload')) {
        toast.error('Failed to upload audio. Please check your connection and try again.');
      } else if (errorMessage.includes('Unauthorized')) {
        toast.error('Session expired. Please sign in again.');
        router.push('/sign-in');
        return;
      } else {
        toast.error(`Failed to submit: ${errorMessage}`);
      }

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
    setTimeout(async () => {
      try {
        await startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
        // Show the error from useAudioRecorder hook, it has better mobile-specific messages
      }
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

      // Create and play new audio - mobile-friendly approach
      audioRef.current = new Audio();

      // Set properties before setting src (important for mobile)
      audioRef.current.preload = 'auto';
      // Critical for iOS - playsInline is not in TypeScript definitions but is a valid property
      (audioRef.current as HTMLAudioElement & { playsInline: boolean }).playsInline = true;

      audioRef.current.onended = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.onerror = (_e) => {
        // Only show error if component is still mounted and it's a real error
        if (isMountedRef.current && audioRef.current?.error?.code !== 4) { // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (happens during cleanup)
          toast.error('Audio playback failed - try tapping the play button again');
        }
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
        URL.revokeObjectURL(audioUrl);
      };

      // Set source after event handlers are attached
      audioRef.current.src = audioUrl;

      // Load the audio first, then play (important for mobile)
      audioRef.current.load();

      try {
        await audioRef.current.play();
        // Audio played successfully, mark as loaded and start timer
        if (!audioLoaded) {
          console.log('Audio played successfully, starting prep timer with', question.prep_seconds || 20, 'seconds');
          setAudioLoaded(true);
          setPrepStarted(true);
        }
      } catch (playError) {
        console.log('Auto-play failed, user interaction required:', playError);
        // On mobile, we often need user interaction - show a user-friendly message
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          toast.info('Click the play button to hear the audio prompt');
          // Don't start timer until audio is played
          setIsPlaying(false);
          return; // Don't throw error, just show message
        }
        throw playError;
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
          const feedbackObj = attempt.feedback_json && typeof attempt.feedback_json === 'object'
            ? attempt.feedback_json as Record<string, unknown>
            : {};

          setFeedback({
            overall: (attempt.overall_score || 0) * 20, // Convert 0-5 to 0-100
            fluency: (attempt.fluency_score || 0) * 20, // Convert 0-5 to 0-100
            pronunciation: (attempt.pronunciation_score || 0) * 20, // Convert 0-5 to 0-100
            grammar: (attempt.grammar_score || 0) * 20, // Convert 0-5 to 0-100
            vocabulary: (attempt.vocabulary_score || 0) * 20, // Convert 0-5 to 0-100
            coherence: (attempt.coherence_score || 0) * 20, // Convert 0-5 to 0-100
            task: (feedbackObj.task as number) || 0,
            strengths: (feedbackObj.strengths as string) || '',
            improvements: (feedbackObj.improvements as string) || '',
            actionable_tips: (feedbackObj.actionable_tips as string[]) || [],
            grammarIssues: (feedbackObj.grammarIssues as Array<{ before: string; after: string; explanation: string }>) || [],
            transcript: attempt.transcript || (feedbackObj.transcript as string),
            metrics: feedbackObj.metrics as { durationSec: number; wordsPerMinute: number; fillerPerMin: number; typeTokenRatio: number; fillerCount: number; wordCount: number } | undefined,
            cefr: feedbackObj.cefr as string,
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
      // Always try to auto-play first
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
      <div className="h-screen bg-gray-50 p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 flex flex-col overflow-y-auto max-h-full">
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              Get Ready
            </h2>
            {question.type === 'listen_then_speak' && !audioLoaded ? (
              <div>
                <div className="text-lg text-gray-600 mb-2">
                  {isPlaying ? 'Loading audio...' : 'Please play the audio'}
                </div>
                <p className="text-sm text-gray-500">Timer will start after audio plays</p>
              </div>
            ) : (
              <>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-amber-500">
                  {formatTime(prepTimeLeft)}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">Preparation time</p>
              </>
            )}
          </div>

          <div className="mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {question.type === 'read_then_speak' ? 'Speak about the prompt below:' : 'Your Task:'}
            </h3>
            {question.type !== 'read_then_speak' && (
              <p className="text-gray-700 text-sm sm:text-base lg:text-lg">{question.prompt}</p>
            )}
          </div>

          {question.type === 'listen_then_speak' && (
            <div className="flex flex-col items-center mb-6">
              <button
                onClick={handlePlayAudio}
                disabled={isPlaying}
                className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-2 mb-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isPlaying ? 'Playing...' : 'Play Audio'}
              </button>
              {!audioLoaded && (
                <p className="text-xs sm:text-sm text-gray-500 text-center">
                  {isPlaying ? '🔊 Loading audio...' : '👆 Click to play the audio prompt'}
                </p>
              )}
            </div>
          )}

          {question.type === 'speak_about_photo' && question.image_url && (
            <div className="mb-3 sm:mb-4 flex-shrink">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Image
                  src={question.image_url}
                  alt="Describe this image"
                  width={400}
                  height={400}
                  className="w-full h-auto max-h-[200px] sm:max-h-[300px] md:max-h-[350px] object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {question.type === 'read_then_speak' && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <p className="text-xl leading-relaxed text-gray-800">{question.prompt}</p>
            </div>
          )}

          <div className="flex justify-center gap-4 mt-auto">
            <button
              onClick={handleSkipPrep}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center gap-2 text-sm sm:text-base"
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
      <div className="h-screen bg-gray-50 p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 flex flex-col overflow-y-auto max-h-full">
          <div className="text-center mb-3 sm:mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 mb-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-red-500 animate-pulse" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              Recording...
            </h2>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-red-600">
              {formatTime(recordingTime)}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {timeRemaining > 0 ? `${timeRemaining}s remaining` : 'Maximum time reached'}
            </p>
          </div>

          <div className="mb-3 bg-gray-50 p-2 sm:p-3 rounded-lg">
            {question.type === 'read_then_speak' ? (
              <>
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Prompt:</h4>
                <p className="text-gray-800 text-sm sm:text-base">{question.prompt}</p>
              </>
            ) : (
              <p className="text-gray-700 text-xs sm:text-sm">{question.prompt}</p>
            )}
            {question.type === 'listen_then_speak' && (
              <button
                onClick={handlePlayAudio}
                disabled={isPlaying}
                className="mt-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors text-xs sm:text-sm flex items-center gap-2"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isPlaying ? 'Playing...' : 'Replay Audio'}
              </button>
            )}
          </div>

          {question.type === 'speak_about_photo' && question.image_url && (
            <div className="mb-3 flex-shrink">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Image
                  src={question.image_url}
                  alt="Describe this image"
                  width={320}
                  height={320}
                  className="w-full max-h-[150px] sm:max-h-[200px] md:max-h-[250px] object-contain rounded"
                />
              </div>
            </div>
          )}

          <div className="space-y-2 mb-3">
            <div className="bg-gray-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-1000"
                style={{ width: `${(recordingTime / question.max_seconds) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-xs sm:text-sm text-gray-600">
              <span>Min: {question.min_seconds}s</span>
              <span>Max: {question.max_seconds}s</span>
            </div>
          </div>

          <div className="flex justify-center mt-auto">
            <button
              onClick={handleFinishRecording}
              disabled={!canFinish || !isRecording}
              className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                canFinish
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canFinish ? 'Finish Recording' : `Speak for ${question.min_seconds - recordingTime}s more`}
            </button>
          </div>

          {canFinish && (
            <div className="mt-2 text-center text-xs sm:text-sm text-gray-500">
              <p>Press <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded text-xs">Space</kbd> to finish</p>
            </div>
          )}

          {recordError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
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
      <div className="h-screen bg-gray-50 p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 flex flex-col overflow-y-auto max-h-full">
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
      <div className="h-screen bg-gray-50 p-2 sm:p-4 md:p-6 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-lg p-3 sm:p-4 md:p-6 flex flex-col overflow-y-auto max-h-full">
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