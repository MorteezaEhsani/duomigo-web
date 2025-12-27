/**
 * Adaptive Prompt System - Type Definitions
 *
 * This file contains all TypeScript interfaces for the AI-generated prompt system
 * across all four skill areas: Speaking, Writing, Listening, and Reading.
 */

// =====================================================
// CEFR LEVELS
// =====================================================

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type SkillArea = 'speaking' | 'writing' | 'listening' | 'reading';

// Question types by skill area
export type SpeakingQuestionType = 'listen_then_speak' | 'read_then_speak' | 'speak_about_photo';
export type WritingQuestionType = 'writing_sample' | 'interactive_writing' | 'write_about_photo' | 'custom_writing';
export type ListeningQuestionType = 'listen_and_type' | 'listen_and_respond' | 'listen_and_complete' | 'listen_and_summarize';
export type ReadingQuestionType = 'read_and_select' | 'fill_in_the_blanks' | 'read_and_complete' | 'interactive_reading';

export type QuestionType =
  | SpeakingQuestionType
  | WritingQuestionType
  | ListeningQuestionType
  | ReadingQuestionType;

// =====================================================
// USER SKILL LEVEL
// =====================================================

export interface UserSkillLevel {
  id: string;
  user_id: string;
  skill_area: SkillArea;
  question_type: QuestionType;
  cefr_level: CEFRLevel;
  numeric_level: number; // 1.0 - 6.0
  attempts_at_level: number;
  correct_streak: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// SPEAKING PROMPTS
// =====================================================

export interface ListenThenSpeakPrompt {
  type: 'listen_then_speak';
  audioScript: string;          // Text for TTS generation
  responsePrompt: string;       // What to ask user after listening
  expectedTopics: string[];     // Key points expected in response
  suggestedDuration: number;    // Seconds
  context?: string;             // Optional context/situation description
}

export interface ReadThenSpeakPrompt {
  type: 'read_then_speak';
  readingText: string;          // Text for user to read
  discussionPrompt: string;     // What to discuss after reading
  expectedTopics: string[];     // Expected discussion points
  suggestedDuration: number;    // Seconds
  context?: string;             // Optional context
}

export type SpeakingPromptData = ListenThenSpeakPrompt | ReadThenSpeakPrompt;

// =====================================================
// WRITING PROMPTS
// =====================================================

export interface WritingSamplePrompt {
  type: 'writing_sample';
  topic: string;                // Main topic/question
  instructions: string;         // Detailed instructions
  expectedWordCount: {
    min: number;
    max: number;
  };
  evaluationCriteria: string[]; // What will be evaluated
  context?: string;             // Optional context
  suggestedPoints?: string[];   // Optional talking points
}

export interface InteractiveWritingPrompt {
  type: 'interactive_writing';
  step1Prompt: string;          // Initial prompt
  step1Context: string;         // Context for step 1
  expectedWordCountStep1: {
    min: number;
    max: number;
  };
  // Note: step2 prompt is generated dynamically based on step1 response
  followUpGuidelines: string[]; // Guidelines for generating follow-up
  expectedWordCountStep2: {
    min: number;
    max: number;
  };
}

export type WritingPromptData = WritingSamplePrompt | InteractiveWritingPrompt;

// =====================================================
// LISTENING PROMPTS
// =====================================================

export interface ListenAndTypePrompt {
  type: 'listen_and_type';
  audioScript: string;          // Exact text for TTS
  hints?: string[];             // Optional hints
  acceptableVariations?: string[]; // Acceptable alternative answers
}

export interface ConversationTurn {
  prompt: string;               // Audio prompt (speaker's line)
  options: string[];            // 4 response options
  correctOption: number;        // Index of correct answer (0-3)
  explanation?: string;         // Why this is the correct answer
}

export interface ListenAndRespondPrompt {
  type: 'listen_and_respond';
  title: string;                // Title of the conversation
  context: string;              // Brief context description
  conversationTurns: ConversationTurn[];  // Typically 6 turns
  summaryPrompt: string;        // What to summarize
  expectedSummaryPoints: string[];  // Key points for summary
}

export interface FillBlankQuestion {
  id: number;
  sentenceStart: string;        // Text before the blank
  sentenceEnd: string;          // Text after the blank
  correctAnswer: string;        // The correct answer
  acceptableAnswers?: string[]; // Alternative accepted answers
  hint?: string;                // Optional hint
}

export interface ListenAndCompletePrompt {
  type: 'listen_and_complete';
  title: string;                // Title of the scenario
  context: string;              // Brief context shown before listening
  audioScript: string;          // Full script for TTS
  questions: FillBlankQuestion[]; // Typically 10 questions
}

export interface ListenAndSummarizePrompt {
  type: 'listen_and_summarize';
  title: string;                // Title of the audio
  context: string;              // Brief context
  audioScript: string;          // Full script for TTS
  expectedPoints: string[];     // Key points expected in summary
  wordCountGuideline: {
    min: number;
    max: number;
  };
}

export type ListeningPromptData =
  | ListenAndTypePrompt
  | ListenAndRespondPrompt
  | ListenAndCompletePrompt
  | ListenAndSummarizePrompt;

// =====================================================
// READING PROMPTS
// =====================================================

export interface WordItem {
  word: string;
  isReal: boolean;
  difficulty: number;           // 1-5
}

export interface ReadAndSelectPrompt {
  type: 'read_and_select';
  words: WordItem[];            // Mix of real and fake words
  totalWords: number;           // How many to show (e.g., 18)
}

export interface SentenceWithBlank {
  sentence: string;             // Sentence with _____ placeholder
  missingWord: string;          // The correct word
  difficulty: number;           // 1-5
  hints?: string[];             // Optional hints (e.g., first letter revealed)
}

export interface FillInTheBlanksPrompt {
  type: 'fill_in_the_blanks';
  sentences: SentenceWithBlank[]; // Typically 10 sentences
}

export interface ReadAndCompletePrompt {
  type: 'read_and_complete';
  title: string;                // Title of the paragraph
  paragraph: string;            // Paragraph with _____ placeholders
  missingWords: string[];       // Words in order they appear
  context?: string;             // Optional context
}

// Interactive Reading - Complex type with 6 question types
export interface SentenceBlank {
  partIndex: number;            // Which passage part contains this blank
  blankText: string;            // The placeholder text like "[BLANK_1]"
  options: string[];            // 4 options for dropdown
  correctIndex: number;         // Index of correct answer
}

export interface PassageGap {
  gapPosition: number;          // After which part the gap appears
  options: string[];            // 4 sentence options
  correctIndex: number;
}

export interface HighlightQuestion {
  question: string;             // The question to answer
  correctHighlight: string;     // The exact text to highlight
  partIndex: number;            // Which part contains the answer
}

export interface InteractiveReadingPrompt {
  type: 'interactive_reading';
  title: string;                // Title of the passage
  passageParts: string[];       // The full passage split into parts
  sentenceBlanks: SentenceBlank[];  // For "Complete the Sentences"
  passageGap: PassageGap;       // For "Complete the Passage"
  highlightQuestions: HighlightQuestion[];  // 2 highlight questions
  mainIdea: {
    question: string;
    options: string[];
    correctIndex: number;
  };
  title_question: {             // Renamed to avoid conflict with title
    question: string;
    options: string[];
    correctIndex: number;
  };
}

export type ReadingPromptData =
  | ReadAndSelectPrompt
  | FillInTheBlanksPrompt
  | ReadAndCompletePrompt
  | InteractiveReadingPrompt;

// =====================================================
// COMBINED PROMPT TYPES
// =====================================================

export type PromptData =
  | SpeakingPromptData
  | WritingPromptData
  | ListeningPromptData
  | ReadingPromptData;

// =====================================================
// GENERATED PROMPT (Database record)
// =====================================================

export interface GeneratedPrompt {
  id: string;
  skill_area: SkillArea;
  question_type: QuestionType;
  cefr_level: CEFRLevel;
  prompt_data: PromptData;
  metadata?: {
    topics?: string[];
    keywords?: string[];
    generatedAt?: string;
    model?: string;
  };
  times_used: number;
  is_active: boolean;
  quality_score?: number;
  created_at: string;
  expires_at?: string;
}

// =====================================================
// PROMPT USAGE (Database record)
// =====================================================

export interface PromptUsage {
  id: string;
  user_id: string;
  prompt_id: string;
  used_at: string;
  score?: number;
}

// =====================================================
// PROMPT SELECTION RESULT
// =====================================================

export interface PromptSelectionResult {
  prompt: GeneratedPrompt | null;
  source: 'cache' | 'generated' | 'fallback';
  fallbackReason?: string;
  userLevel: CEFRLevel;
}

// =====================================================
// CEFR CHARACTERISTICS (for generation)
// =====================================================

export interface CEFRCharacteristics {
  vocabularyRange: string;
  grammarStructures: string;
  topics: string[];
  sentenceLength: string;
  audioSpeed: string;
  responseLength: string;
  complexity: string;
}

export const CEFR_CHARACTERISTICS: Record<CEFRLevel, CEFRCharacteristics> = {
  A1: {
    vocabularyRange: 'basic, everyday words (500-1000 words)',
    grammarStructures: 'simple present, basic past, simple sentences',
    topics: ['family', 'shopping', 'daily routine', 'food', 'weather', 'greetings'],
    sentenceLength: '5-10 words',
    audioSpeed: 'slow, clear pronunciation with pauses',
    responseLength: '2-3 sentences',
    complexity: 'very simple, concrete topics only'
  },
  A2: {
    vocabularyRange: 'common vocabulary (1000-2000 words)',
    grammarStructures: 'past tense, future with will/going to, basic connectors (and, but, because)',
    topics: ['travel', 'hobbies', 'work basics', 'health', 'education', 'leisure activities'],
    sentenceLength: '8-15 words',
    audioSpeed: 'moderate, clear articulation',
    responseLength: '3-5 sentences',
    complexity: 'simple, familiar everyday situations'
  },
  B1: {
    vocabularyRange: 'intermediate vocabulary (2000-4000 words)',
    grammarStructures: 'conditionals (if/would), passive voice, relative clauses, perfect tenses',
    topics: ['current events', 'opinions', 'experiences', 'future plans', 'media', 'culture'],
    sentenceLength: '10-20 words',
    audioSpeed: 'natural pace with clear speech',
    responseLength: '5-8 sentences',
    complexity: 'can handle unexpected situations, express opinions'
  },
  B2: {
    vocabularyRange: 'upper intermediate (4000-8000 words)',
    grammarStructures: 'complex sentences, subjunctive, advanced tenses, nuanced connectors',
    topics: ['abstract ideas', 'professional topics', 'social issues', 'arts', 'science'],
    sentenceLength: '15-25 words',
    audioSpeed: 'natural with some variation in pace',
    responseLength: '8-12 sentences',
    complexity: 'can engage with complex texts and abstract topics'
  },
  C1: {
    vocabularyRange: 'advanced vocabulary (8000-15000 words)',
    grammarStructures: 'idiomatic expressions, nuanced structures, sophisticated linking',
    topics: ['academic subjects', 'complex arguments', 'specialized fields', 'philosophy'],
    sentenceLength: '20-30 words',
    audioSpeed: 'natural with nuances, may include various accents',
    responseLength: '12-20 sentences',
    complexity: 'sophisticated, can understand implicit meaning'
  },
  C2: {
    vocabularyRange: 'near-native vocabulary (15000+ words)',
    grammarStructures: 'all structures, subtle distinctions, stylistic variation',
    topics: ['any topic at depth', 'abstract reasoning', 'specialized discourse'],
    sentenceLength: 'varied, complex structures',
    audioSpeed: 'native-like, may include regional accents and fast speech',
    responseLength: 'comprehensive, as needed',
    complexity: 'can handle any language situation with precision'
  }
};
