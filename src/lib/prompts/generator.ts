/**
 * AI Prompt Generator
 *
 * Generates prompts for all question types using OpenAI GPT-4o-mini.
 * Each question type has specific generation templates and output schemas.
 */

import OpenAI from 'openai';
import {
  CEFRLevel,
  SkillArea,
  QuestionType,
  PromptData,
  CEFR_CHARACTERISTICS,
  ListenThenSpeakPrompt,
  ReadThenSpeakPrompt,
  WritingSamplePrompt,
  InteractiveWritingPrompt,
  ListenAndTypePrompt,
  ListenAndRespondPrompt,
  ListenAndCompletePrompt,
  ListenAndSummarizePrompt,
  ReadAndSelectPrompt,
  FillInTheBlanksPrompt,
  ReadAndCompletePrompt,
  InteractiveReadingPrompt,
} from './types';

// =====================================================
// OPENAI CLIENT
// =====================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================================
// GENERATION INTERFACE
// =====================================================

export interface GenerationRequest {
  skillArea: SkillArea;
  questionType: QuestionType;
  cefrLevel: CEFRLevel;
  count?: number;
  topics?: string[];
}

export interface GenerationResult {
  success: boolean;
  prompts: PromptData[];
  errors?: string[];
}

// =====================================================
// MAIN GENERATOR FUNCTION
// =====================================================

export async function generatePrompts(request: GenerationRequest): Promise<GenerationResult> {
  const { skillArea, questionType, cefrLevel, count = 1 } = request;

  try {
    const prompts: PromptData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const prompt = await generateSinglePrompt(skillArea, questionType, cefrLevel, request.topics);
        if (prompt) {
          prompts.push(prompt);
        }
      } catch (error) {
        errors.push(`Failed to generate prompt ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: prompts.length > 0,
      prompts,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      prompts: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// =====================================================
// SINGLE PROMPT GENERATOR
// =====================================================

async function generateSinglePrompt(
  skillArea: SkillArea,
  questionType: QuestionType,
  cefrLevel: CEFRLevel,
  topics?: string[]
): Promise<PromptData | null> {
  const characteristics = CEFR_CHARACTERISTICS[cefrLevel];

  switch (questionType) {
    // Speaking
    case 'listen_then_speak':
      return generateListenThenSpeak(cefrLevel, characteristics, topics);
    case 'read_then_speak':
      return generateReadThenSpeak(cefrLevel, characteristics, topics);

    // Writing
    case 'writing_sample':
      return generateWritingSample(cefrLevel, characteristics, topics);
    case 'interactive_writing':
      return generateInteractiveWriting(cefrLevel, characteristics, topics);

    // Listening
    case 'listen_and_type':
      return generateListenAndType(cefrLevel, characteristics);
    case 'listen_and_respond':
      return generateListenAndRespond(cefrLevel, characteristics, topics);
    case 'listen_and_complete':
      return generateListenAndComplete(cefrLevel, characteristics, topics);
    case 'listen_and_summarize':
      return generateListenAndSummarize(cefrLevel, characteristics, topics);

    // Reading
    case 'read_and_select':
      return generateReadAndSelect(cefrLevel, characteristics);
    case 'fill_in_the_blanks':
      return generateFillInTheBlanks(cefrLevel, characteristics, topics);
    case 'read_and_complete':
      return generateReadAndComplete(cefrLevel, characteristics, topics);
    case 'interactive_reading':
      return generateInteractiveReading(cefrLevel, characteristics, topics);

    default:
      return null;
  }
}

// =====================================================
// SPEAKING GENERATORS
// =====================================================

async function generateListenThenSpeak(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<ListenThenSpeakPrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Listen Then Speak" exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Sentence length: ${characteristics.sentenceLength}
- Audio speed: ${characteristics.audioSpeed}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "audioScript": "A short statement or scenario (2-4 sentences) that sets up a topic for discussion",
  "responsePrompt": "A clear QUESTION asking for the learner's personal opinion, experience, or thoughts",
  "expectedTopics": ["topic1", "topic2", "topic3"],
  "suggestedDuration": 60,
  "context": "Optional brief context about the situation"
}

Requirements:
- audioScript should be natural, conversational English at the specified level that introduces a topic
- responsePrompt MUST be a question (ending with ?) that asks for the learner's personal opinion, experience, or thoughts
- Example good responsePrompts: "What do you think about this?", "Do you agree or disagree? Why?", "What would you do in this situation?", "Have you ever experienced something similar?"
- Example bad responsePrompts: "Talk about the topic.", "Describe what you heard.", "Summarize the audio."
- expectedTopics should list 3-5 key points the learner might mention
- suggestedDuration should be 30-90 seconds based on complexity`
      }
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'listen_then_speak',
    ...parsed,
  };
}

async function generateReadThenSpeak(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<ReadThenSpeakPrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Read Then Speak" exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "readingText": "A short passage (3-6 sentences) for the learner to read that presents a topic, scenario, or opinion",
  "discussionPrompt": "A clear QUESTION asking for the learner's personal opinion, experience, or thoughts about the reading",
  "expectedTopics": ["topic1", "topic2", "topic3"],
  "suggestedDuration": 60,
  "context": "Optional brief context"
}

Requirements:
- readingText should be engaging and at the appropriate reading level, presenting an interesting topic or viewpoint
- discussionPrompt MUST be a question (ending with ?) that invites personal opinion or experience
- Example good discussionPrompts: "Do you agree with this perspective? Why or why not?", "What is your opinion on this topic?", "Have you experienced something like this? Tell me about it.", "If you were in this situation, what would you do?"
- Example bad discussionPrompts: "Summarize the passage.", "Describe what you read.", "Explain the main idea."
- expectedTopics should list 3-5 discussion points`
      }
    ],
    temperature: 0.8,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'read_then_speak',
    ...parsed,
  };
}

// =====================================================
// WRITING GENERATORS
// =====================================================

async function generateWritingSample(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<WritingSamplePrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  // Word count expectations by level
  const wordCounts: Record<CEFRLevel, { min: number; max: number }> = {
    A1: { min: 30, max: 60 },
    A2: { min: 50, max: 100 },
    B1: { min: 100, max: 180 },
    B2: { min: 150, max: 250 },
    C1: { min: 200, max: 350 },
    C2: { min: 250, max: 400 },
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a writing prompt for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "topic": "A clear QUESTION asking for the learner's opinion, experience, or thoughts on a topic",
  "instructions": "Detailed instructions for what to write",
  "evaluationCriteria": ["criterion1", "criterion2", "criterion3"],
  "suggestedPoints": ["point1", "point2", "point3"]
}

Requirements:
- topic MUST be a question (ending with ?) that asks for personal opinion, experience, or perspective
- Example good topics: "What do you think is the most important quality in a friend? Why?", "Do you prefer living in a city or the countryside? Explain your reasons.", "What is the best advice you have ever received?"
- Example bad topics: "Write about friendship.", "Describe a city.", "Discuss advice."
- instructions should guide the learner on what to include
- evaluationCriteria should list 3-5 things that will be evaluated
- suggestedPoints should give optional talking points`
      }
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'writing_sample',
    ...parsed,
    expectedWordCount: wordCounts[cefrLevel],
  };
}

async function generateInteractiveWriting(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<InteractiveWritingPrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const wordCounts: Record<CEFRLevel, { step1: { min: number; max: number }; step2: { min: number; max: number } }> = {
    A1: { step1: { min: 30, max: 60 }, step2: { min: 20, max: 40 } },
    A2: { step1: { min: 50, max: 100 }, step2: { min: 30, max: 60 } },
    B1: { step1: { min: 80, max: 150 }, step2: { min: 50, max: 100 } },
    B2: { step1: { min: 120, max: 200 }, step2: { min: 80, max: 150 } },
    C1: { step1: { min: 150, max: 250 }, step2: { min: 100, max: 180 } },
    C2: { step1: { min: 180, max: 300 }, step2: { min: 120, max: 200 } },
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate an interactive 2-part writing exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "step1Prompt": "A clear QUESTION asking for the learner's opinion, experience, or thoughts",
  "step1Context": "Context or scenario for the writing task",
  "followUpGuidelines": ["guideline1", "guideline2", "guideline3"]
}

Requirements:
- step1Prompt MUST be a question (ending with ?) that invites personal opinion or experience
- Example good step1Prompts: "What do you think about working from home? What are the advantages and disadvantages?", "If you could change one thing about your daily routine, what would it be and why?", "Do you agree that technology has improved our lives? Explain your view."
- Example bad step1Prompts: "Write about remote work.", "Describe your routine.", "Discuss technology."
- step1Context should set up a realistic scenario that makes the question relevant
- followUpGuidelines should help generate a personalized follow-up question later
- The task should encourage personal expression and opinion`
      }
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'interactive_writing',
    ...parsed,
    expectedWordCountStep1: wordCounts[cefrLevel].step1,
    expectedWordCountStep2: wordCounts[cefrLevel].step2,
  };
}

// =====================================================
// LISTENING GENERATORS
// =====================================================

async function generateListenAndType(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel]
): Promise<ListenAndTypePrompt> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Listen and Type" exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Sentence length: ${characteristics.sentenceLength}

Return ONLY valid JSON with this exact structure:
{
  "audioScript": "A single sentence that will be spoken aloud for the learner to type",
  "hints": ["hint1", "hint2"],
  "acceptableVariations": ["variation1", "variation2"]
}

Requirements:
- audioScript should be exactly 1 sentence at the appropriate level
- Keep it natural and conversational
- hints are optional clues (like "This is about weather")
- acceptableVariations are alternative correct answers (e.g., contractions)`
      }
    ],
    temperature: 0.9,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'listen_and_type',
    ...parsed,
  };
}

async function generateListenAndRespond(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<ListenAndRespondPrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Listen and Respond" conversation exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "title": "Title of the conversation scenario",
  "context": "Brief context (1-2 sentences) about the situation",
  "conversationTurns": [
    {
      "prompt": "Speaker's line (what they say)",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,
      "explanation": "Why this is correct"
    }
  ],
  "summaryPrompt": "Question asking learner to summarize the conversation",
  "expectedSummaryPoints": ["point1", "point2", "point3"]
}

Requirements:
- Generate exactly 6 conversation turns
- Each turn must have exactly 4 options with 1 correct answer
- Options should be plausible but only one clearly correct
- Conversation should be natural and coherent
- Match vocabulary and grammar to CEFR level
- correctOption is the index (0-3) of the correct answer`
      }
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'listen_and_respond',
    ...parsed,
  };
}

async function generateListenAndComplete(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<ListenAndCompletePrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Listen and Complete" exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "title": "Title of the scenario",
  "context": "Brief context about what learner will hear",
  "audioScript": "Full script (4-8 sentences) that will be converted to audio",
  "questions": [
    {
      "id": 1,
      "sentenceStart": "Text before the blank",
      "sentenceEnd": "Text after the blank",
      "correctAnswer": "The missing word/phrase",
      "acceptableAnswers": ["alternative1", "alternative2"],
      "hint": "Optional hint"
    }
  ]
}

Requirements:
- Generate exactly 10 fill-in-the-blank questions
- audioScript should contain all the information needed to answer
- Blanks should test comprehension, not just hearing
- acceptableAnswers should include valid alternatives
- Questions should be in logical order through the audio
- IMPORTANT: correctAnswer must be meaningful content words (nouns, verbs, adjectives, adverbs) with at least 4 letters
- NEVER use short function words like: a, an, the, is, are, was, were, be, to, of, in, on, at, for
- Good examples: "morning", "quickly", "restaurant", "beautiful"
- Bad examples: "the", "is", "a", "to"`
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'listen_and_complete',
    ...parsed,
  };
}

async function generateListenAndSummarize(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<ListenAndSummarizePrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const wordCounts: Record<CEFRLevel, { min: number; max: number }> = {
    A1: { min: 20, max: 40 },
    A2: { min: 30, max: 60 },
    B1: { min: 50, max: 100 },
    B2: { min: 80, max: 150 },
    C1: { min: 100, max: 200 },
    C2: { min: 120, max: 250 },
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Listen and Summarize" exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "title": "Title of the audio content",
  "context": "Brief context about what learner will hear",
  "audioScript": "Full script (6-12 sentences) that will be converted to audio",
  "expectedPoints": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"]
}

Requirements:
- audioScript should be informative content (announcement, lecture, news, etc.)
- Content should have clear main points to summarize
- expectedPoints should list 5-8 key points a good summary would include
- Difficulty should match the CEFR level`
      }
    ],
    temperature: 0.7,
    max_tokens: 1200,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'listen_and_summarize',
    ...parsed,
    wordCountGuideline: wordCounts[cefrLevel],
  };
}

// =====================================================
// READING GENERATORS
// =====================================================

async function generateReadAndSelect(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel]
): Promise<ReadAndSelectPrompt> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Read and Select" exercise (real vs fake words) for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}

Return ONLY valid JSON with this exact structure:
{
  "words": [
    { "word": "example", "isReal": true, "difficulty": 1 },
    { "word": "exampel", "isReal": false, "difficulty": 1 }
  ]
}

Requirements:
- Generate exactly 36 words (18 real, 18 fake)
- Real words should match the vocabulary level
- Fake words should look plausible (common misspellings, letter swaps)
- difficulty should be 1-5 (1=easiest for the level, 5=hardest)
- Mix difficulties: ~30% easy (1-2), ~40% medium (3), ~30% hard (4-5)
- Fake words should be believable misspellings of real words`
      }
    ],
    temperature: 0.8,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'read_and_select',
    words: parsed.words,
    totalWords: 18,
  };
}

async function generateFillInTheBlanks(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<FillInTheBlanksPrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Fill in the Blanks" exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "sentences": [
    {
      "sentence": "The _____ is shining brightly today.",
      "missingWord": "sun",
      "difficulty": 1,
      "hints": ["It gives us light and warmth"]
    }
  ]
}

Requirements:
- Generate exactly 10 sentences
- Each sentence should have exactly one blank (_____)
- missingWord is what goes in the blank
- difficulty should be 1-5
- hints are optional clues
- Sentences should be varied in topic and structure
- Missing words should test vocabulary at the appropriate level
- IMPORTANT: Missing words must be meaningful content words (nouns, verbs, adjectives, adverbs) with at least 4 letters
- NEVER use short function words like: a, an, the, is, are, was, were, be, to, of, in, on, at, for, it, he, she, we, they
- Good examples: "restaurant", "beautiful", "quickly", "important", "computer"
- Bad examples: "the", "is", "a", "to", "in"`
      }
    ],
    temperature: 0.8,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'fill_in_the_blanks',
    sentences: parsed.sentences,
  };
}

async function generateReadAndComplete(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<ReadAndCompletePrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from topics like: ${characteristics.topics.join(', ')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate a "Read and Complete" exercise for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "title": "Title of the paragraph",
  "paragraph": "A paragraph with _____ placeholders for missing words",
  "missingWords": ["word1", "word2", "word3"],
  "context": "Brief context about the paragraph"
}

Requirements:
- Paragraph should be 4-8 sentences long
- Include 6-10 blanks (_____)
- missingWords should be in order they appear
- Paragraph should be coherent and on one topic
- Use _____ for each blank
- Words should test vocabulary and context understanding
- IMPORTANT: Missing words must be meaningful content words (nouns, verbs, adjectives, adverbs) with at least 4 letters
- NEVER use short function words like: a, an, the, is, are, was, were, be, to, of, in, on, at, for, it, he, she, we, they
- Good examples: "morning", "quickly", "wonderful", "restaurant", "traveled"
- Bad examples: "the", "is", "a", "to", "in", "was"`
      }
    ],
    temperature: 0.8,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'read_and_complete',
    ...parsed,
  };
}

async function generateInteractiveReading(
  cefrLevel: CEFRLevel,
  characteristics: typeof CEFR_CHARACTERISTICS[CEFRLevel],
  topics?: string[]
): Promise<InteractiveReadingPrompt> {
  const topicHint = topics?.length ? `Focus on one of these topics: ${topics.join(', ')}` : `Choose from academic topics like: history, science, technology, environment, society`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert language learning content creator. Generate an "Interactive Reading" exercise with 6 question types for English learners at CEFR level ${cefrLevel}.

CEFR ${cefrLevel} Characteristics:
- Vocabulary: ${characteristics.vocabularyRange}
- Grammar: ${characteristics.grammarStructures}
- Complexity: ${characteristics.complexity}

${topicHint}

Return ONLY valid JSON with this exact structure:
{
  "title": "Title of the passage",
  "passageParts": ["Part 1 text with [BLANK_1] and [BLANK_2]...", "Part 2 text...", "Part 3 text..."],
  "sentenceBlanks": [
    { "partIndex": 0, "blankText": "[BLANK_1]", "options": ["opt1", "opt2", "opt3", "opt4"], "correctIndex": 0 }
  ],
  "passageGap": {
    "gapPosition": 1,
    "options": ["sentence1", "sentence2", "sentence3", "sentence4"],
    "correctIndex": 0
  },
  "highlightQuestions": [
    { "question": "Which phrase describes X?", "correctHighlight": "exact text to highlight", "partIndex": 1 },
    { "question": "Find the phrase that shows Y", "correctHighlight": "exact text", "partIndex": 2 }
  ],
  "mainIdea": {
    "question": "What is the main idea of this passage?",
    "options": ["option1", "option2", "option3", "option4"],
    "correctIndex": 0
  },
  "title_question": {
    "question": "Which title best fits this passage?",
    "options": ["title1", "title2", "title3", "title4"],
    "correctIndex": 0
  }
}

Requirements:
- passageParts should be 5-6 paragraphs of academic content
- sentenceBlanks should have 6-8 dropdown blanks scattered across parts
- highlightQuestions: exactly 2 questions with answers found in the passage
- All questions should have exactly 4 options
- correctHighlight must be an exact substring from the passage
- Content should be engaging and educational`
      }
    ],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = JSON.parse(content);
  return {
    type: 'interactive_reading',
    ...parsed,
  };
}
