'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import WhatsAppAudioPlayer from '@/components/WhatsAppAudioPlayer';

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

// Types for adaptive prompts (matching the types from lib/prompts/types.ts)
interface AdaptiveListenAndTypePrompt {
  type: 'listen_and_type';
  audioScript: string;
  hints?: string[];
  acceptableVariations?: string[];
}

interface AdaptiveConversationTurn {
  prompt: string;
  options: string[];
  correctOption: number;
  explanation?: string;
}

interface AdaptiveListenAndRespondPrompt {
  type: 'listen_and_respond';
  title: string;
  context: string;
  conversationTurns: AdaptiveConversationTurn[];
  summaryPrompt: string;
  expectedSummaryPoints: string[];
}

interface AdaptiveFillBlankQuestion {
  id: number;
  sentenceStart: string;
  sentenceEnd: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  hint?: string;
}

interface AdaptiveListenAndCompletePrompt {
  type: 'listen_and_complete';
  title: string;
  context: string;
  audioScript: string;
  questions: AdaptiveFillBlankQuestion[];
}

interface AdaptiveListenAndSummarizePrompt {
  type: 'listen_and_summarize';
  title: string;
  context: string;
  audioScript: string;
  expectedPoints: string[];
  wordCountGuideline: { min: number; max: number };
}

type AdaptivePromptData = AdaptiveListenAndTypePrompt | AdaptiveListenAndRespondPrompt | AdaptiveListenAndCompletePrompt | AdaptiveListenAndSummarizePrompt | null;

interface ListeningRunnerClientProps {
  question: Question;
  sessionId: string;
  supabaseUserId: string;
  listeningType: string;
  adaptivePromptData?: AdaptivePromptData;
}

type Phase = 'instructions' | 'listening' | 'answer' | 'conversation_turn' | 'summary' | 'processing' | 'feedback' | 'fill_blanks' | 'summarize_listen' | 'summarize_write';

interface QuestionResult {
  questionNumber: number;
  sentenceStart: string;
  sentenceEnd: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface Feedback {
  correct: boolean;
  score: number;
  userAnswer: string;
  correctAnswer: string;
  similarity?: number;
  differences?: string[];
  missedWords?: string[];
  extraWords?: string[];
  conversationTranscript?: string;
  summaryFeedback?: string;
  questionResults?: QuestionResult[];
}

interface ConversationTurn {
  prompt: string;
  options: string[];
  correctOption: number;
  userSelection?: number;
}

interface FillBlankQuestion {
  id: number;
  sentenceStart: string;
  sentenceEnd: string;
  correctAnswer: string;
  acceptableAnswers?: string[]; // Alternative correct answers
  userAnswer?: string;
  hint?: string;
}

interface ListeningScenario {
  title: string;
  context: string; // Brief context shown before listening
  audioScript: string; // The full script for TTS
  questions: FillBlankQuestion[];
}

export default function ListeningRunnerClient({
  question,
  sessionId,
  supabaseUserId,
  listeningType,
  adaptivePromptData
}: ListeningRunnerClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [userAnswer, setUserAnswer] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [playCount, setPlayCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to get initial conversation turns from adaptive data or fallback
  const getInitialConversationTurns = (): ConversationTurn[] => {
    if (adaptivePromptData?.type === 'listen_and_respond') {
      return adaptivePromptData.conversationTurns.map(turn => ({
        prompt: turn.prompt,
        options: turn.options,
        correctOption: turn.correctOption
      }));
    }
    // Fallback to default conversation
    return [
      {
        prompt: "Hi, I was wondering if you could help me with something.",
        options: ["Sure, what do you need?", "I'm busy right now.", "Where is the library?", "No, thanks."],
        correctOption: 0
      },
      {
        prompt: "I'm trying to find the library. Do you know where it is?",
        options: ["It's closed today.", "Yes, it's on the second floor, down the hall to your left.", "I don't go to the library.", "What time is it?"],
        correctOption: 1
      },
      {
        prompt: "Thank you so much! Is it open right now?",
        options: ["I think so, it should be open until 8 PM.", "I don't know what you mean.", "Libraries are usually quiet.", "Can you repeat that?"],
        correctOption: 0
      },
      {
        prompt: "Great! By the way, do they have computers available for students?",
        options: ["I'm not sure about that.", "Yes, there's a computer lab on the third floor with about 20 computers.", "Why do you need a computer?", "The library is very big."],
        correctOption: 1
      },
      {
        prompt: "Perfect! Do I need to reserve a computer in advance?",
        options: ["No, it's first come, first served, but it's usually not too busy.", "I never use computers.", "The library has many books.", "What class are you taking?"],
        correctOption: 0
      },
      {
        prompt: "That's really helpful. One last question - can I print documents there?",
        options: ["I don't know.", "Libraries are quiet places.", "Yes, there are printers in the computer lab. You'll need to add money to your student card first.", "Why don't you ask someone else?"],
        correctOption: 2
      }
    ];
  };

  // For listen_and_respond type
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>(getInitialConversationTurns);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [userSummary, setUserSummary] = useState('');
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [hasPlayedCurrentAudio, setHasPlayedCurrentAudio] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // Timer in seconds (null = not started)

  // Helper function to get initial scenario from adaptive data or fallback
  const getInitialScenario = (): ListeningScenario => {
    if (adaptivePromptData?.type === 'listen_and_complete') {
      return {
        title: adaptivePromptData.title,
        context: adaptivePromptData.context,
        audioScript: adaptivePromptData.audioScript,
        questions: adaptivePromptData.questions.map(q => ({
          id: q.id,
          sentenceStart: q.sentenceStart,
          sentenceEnd: q.sentenceEnd,
          correctAnswer: q.correctAnswer,
          acceptableAnswers: q.acceptableAnswers,
          hint: q.hint
        }))
      };
    }
    // Fallback to default scenario
    return {
      title: "Job Interview Preparation",
      context: "Listen to the scenario and complete the sentences based on what you hear.",
      audioScript: `In this scenario, you are preparing for a job interview at a marketing company. The position is for a Digital Marketing Specialist. The interview is scheduled for next Tuesday at 2 PM. The office is located on the fifth floor of the Greenwood Building, which is on Oak Street. You should bring three copies of your resume and a portfolio of your previous work. The hiring manager's name is Ms. Chen. She prefers candidates who have experience with social media campaigns. The salary range for this position is between fifty and sixty thousand dollars per year. If hired, you would start on the first of next month.`,
      questions: [
        { id: 1, sentenceStart: "The job position is for a", sentenceEnd: ".", correctAnswer: "Digital Marketing Specialist", acceptableAnswers: ["digital marketing specialist", "Digital Marketing Specialist"], hint: "Job title" },
        { id: 2, sentenceStart: "The interview is scheduled for next", sentenceEnd: ".", correctAnswer: "Tuesday", acceptableAnswers: ["tuesday", "Tuesday"], hint: "Day of the week" },
        { id: 3, sentenceStart: "The interview time is at", sentenceEnd: ".", correctAnswer: "2 PM", acceptableAnswers: ["2 PM", "2 pm", "2pm"], hint: "A time" },
        { id: 4, sentenceStart: "The office is on the", sentenceEnd: "floor.", correctAnswer: "fifth", acceptableAnswers: ["fifth", "5th"], hint: "A floor number" },
        { id: 5, sentenceStart: "The building is called the", sentenceEnd: "Building.", correctAnswer: "Greenwood", acceptableAnswers: ["Greenwood", "greenwood"], hint: "Building name" }
      ]
    };
  };

  // For listen_and_complete type
  const [scenario] = useState<ListeningScenario>(getInitialScenario);
  const [fillBlankAnswers, setFillBlankAnswers] = useState<Record<number, string>>({});
  const [scenarioPlayCount, setScenarioPlayCount] = useState(0);
  const [questionsRevealed, setQuestionsRevealed] = useState(false);
  const timerStartedRef = useRef(false);

  // Helper function to get initial summarize scenario from adaptive data or fallback
  const getInitialSummarizeScenario = () => {
    if (adaptivePromptData?.type === 'listen_and_summarize') {
      return {
        title: adaptivePromptData.title,
        context: adaptivePromptData.context,
        audioScript: adaptivePromptData.audioScript,
        expectedPoints: adaptivePromptData.expectedPoints
      };
    }
    // Fallback to default scenario
    return {
      title: "Community Garden Project",
      context: "Listen to the announcement and write a summary of the key points.",
      audioScript: `Good afternoon everyone, and thank you for joining this community meeting. Today I want to share some exciting news about our neighborhood's new community garden project. After months of planning and fundraising, we've finally secured a location for our garden. It will be located on the vacant lot at the corner of Oak Street and Maple Avenue. The city council approved our proposal last week, and we've received a grant of fifteen thousand dollars from the Green Spaces Foundation. The garden will have fifty individual plots available for residents. Each plot will be about ten feet by ten feet, which is enough space to grow a variety of vegetables and flowers. We're asking for an annual fee of just twenty-five dollars per plot to cover water and maintenance costs. We plan to break ground next month, in early April. We'll need volunteers to help prepare the soil, build raised beds, and install the irrigation system. If you're interested in volunteering, please sign up at the table near the entrance.`,
      expectedPoints: [
        "New community garden on Oak Street and Maple Avenue",
        "Received $15,000 grant from Green Spaces Foundation",
        "50 plots available, 10x10 feet each, $25 annual fee",
        "Breaking ground in April, need volunteers"
      ]
    };
  };

  // For listen_and_summarize type
  const [summarizeScenario] = useState(getInitialSummarizeScenario);
  const [summarizeText, setSummarizeText] = useState('');
  const [hasListenedToSummarize, setHasListenedToSummarize] = useState(false);
  const [summarizePlayCount, setSummarizePlayCount] = useState(0);
  const [summarizeAudioDuration, setSummarizeAudioDuration] = useState(0);
  const summarizeTimerStartedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

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
    };
  }, []);

  const handlePlayAudio = useCallback(async () => {
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
        let errorMessage = 'Failed to generate audio';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } else {
            errorMessage = `TTS service error (${response.status})`;
          }
        } catch (e) {
          errorMessage = `TTS service error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('audio')) {
        throw new Error('Invalid response from TTS service');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      (audioRef.current as HTMLAudioElement & { playsInline: boolean }).playsInline = true;

      audioRef.current.onplay = () => {
        if (isMountedRef.current) {
          setIsPlaying(true);
        }
      };

      audioRef.current.onpause = () => {
        if (isMountedRef.current && audioRef.current?.ended) {
          setIsPlaying(false);
        }
      };

      audioRef.current.onended = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
          setPlayCount(prev => prev + 1);
        }
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.onerror = (_e) => {
        if (isMountedRef.current && audioRef.current?.error?.code !== 4) {
          toast.error('Audio playback failed - try tapping the play button again');
        }
        if (isMountedRef.current) {
          setIsPlaying(false);
        }
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.src = audioUrl;
      audioRef.current.load();

      try {
        await audioRef.current.play();
      } catch (playError) {
        console.log('Auto-play failed, user interaction required:', playError);
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          toast.info('Click the play button to hear the audio');
          setIsPlaying(false);
          return;
        }
        throw playError;
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      const message = err instanceof Error ? err.message : 'Failed to play audio';
      toast.error(message);

      if (message.includes('TTS service')) {
        toast.info('Tip: Add OPENAI_API_KEY to .env.local for text-to-speech');
      }

      setIsPlaying(false);
    }
  }, [question.prompt, isPlaying]);

  const handleStartPractice = () => {
    if (listeningType === 'listen_and_respond') {
      setPhase('conversation_turn');
      setHasPlayedCurrentAudio(false);
      setTimeRemaining(300); // Start 5-minute timer
    } else if (listeningType === 'listen_and_complete') {
      setPhase('fill_blanks');
      // Timer starts when audio finishes loading/playing, not immediately
    } else if (listeningType === 'listen_and_summarize') {
      setPhase('summarize_listen');
      // Timer starts when audio finishes playing
    } else {
      setPhase('listening');
      // Auto-play audio after a short delay
      setTimeout(() => {
        handlePlayAudio();
      }, 500);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayConversationAudio = useCallback(async (turnIndex: number) => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const turn = conversationTurns[turnIndex];
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: turn.prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
      (audioRef.current as HTMLAudioElement & { playsInline: boolean }).playsInline = true;

      audioRef.current.onplay = () => {
        if (isMountedRef.current) {
          setIsPlaying(true);
        }
      };

      audioRef.current.onpause = () => {
        if (isMountedRef.current && audioRef.current?.ended) {
          setIsPlaying(false);
        }
      };

      audioRef.current.onended = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
          setHasPlayedCurrentAudio(true);
        }
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.onerror = () => {
        if (isMountedRef.current) {
          setIsPlaying(false);
          toast.error('Audio playback failed');
        }
        URL.revokeObjectURL(audioUrl);
      };

      audioRef.current.src = audioUrl;
      audioRef.current.load();

      try {
        await audioRef.current.play();
      } catch (playError) {
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          toast.info('Click the play button to hear the audio');
          setIsPlaying(false);
          return;
        }
        throw playError;
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      toast.error('Failed to play audio');
      setIsPlaying(false);
    }
  }, [isPlaying, conversationTurns]);

  const handleOptionSelect = useCallback((optionIndex: number) => {
    // Update the turn with user's selection
    const updatedTurns = [...conversationTurns];
    updatedTurns[currentTurnIndex].userSelection = optionIndex;
    setConversationTurns(updatedTurns);

    // Show feedback
    setShowingFeedback(true);

    // Wait 1.5 seconds to show feedback, then move to next turn or summary
    setTimeout(() => {
      setShowingFeedback(false);

      if (currentTurnIndex < conversationTurns.length - 1) {
        // Move to next turn
        setCurrentTurnIndex(currentTurnIndex + 1);
        setHasPlayedCurrentAudio(false); // Reset for next turn
      } else {
        // All turns complete, move to summary phase
        setPhase('summary');
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 100);
      }
    }, 1500);
  }, [currentTurnIndex, conversationTurns]);

  const handleContinueToAnswer = useCallback(() => {
    setPhase('answer');
    // Focus the textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  }, []);

  const analyzeFeedback = (userInput: string, correctText: string) => {
    // Normalize both strings
    const normalize = (s: string) => s.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    const userNormalized = normalize(userInput);
    const correctNormalized = normalize(correctText);

    // Calculate character-level Levenshtein distance
    const levenshteinDistance = (s1: string, s2: string): number => {
      const m = s1.length;
      const n = s2.length;
      const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (s1[i - 1] === s2[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
          } else {
            dp[i][j] = 1 + Math.min(
              dp[i - 1][j],     // deletion
              dp[i][j - 1],     // insertion
              dp[i - 1][j - 1]  // substitution
            );
          }
        }
      }

      return dp[m][n];
    };

    const distance = levenshteinDistance(userNormalized, correctNormalized);
    const maxLength = Math.max(userNormalized.length, correctNormalized.length);
    const similarity = maxLength === 0 ? 100 : Math.round((1 - distance / maxLength) * 100);

    // Word-level analysis
    const userWords = userNormalized.split(/\s+/).filter(w => w.length > 0);
    const correctWords = correctNormalized.split(/\s+/).filter(w => w.length > 0);

    const correctWordsSet = new Set(correctWords);
    const userWordsSet = new Set(userWords);

    const missedWords = correctWords.filter(word => !userWordsSet.has(word));
    const extraWords = userWords.filter(word => !correctWordsSet.has(word));

    // Find misspelled words (words that are similar but not exact)
    const misspellings: Array<{user: string; correct: string}> = [];

    // For each extra word, try to find a similar correct word
    extraWords.forEach(extraWord => {
      let bestMatch = '';
      let bestSimilarity = 0;

      missedWords.forEach(missedWord => {
        // Calculate similarity between the extra word and missed word
        const wordDistance = levenshteinDistance(extraWord, missedWord);
        const wordMaxLength = Math.max(extraWord.length, missedWord.length);
        const wordSimilarity = wordMaxLength === 0 ? 0 : (1 - wordDistance / wordMaxLength) * 100;

        // If similarity is high (>50%), it's likely a misspelling
        if (wordSimilarity > 50 && wordSimilarity > bestSimilarity) {
          bestMatch = missedWord;
          bestSimilarity = wordSimilarity;
        }
      });

      if (bestMatch) {
        misspellings.push({ user: extraWord, correct: bestMatch });
      }
    });

    // Remove misspelled words from missed/extra lists
    misspellings.forEach(({ user, correct }) => {
      const extraIndex = extraWords.indexOf(user);
      if (extraIndex > -1) extraWords.splice(extraIndex, 1);

      const missedIndex = missedWords.indexOf(correct);
      if (missedIndex > -1) missedWords.splice(missedIndex, 1);
    });

    // Generate difference highlights
    const differences: string[] = [];

    if (misspellings.length > 0) {
      misspellings.forEach(({ user, correct }) => {
        differences.push(`"${user}" should be "${correct}"`);
      });
    }

    if (missedWords.length > 0) {
      differences.push(`Missing words: ${missedWords.join(', ')}`);
    }

    if (extraWords.length > 0) {
      differences.push(`Extra words: ${extraWords.join(', ')}`);
    }

    // Check for word order differences
    if (missedWords.length === 0 && extraWords.length === 0 && misspellings.length === 0 && similarity < 100) {
      differences.push('Check word order and capitalization');
    }

    return {
      similarity,
      differences,
      missedWords,
      extraWords
    };
  };

  const handleSummarySubmit = useCallback(async (isTimeout = false) => {
    if (!userSummary.trim() && !isTimeout) {
      toast.error('Please write a summary before submitting');
      return;
    }

    setPhase('processing');

    try {
      // Calculate conversation accuracy
      let correctSelections = 0;
      let answeredTurns = 0;
      conversationTurns.forEach((turn) => {
        if (turn.userSelection !== undefined) {
          answeredTurns++;
          if (turn.userSelection === turn.correctOption) {
            correctSelections++;
          }
        }
      });
      const conversationScore = answeredTurns > 0
        ? Math.round((correctSelections / conversationTurns.length) * 100)
        : 0;

      // Build conversation transcript for reference
      const transcript = conversationTurns.map((turn, idx) => {
        const userChoice = turn.userSelection !== undefined ? turn.options[turn.userSelection] : 'No response';
        return `Turn ${idx + 1}:\nPrompt: "${turn.prompt}"\nYour response: "${userChoice}"`;
      }).join('\n\n');

      // Evaluate summary (simple length and keyword check for now)
      const summaryText = userSummary.trim();
      const summaryWords = summaryText ? summaryText.split(/\s+/).length : 0;
      const hasSummary = summaryWords >= 10 && summaryWords <= 100;
      const summaryScore = isTimeout && !summaryText ? 0 : (hasSummary ? 80 : 50); // 0 if timeout with no summary

      const overallScore = Math.round((conversationScore * 0.6) + (summaryScore * 0.4));
      const isCorrect = overallScore >= 80;

      let summaryFeedbackText: string;
      if (isTimeout && !summaryText) {
        summaryFeedbackText = `Time ran out. Answered ${answeredTurns}/${conversationTurns.length} turns. Conversation accuracy: ${conversationScore}%`;
      } else if (hasSummary) {
        summaryFeedbackText = `Good summary! Conversation accuracy: ${conversationScore}%`;
      } else {
        summaryFeedbackText = `Summary should be 10-100 words. Conversation accuracy: ${conversationScore}%`;
      }

      const feedbackData: Feedback = {
        correct: isCorrect,
        score: overallScore,
        userAnswer: summaryText || '(No summary provided - time ran out)',
        correctAnswer: 'Expected summary: A person asks for help finding the library and learns it is on the second floor and open until 8 PM. They also find out about the computer lab on the third floor with 20 computers available on a first-come basis, and that printing requires adding money to their student card.',
        conversationTranscript: transcript,
        summaryFeedback: summaryFeedbackText
      };

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

      // Submit attempt
      await fetch('/api/listening-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: actualSessionId,
          questionId: question.id,
          questionType: listeningType,
          userAnswer: summaryText || '(Time ran out)',
          correctAnswer: 'Conversation with library directions',
          isCorrect,
          score: overallScore
        })
      });

      // Update daily activity
      await fetch('/api/activity/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 2 })
      });

      setFeedback(feedbackData);
      setPhase('feedback');

    } catch (error) {
      console.error('Error submitting summary:', error);
      toast.error('Failed to submit summary. Please try again.');
      setPhase('summary');
    }
  }, [userSummary, conversationTurns, question.id, sessionId, listeningType]);

  const handleSubmit = useCallback(async () => {
    if (!userAnswer.trim()) {
      toast.error('Please type your answer before submitting');
      return;
    }

    setPhase('processing');

    try {
      const analysis = analyzeFeedback(userAnswer, question.prompt);
      const isCorrect = analysis.similarity >= 95; // 95% similarity threshold for "perfect"

      const feedbackData: Feedback = {
        correct: isCorrect,
        score: analysis.similarity,
        userAnswer: userAnswer.trim(),
        correctAnswer: question.prompt,
        similarity: analysis.similarity,
        differences: analysis.differences,
        missedWords: analysis.missedWords,
        extraWords: analysis.extraWords
      };

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

      // Submit attempt
      await fetch('/api/listening-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: actualSessionId,
          questionId: question.id,
          questionType: listeningType,
          userAnswer: userAnswer.trim(),
          correctAnswer: question.prompt,
          isCorrect,
          score: analysis.similarity
        })
      });

      // Update daily activity
      await fetch('/api/activity/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 1 })
      });

      setFeedback(feedbackData);
      setPhase('feedback');

    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer. Please try again.');
      setPhase('answer');
    }
  }, [userAnswer, question.id, question.prompt, sessionId, listeningType]);

  // Handler for fill-in-the-blank submission (listen_and_complete)
  const handleFillBlankSubmit = useCallback(async (isTimeout = false) => {
    // Check if at least some answers are provided
    const answeredCount = Object.keys(fillBlankAnswers).filter(k => fillBlankAnswers[parseInt(k)]?.trim()).length;
    if (answeredCount === 0 && !isTimeout) {
      toast.error('Please fill in at least one answer before submitting');
      return;
    }

    setPhase('processing');

    try {
      // Score each answer
      let correctCount = 0;
      const questionResultsData: QuestionResult[] = scenario.questions.map((q, idx) => {
        const userAnswerRaw = fillBlankAnswers[q.id] || '';
        const userAnswerLower = userAnswerRaw.trim().toLowerCase();
        const correctAnswers = [q.correctAnswer.toLowerCase(), ...(q.acceptableAnswers?.map(a => a.toLowerCase()) || [])];

        // Check for exact match or close match
        const isCorrectAnswer = correctAnswers.some(correct => {
          // Exact match
          if (userAnswerLower === correct) return true;
          // Close match (within 2 characters for longer answers)
          if (correct.length > 3) {
            const distance = levenshteinDistance(userAnswerLower, correct);
            return distance <= 2;
          }
          return false;
        });

        if (isCorrectAnswer) correctCount++;

        return {
          questionNumber: idx + 1,
          sentenceStart: q.sentenceStart,
          sentenceEnd: q.sentenceEnd,
          userAnswer: userAnswerRaw,
          correctAnswer: q.correctAnswer,
          isCorrect: isCorrectAnswer
        };
      });

      const overallScore = Math.round((correctCount / scenario.questions.length) * 100);
      const isCorrect = overallScore >= 80;

      const feedbackData: Feedback = {
        correct: isCorrect,
        score: overallScore,
        userAnswer: `${correctCount}/${scenario.questions.length} correct`,
        correctAnswer: scenario.questions.map(q => q.correctAnswer).join(', '),
        questionResults: questionResultsData,
        summaryFeedback: isTimeout && answeredCount < scenario.questions.length
          ? `Time ran out. You answered ${answeredCount}/${scenario.questions.length} questions.`
          : `You got ${correctCount} out of ${scenario.questions.length} correct.`
      };

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

      // Submit attempt
      await fetch('/api/listening-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: actualSessionId,
          questionId: question.id,
          questionType: listeningType,
          userAnswer: JSON.stringify(fillBlankAnswers),
          correctAnswer: JSON.stringify(scenario.questions.map(q => q.correctAnswer)),
          isCorrect,
          score: overallScore
        })
      });

      // Update daily activity
      await fetch('/api/activity/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 3 })
      });

      setFeedback(feedbackData);
      setPhase('feedback');

    } catch (error) {
      console.error('Error submitting fill-in-the-blank answers:', error);
      toast.error('Failed to submit answers. Please try again.');
      setPhase('fill_blanks');
    }
  }, [fillBlankAnswers, scenario, question.id, sessionId, listeningType]);

  // Helper function for Levenshtein distance (for fuzzy matching)
  const levenshteinDistance = (s1: string, s2: string): number => {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  };

  // Handler for listen_and_summarize submission
  const handleSummarizeSubmit = useCallback(async (isTimeout = false) => {
    const wordCount = summarizeText.trim().split(/\s+/).filter(w => w).length;
    if (wordCount < 20 && !isTimeout) {
      toast.error('Please write at least 20 words in your summary');
      return;
    }

    setPhase('processing');

    try {
      // Simple scoring based on word count and key point coverage
      const summaryLower = summarizeText.toLowerCase();
      let pointsFound = 0;
      const keyTerms = [
        ['garden', 'oak street', 'maple avenue', 'location'],
        ['grant', '15,000', 'fifteen thousand', 'foundation'],
        ['50', 'fifty', 'plots', '25', 'twenty-five', 'fee'],
        ['april', 'volunteers', 'break ground'],
        ['food bank', 'community area', 'donate'],
        ['workshop', 'education', 'composting', 'pest control'],
        ['registration', 'monday', 'priority', 'half-mile']
      ];

      keyTerms.forEach(terms => {
        if (terms.some(term => summaryLower.includes(term))) {
          pointsFound++;
        }
      });

      // Score based on points covered and reasonable length
      const coverageScore = Math.round((pointsFound / keyTerms.length) * 70);
      const lengthScore = Math.min(30, Math.round((wordCount / 100) * 30));
      const overallScore = Math.min(100, coverageScore + lengthScore);
      const isCorrect = overallScore >= 60;

      const feedbackData: Feedback = {
        correct: isCorrect,
        score: overallScore,
        userAnswer: summarizeText.trim(),
        correctAnswer: summarizeScenario.expectedPoints.join('\n• '),
        summaryFeedback: isTimeout
          ? `Time ran out. You wrote ${wordCount} words and covered ${pointsFound}/${keyTerms.length} key points.`
          : `You wrote ${wordCount} words and covered ${pointsFound}/${keyTerms.length} key points.`
      };

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

      // Submit attempt
      await fetch('/api/listening-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: actualSessionId,
          questionId: question.id,
          questionType: listeningType,
          userAnswer: summarizeText.trim(),
          correctAnswer: 'Summary of community garden announcement',
          isCorrect,
          score: overallScore
        })
      });

      // Update daily activity
      await fetch('/api/activity/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 4 })
      });

      setFeedback(feedbackData);
      setPhase('feedback');

    } catch (error) {
      console.error('Error submitting summary:', error);
      toast.error('Failed to submit summary. Please try again.');
      setPhase('summarize_write');
    }
  }, [summarizeText, summarizeScenario, question.id, sessionId, listeningType]);

  // Timer countdown for timed exercises
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef({ handleSummarySubmit, handleFillBlankSubmit, handleSummarizeSubmit });

  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = { handleSummarySubmit, handleFillBlankSubmit, handleSummarizeSubmit };
  }, [handleSummarySubmit, handleFillBlankSubmit, handleSummarizeSubmit]);

  const isTimerActive = timeRemaining !== null && timeRemaining > 0;

  useEffect(() => {
    // Clear existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (!isTimerActive) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          // Auto-submit when time runs out
          if (phase === 'conversation_turn' || phase === 'summary') {
            toast.error('Time is up! Submitting your answers...');
            handlersRef.current.handleSummarySubmit(true);
          } else if (phase === 'fill_blanks') {
            toast.error('Time is up! Submitting your answers...');
            handlersRef.current.handleFillBlankSubmit(true);
          } else if (phase === 'summarize_listen' || phase === 'summarize_write') {
            toast.error('Time is up! Submitting your summary...');
            handlersRef.current.handleSummarizeSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerActive, phase]); // Only restart when timer starts/stops or phase changes

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Enter to submit in answer phase
        if (e.key === 'Enter' && phase === 'answer' && userAnswer.trim()) {
          e.preventDefault();
          handleSubmit();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          e.preventDefault();
          if (phase === 'listening' && playCount > 0) {
            handleContinueToAnswer();
          }
          break;
        case 'n':
          if (phase === 'listening' && playCount > 0) {
            e.preventDefault();
            handleContinueToAnswer();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [phase, playCount, userAnswer, handleSubmit, handleContinueToAnswer]);

  const getPhaseTitle = () => {
    switch (phase) {
      case 'instructions':
        return 'Listen and Type';
      case 'listening':
        return 'Listen Carefully';
      case 'answer':
        return 'Type What You Heard';
      case 'processing':
        return 'Checking Your Answer';
      case 'feedback':
        return feedback?.correct ? 'Great Job!' : 'Keep Practicing!';
      default:
        return 'Listen and Type';
    }
  };

  const getInstructions = () => {
    return 'You will hear a statement. Listen carefully and type exactly what you hear. You can replay the audio up to 3 times.';
  };

  // Instructions phase - skip for now, go straight to listening
  if (phase === 'instructions') {
    // Auto-start
    handleStartPractice();
    return null;
  }

  // Fill-in-the-blank phase (for listen_and_complete)
  if (phase === 'fill_blanks') {
    const answeredCount = Object.keys(fillBlankAnswers).filter(k => fillBlankAnswers[parseInt(k)]?.trim()).length;
    const canSubmit = answeredCount >= Math.ceil(scenario.questions.length / 2); // At least half answered

    return (
      <div className="h-viewport bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-3 py-2 sm:px-6 sm:py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900">
                Listen and Complete
              </h2>
              <p className="text-xs text-gray-500">
                {answeredCount}/{scenario.questions.length} answered
              </p>
            </div>
            {timeRemaining !== null && (
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${
                timeRemaining <= 60
                  ? 'bg-red-100 text-red-700'
                  : timeRemaining <= 120
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs sm:text-sm font-semibold">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:p-6 pb-24 sm:pb-32">
          <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
            {/* Audio Player Card */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{scenario.title}</h3>
                  <p className="text-xs text-gray-500 truncate">{scenario.context}</p>
                </div>
              </div>
              <WhatsAppAudioPlayer
                key="scenario-audio"
                onFetchAudio={async () => {
                  const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: scenario.audioScript }),
                  });
                  if (!response.ok) throw new Error('Failed to fetch audio');
                  return response.blob();
                }}
                onPlayStateChange={(playing) => setIsPlaying(playing)}
                onAudioEnded={() => {
                  setScenarioPlayCount(prev => prev + 1);
                  if (!timerStartedRef.current) {
                    timerStartedRef.current = true;
                    setQuestionsRevealed(true);
                    setTimeRemaining(120); // Start 2-minute timer after first listen
                  }
                }}
                variant="received"
                autoPlay={false}
              />
              {scenarioPlayCount > 0 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Played {scenarioPlayCount} time{scenarioPlayCount > 1 ? 's' : ''} • Replay anytime
                </p>
              )}
              {!questionsRevealed && scenarioPlayCount === 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center font-medium">
                  Listen to the audio to reveal the questions
                </p>
              )}
            </div>

            {/* Questions - only shown after first audio play */}
            {questionsRevealed && scenario.questions.map((q, idx) => (
              <div
                key={q.id}
                className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 border-2 transition-colors ${
                  fillBlankAnswers[q.id]?.trim()
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                    fillBlankAnswers[q.id]?.trim()
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-xs sm:text-sm leading-relaxed flex flex-wrap items-baseline gap-x-1">
                      <span>{q.sentenceStart}</span>
                      <input
                        type="text"
                        value={fillBlankAnswers[q.id] || ''}
                        onChange={(e) => setFillBlankAnswers(prev => ({
                          ...prev,
                          [q.id]: e.target.value
                        }))}
                        placeholder="..."
                        className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 border-b-2 border-amber-400 bg-amber-50/50 focus:border-amber-600 focus:outline-none text-amber-700 font-medium text-xs sm:text-sm w-24 sm:w-32 md:w-40"
                      />
                      <span>{q.sentenceEnd}</span>
                    </p>
                    {q.hint && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        Hint: {q.hint}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit button - fixed at bottom, only shown after questions revealed */}
        {questionsRevealed && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-3 sm:py-4 safe-bottom">
            <div className="max-w-2xl mx-auto flex justify-end">
              <button
                onClick={() => handleFillBlankSubmit(false)}
                disabled={!canSubmit}
                className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                  canSubmit
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {canSubmit ? 'Submit Answers' : `Answer ${Math.ceil(scenario.questions.length / 2)}+ questions`}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Combined listen and write phase for summarize (listen_and_summarize)
  if (phase === 'summarize_listen' || phase === 'summarize_write') {
    const wordCount = summarizeText.trim().split(/\s+/).filter(w => w).length;
    const canSubmit = wordCount >= 20;

    return (
      <div className="h-viewport bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-3 py-2 sm:px-6 sm:py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900">
                Listen and Summarize
              </h2>
              <p className="text-xs text-gray-500">
                {wordCount} words written
              </p>
            </div>
            {timeRemaining !== null && (
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg ${
                timeRemaining <= 60
                  ? 'bg-red-100 text-red-700'
                  : timeRemaining <= 120
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs sm:text-sm font-semibold">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-6 pb-24 sm:pb-32">
          <div className="max-w-2xl mx-auto">
            {/* Audio Player Card */}
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200 mb-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">{summarizeScenario.title}</h3>
                  <p className="text-xs text-gray-500">{summarizeScenario.context}</p>
                </div>
                <div className="text-xs text-gray-500">
                  Plays: {summarizePlayCount}/3
                </div>
              </div>

              {summarizePlayCount < 3 ? (
                <WhatsAppAudioPlayer
                  key="summarize-audio"
                  onFetchAudio={async () => {
                    const response = await fetch('/api/tts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: summarizeScenario.audioScript }),
                    });
                    if (!response.ok) throw new Error('Failed to fetch audio');
                    return response.blob();
                  }}
                  onDurationReady={(duration) => {
                    setSummarizeAudioDuration(duration);
                    // If already playing but timer not started, start it now
                    if (isPlaying && !summarizeTimerStartedRef.current) {
                      summarizeTimerStartedRef.current = true;
                      const timerDuration = Math.ceil(duration * 1.5);
                      setTimeRemaining(timerDuration);
                    }
                  }}
                  onPlayStateChange={(playing) => {
                    setIsPlaying(playing);
                    // Start timer when audio starts playing for the first time
                    if (playing && !summarizeTimerStartedRef.current && summarizeAudioDuration > 0) {
                      summarizeTimerStartedRef.current = true;
                      // Timer = 1.5x audio duration
                      const timerDuration = Math.ceil(summarizeAudioDuration * 1.5);
                      setTimeRemaining(timerDuration);
                    }
                  }}
                  onAudioEnded={() => {
                    setSummarizePlayCount(prev => prev + 1);
                    if (!hasListenedToSummarize) {
                      setHasListenedToSummarize(true);
                    }
                  }}
                  variant="received"
                  autoPlay={false}
                />
              ) : (
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-500">No more replays available</p>
                </div>
              )}
            </div>

            {/* Summary textarea - always visible */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Your Summary:</h3>
              <textarea
                value={summarizeText}
                onChange={(e) => setSummarizeText(e.target.value)}
                className="w-full h-48 sm:h-64 px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm sm:text-base text-gray-900"
                placeholder="Write a summary of what you heard. Include the main points, key details, and any important information mentioned..."
              />
              <div className="flex justify-between items-center mt-2">
                <p className={`text-xs ${wordCount < 20 ? 'text-red-500' : wordCount > 150 ? 'text-amber-500' : 'text-gray-500'}`}>
                  {wordCount < 20 ? `${20 - wordCount} more words needed` : wordCount > 150 ? 'Consider being more concise' : `${wordCount} words`}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-200">
              <h4 className="text-xs font-semibold text-blue-900 mb-1">Tips:</h4>
              <ul className="text-xs text-blue-800 space-y-0.5">
                <li>• Timer starts when you play the audio</li>
                <li>• You can replay the audio up to 3 times</li>
                <li>• Aim for 50-150 words summarizing the main points</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 sm:px-4 py-3 sm:py-4 safe-bottom">
          <div className="max-w-2xl mx-auto flex justify-center">
            <button
              onClick={() => handleSummarizeSubmit(false)}
              disabled={!canSubmit}
              className={`px-5 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                canSubmit
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canSubmit ? 'Submit Summary' : 'Write at least 20 words'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conversation turn phase (for listen_and_respond)
  if (phase === 'conversation_turn') {
    const currentTurn = conversationTurns[currentTurnIndex];

    return (
      <div className="h-viewport bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Conversation Practice
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Turn {currentTurnIndex + 1} of {conversationTurns.length}
              </p>
            </div>
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                timeRemaining <= 60
                  ? 'bg-red-100 text-red-700'
                  : timeRemaining <= 120
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto px-2 py-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Show all previous conversation turns */}
            {conversationTurns.slice(0, currentTurnIndex).map((turn, idx) => (
              <div key={idx} className="space-y-4">
                {/* Their message (received) */}
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="max-w-xs sm:max-w-sm">
                    <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-200">
                      <p className="text-sm sm:text-base text-gray-800">{turn.prompt}</p>
                    </div>
                  </div>
                </div>

                {/* User's response (sent) */}
                {turn.userSelection !== undefined && (
                  <div className="flex items-start gap-2 justify-end">
                    <div className="max-w-xs sm:max-w-sm">
                      <div className="bg-amber-500 rounded-2xl rounded-tr-none px-4 py-3 shadow-sm ml-auto">
                        <p className="text-sm sm:text-base text-white">{turn.options[turn.userSelection]}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Current turn - Their message with audio */}
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="space-y-3">
                <WhatsAppAudioPlayer
                  key={`turn-${currentTurnIndex}`}
                  onFetchAudio={async () => {
                    const turn = conversationTurns[currentTurnIndex];
                    const response = await fetch('/api/tts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: turn.prompt }),
                    });
                    if (!response.ok) throw new Error('Failed to fetch audio');
                    return response.blob();
                  }}
                  onPlayStateChange={(playing) => setIsPlaying(playing)}
                  onAudioEnded={() => setHasPlayedCurrentAudio(true)}
                  variant="received"
                  autoPlay={false}
                />

                {/* Response options - show after audio is played and not showing feedback */}
                {hasPlayedCurrentAudio && !showingFeedback && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Choose your response:</p>
                    <div className="space-y-2">
                      {currentTurn.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(idx)}
                          className="w-full text-left p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-amber-500 hover:bg-amber-50 transition-all"
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <p className="text-sm text-gray-800">{option}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User's response sent (if selected and showing feedback) */}
            {showingFeedback && currentTurn.userSelection !== undefined && (
              <div className="flex items-start gap-2 justify-end">
                <div className="max-w-xs sm:max-w-sm">
                  <div className={`rounded-2xl rounded-tr-none px-4 py-3 shadow-sm ml-auto ${
                    currentTurn.userSelection === currentTurn.correctOption
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}>
                    <p className="text-sm sm:text-base text-white">
                      {currentTurn.options[currentTurn.userSelection]}
                    </p>
                    <p className="text-xs mt-1 text-white/80">
                      {currentTurn.userSelection === currentTurn.correctOption ? '✓ Correct' : '✗ Incorrect'}
                    </p>
                  </div>
                  {currentTurn.userSelection !== currentTurn.correctOption && (
                    <div className="mt-2 bg-green-100 rounded-2xl rounded-tr-none px-4 py-2 shadow-sm ml-auto border border-green-300">
                      <p className="text-xs text-green-800">
                        Better response: &quot;{currentTurn.options[currentTurn.correctOption]}&quot;
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Summary phase (for listen_and_respond)
  if (phase === 'summary') {
    const canSubmit = userSummary.trim().length >= 10;

    return (
      <div className="h-viewport bg-gray-50 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-2 py-2 sm:p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full bg-white rounded-xl sm:rounded-2xl shadow-lg flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Part 2: Write a Summary
                  </h2>
                  {timeRemaining !== null && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                      timeRemaining <= 60
                        ? 'bg-red-100 text-red-700'
                        : timeRemaining <= 120
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold">{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  Summarize the conversation in 1-3 sentences
                </p>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">📝 Instructions:</h3>
                <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
                  <li>• Mention the main purpose of the conversation</li>
                  <li>• Include key outcomes or decisions</li>
                  <li>• Keep it concise (1-3 sentences)</li>
                  <li>• Avoid unnecessary details</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Summary:</h3>
                <textarea
                  ref={textareaRef}
                  value={userSummary}
                  onChange={(e) => setUserSummary(e.target.value)}
                  className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-gray-900"
                  placeholder="Write your summary here..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  {userSummary.trim().split(/\s+/).filter(w => w).length} words
                </p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => handleSummarySubmit(false)}
                  disabled={!canSubmit}
                  className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                    canSubmit
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canSubmit ? 'Submit Summary' : 'Write at least 10 words'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Listening phase
  if (phase === 'listening') {
    return (
      <div className="h-viewport bg-gray-50 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-2 py-2 sm:p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full bg-white rounded-xl sm:rounded-2xl shadow-lg flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              <div className="text-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                  Listen Carefully
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
                  Plays: {playCount}/3
                </p>
              </div>

              <div className="mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Your Task:
                </h3>
                <p className="text-gray-700 text-sm sm:text-base lg:text-lg">
                  Type the statement that you hear
                </p>
              </div>

              <div className="flex flex-col items-center mb-6">
                <button
                  onClick={handlePlayAudio}
                  disabled={isPlaying || playCount >= 3}
                  className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mb-2 ${
                    isPlaying || playCount >= 3
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isPlaying ? 'Playing...' : playCount >= 3 ? 'Max replays reached' : 'Play Audio'}
                </button>
                {!isPlaying && playCount < 3 && (
                  <p className="text-xs sm:text-sm text-gray-500 text-center">
                    {playCount === 0 ? '👆 Click to play the audio' : `${3 - playCount} replays remaining`}
                  </p>
                )}
              </div>

              {playCount > 0 && (
                <div className="flex justify-center gap-4 mt-auto">
                  <button
                    onClick={handleContinueToAnswer}
                    className="px-6 sm:px-8 py-2 sm:py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center gap-2 text-sm sm:text-base"
                  >
                    Continue to Answer →
                  </button>
                </div>
              )}

              {/* Keyboard shortcuts hint */}
              {playCount > 0 && (
                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>Press <kbd className="px-2 py-1 bg-gray-100 rounded">Space</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded">N</kbd> to continue</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Answer phase
  if (phase === 'answer') {
    const canFinish = userAnswer.trim().length > 0;

    return (
      <div className="h-viewport bg-gray-50 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-2 py-2 sm:p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full bg-white rounded-xl sm:rounded-2xl shadow-lg flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
              <div className="text-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                  Type What You Heard
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Type exactly what you heard
                </p>
              </div>

              {playCount < 3 && (
                <div className="mb-3 flex justify-center">
                  <button
                    onClick={handlePlayAudio}
                    disabled={isPlaying}
                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 transition-colors text-xs sm:text-sm flex items-center gap-2"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isPlaying ? 'Playing...' : `Replay Audio (${3 - playCount} left)`}
                  </button>
                </div>
              )}

              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Answer:</h3>
                <textarea
                  ref={textareaRef}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-gray-900"
                  placeholder="Type what you heard..."
                  spellCheck={false}
                />
              </div>

              <div className="flex justify-center mt-auto">
                <button
                  onClick={handleSubmit}
                  disabled={!canFinish}
                  className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                    canFinish
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canFinish ? 'Submit Answer' : 'Type your answer first'}
                </button>
              </div>

              {canFinish && (
                <div className="mt-2 text-center text-xs sm:text-sm text-gray-500">
                  <p>Press <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-100 rounded text-xs">Enter</kbd> to submit</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing phase
  if (phase === 'processing') {
    return (
      <div className="h-viewport bg-gray-50 flex flex-col relative">
        <div className="flex-1 overflow-y-auto px-2 py-2 sm:p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full bg-white rounded-xl sm:rounded-2xl shadow-lg flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 mb-4">
                  <svg className="animate-spin h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Checking Your Answer
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Analyzing your response...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Feedback phase
  if (phase === 'feedback' && feedback) {
    return (
      <div className="h-viewport bg-gray-50 flex flex-col relative">
        <div className="flex-1 overflow-y-auto safe-top safe-bottom px-2 py-2 sm:p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full">
            {/* Success/Result Header */}
            <div className={`rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 ${
              feedback.correct
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                    {feedback.correct ? 'Great Job!' : 'Good Try!'}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-700">
                    Score: <span className="font-bold">{feedback.score}%</span>
                    {feedback.summaryFeedback && (
                      <span className="text-gray-500 ml-2">• {feedback.summaryFeedback}</span>
                    )}
                  </p>
                </div>
                <div className={`text-4xl sm:text-5xl ${feedback.correct ? 'text-green-600' : 'text-amber-600'}`}>
                  {feedback.correct ? '✓' : '~'}
                </div>
              </div>
            </div>

            {/* Question-by-question results for listen_and_complete */}
            {feedback.questionResults && feedback.questionResults.length > 0 && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Your Answers</h3>
                <div className="space-y-2 sm:space-y-3">
                  {feedback.questionResults.map((result) => (
                    <div
                      key={result.questionNumber}
                      className={`p-2.5 sm:p-3 rounded-lg border-2 ${
                        result.isCorrect
                          ? 'bg-green-50/50 border-green-200'
                          : 'bg-red-50/50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          result.isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {result.isCorrect ? '✓' : '✗'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-gray-700">
                            <span className="text-gray-500">{result.questionNumber}.</span>{' '}
                            {result.sentenceStart}
                            <span className={`font-semibold mx-1 ${
                              result.isCorrect ? 'text-green-700' : 'text-red-600 line-through'
                            }`}>
                              {result.userAnswer || '(no answer)'}
                            </span>
                            {result.sentenceEnd}
                          </p>
                          {!result.isCorrect && (
                            <p className="text-xs sm:text-sm text-green-700 mt-1">
                              Correct: <span className="font-semibold">{result.correctAnswer}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Your Answer - only show if not question results */}
            {!feedback.questionResults && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Your Answer</h3>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                  <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap">{feedback.userAnswer}</p>
                </div>
              </div>
            )}

            {/* Show conversation transcript for listen_and_respond */}
            {feedback.conversationTranscript && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Conversation Transcript</h3>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap font-mono">{feedback.conversationTranscript}</p>
                </div>
              </div>
            )}

            {/* Detailed Feedback (if not perfect) */}
            {!feedback.correct && !feedback.conversationTranscript && !feedback.questionResults && (
              <>
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Correct Answer</h3>
                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                    <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap">{feedback.correctAnswer}</p>
                  </div>
                </div>

                {/* Show detailed differences */}
                {(feedback.differences && feedback.differences.length > 0) && (
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">What to improve:</h3>
                    <div className="space-y-2">
                      {feedback.differences.map((diff, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-amber-50 p-2 sm:p-3 rounded-lg border border-amber-200">
                          <span className="text-amber-600 font-bold">•</span>
                          <p className="text-sm sm:text-base text-gray-800">{diff}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Show expected summary for listen_and_respond */}
            {feedback.conversationTranscript && !feedback.correct && (
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Expected Summary</h3>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
                  <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap">{feedback.correctAnswer}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => router.push('/app')}
                className="flex-1 px-6 py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors duration-200 text-sm sm:text-base"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
