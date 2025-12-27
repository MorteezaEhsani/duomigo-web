'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface WhatsAppAudioPlayerProps {
  audioUrl?: string;
  onFetchAudio?: () => Promise<Blob>;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onAudioEnded?: () => void;
  onDurationReady?: (duration: number) => void;
  variant?: 'received' | 'sent';
  autoPlay?: boolean;
  showTapHint?: boolean;
}

export default function WhatsAppAudioPlayer({
  audioUrl,
  onFetchAudio,
  onPlayStateChange,
  onAudioEnded,
  onDurationReady,
  variant = 'received',
  autoPlay = false,
  showTapHint = true
}: WhatsAppAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(!!onFetchAudio); // Start in preloading state if we need to fetch
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasPlayed, setHasPlayed] = useState(false); // Track if audio has been played at least once
  const needsInteraction = showTapHint && !hasPlayed && !isPlaying && !isLoading && !isPreloading; // Show tap hint when ready
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(audioUrl || null);

  // Waveform bars - simulated pattern (WhatsApp uses actual audio analysis)
  const waveformBars = [
    0.3, 0.5, 0.4, 0.7, 0.5, 0.8, 0.6, 0.9, 0.5, 0.7,
    0.4, 0.6, 0.8, 0.5, 0.7, 0.9, 0.6, 0.4, 0.7, 0.5,
    0.8, 0.6, 0.5, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.6,
    0.7, 0.5, 0.8, 0.4, 0.6, 0.7, 0.5, 0.4, 0.3, 0.5
  ];

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanupAudio = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  // Cleanup on unmount only - don't cleanup when localAudioUrl changes
  // as that would wipe out the preloaded audio element
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Track and cleanup blob URLs separately
  const prevLocalAudioUrlRef = useRef<string | null>(null);
  useEffect(() => {
    // Revoke the previous URL when it changes (not the current one)
    if (prevLocalAudioUrlRef.current && prevLocalAudioUrlRef.current !== audioUrl) {
      URL.revokeObjectURL(prevLocalAudioUrlRef.current);
    }
    prevLocalAudioUrlRef.current = localAudioUrl;

    // Cleanup on unmount
    return () => {
      if (localAudioUrl && localAudioUrl !== audioUrl) {
        URL.revokeObjectURL(localAudioUrl);
      }
    };
  }, [localAudioUrl, audioUrl]);

  // Preload audio on mount so it's ready for immediate playback
  const preloadStarted = useRef(false);
  useEffect(() => {
    if (!onFetchAudio || localAudioUrl || preloadStarted.current) return;

    preloadStarted.current = true;

    const preloadAudio = async () => {
      try {
        const blob = await onFetchAudio();
        const url = URL.createObjectURL(blob);
        setLocalAudioUrl(url);

        // Pre-create audio element
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = url;
        audioRef.current = audio;

        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
          onDurationReady?.(audio.duration);
        };

        // Wait for audio to be ready
        audio.oncanplaythrough = () => {
          setIsPreloading(false);
        };

        // Handle error during preload
        audio.onerror = () => {
          setIsPreloading(false);
        };
      } catch (e) {
        console.error('Failed to preload audio:', e);
        setIsPreloading(false);
      }
    };

    preloadAudio();
  }, [onFetchAudio, localAudioUrl]);

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 50);
  }, []);

  const handlePlayPause = async () => {
    // Prevent multiple clicks while loading
    if (isLoading) return;

    // If already playing, pause
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    // If we have a preloaded audio element, play it directly
    if (audioRef.current && audioRef.current.src) {
      // Set up event handlers if not already set
      if (!audioRef.current.onplay) {
        audioRef.current.onplay = () => {
          setIsPlaying(true);
          setHasPlayed(true);
          setIsLoading(false);
          onPlayStateChange?.(true);
          startProgressTracking();
        };
        audioRef.current.onpause = () => {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        };
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          onPlayStateChange?.(false);
          onAudioEnded?.();
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
        };
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
          onPlayStateChange?.(false);
        };
      }

      try {
        await audioRef.current.play();
        return;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        console.error('Failed to play audio:', e);
      }
    }

    // Need to load audio first
    setIsLoading(true);

    try {
      let url = localAudioUrl;

      // If we need to fetch audio
      if (!url && onFetchAudio) {
        const blob = await onFetchAudio();
        url = URL.createObjectURL(blob);
        setLocalAudioUrl(url);
      }

      if (!url) {
        throw new Error('No audio URL available');
      }

      // Create new audio element
      cleanupAudio();

      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        onDurationReady?.(audio.duration);
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setHasPlayed(true);
        setIsLoading(false);
        onPlayStateChange?.(true);
        startProgressTracking();
      };

      audio.onpause = () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onPlayStateChange?.(false);
        onAudioEnded?.();
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        onPlayStateChange?.(false);
      };

      audio.src = url;
      audio.playbackRate = playbackRate;

      // Try to play - this may fail on first tap due to browser restrictions
      // but the audio will be ready for the second tap
      audio.play().catch(() => {
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlaybackRateChange = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const isSent = variant === 'sent';
  const bgColor = isSent ? 'bg-blue-50' : 'bg-white';
  const playBtnColor = 'text-blue-500';
  const waveformActiveColor = 'bg-blue-500';
  const waveformInactiveColor = isSent ? 'bg-blue-200' : 'bg-blue-200';

  return (
    <div className={`${bgColor} rounded-2xl rounded-tl-none px-3 py-2 min-w-[200px] max-w-[280px] shadow-sm border border-gray-200`}>
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading || isPreloading}
          className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${playBtnColor} hover:opacity-80 transition-opacity ${
            needsInteraction ? 'animate-pulse' : ''
          }`}
        >
          {/* Pulsing ring for tap-to-play state */}
          {needsInteraction && (
            <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          )}
          {isLoading || isPreloading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform and Progress */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Waveform */}
          <div
            className="relative h-6 flex items-center gap-[2px] cursor-pointer"
            onClick={handleSeek}
          >
            {waveformBars.map((height, index) => {
              const barProgress = (index / waveformBars.length) * 100;
              const isActive = barProgress < progress;
              return (
                <div
                  key={index}
                  className={`w-[3px] rounded-full transition-colors duration-150 ${
                    isActive ? waveformActiveColor : waveformInactiveColor
                  }`}
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            {needsInteraction ? (
              <span className="text-blue-500 font-medium">Tap to play</span>
            ) : (
              <span>{formatTime(isPlaying ? currentTime : duration)}</span>
            )}
            {/* Playback Speed */}
            <button
              onClick={handlePlaybackRateChange}
              className="px-1.5 py-0.5 rounded bg-gray-200/60 text-gray-600 text-[10px] font-medium hover:bg-gray-200 transition-colors"
            >
              {playbackRate}×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
