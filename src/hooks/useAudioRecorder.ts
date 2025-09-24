'use client';

import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  maxDuration?: number; // in seconds
}

export function useAudioRecorder({ 
  onRecordingComplete, 
  maxDuration = 90 
}: UseAudioRecorderProps = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check for MediaRecorder support
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder not supported on this device');
      }

      // Mobile-friendly audio constraints
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Remove sampleRate constraint for mobile compatibility
          ...(typeof window !== 'undefined' && !navigator.userAgent.match(/iPhone|iPad|iPod|Android/i) && {
            sampleRate: 44100,
          })
        }
      };

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);

      // Determine the best mime type for the device
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        } else {
          // Fallback - let browser choose
          mimeType = '';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        onRecordingComplete?.(blob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log(`Max duration (${maxDuration}s) reached, auto-stopping recording`);
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
          }
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 100);

    } catch (err) {
      console.error('Error starting recording:', err);
      let errorMessage = 'Failed to start recording';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (err.name === 'NotSupportedError' || err.message.includes('not supported')) {
          errorMessage = 'Audio recording not supported on this device/browser. Try using Chrome or Safari.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Microphone is being used by another app. Please close other apps and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    }
  }, [maxDuration, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isRecording, isPaused]);

  const resetRecording = useCallback(() => {
    stopRecording();
    setRecordingTime(0);
    setAudioURL(null);
    setError(null);
    chunksRef.current = [];
  }, [stopRecording]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    audioURL,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}