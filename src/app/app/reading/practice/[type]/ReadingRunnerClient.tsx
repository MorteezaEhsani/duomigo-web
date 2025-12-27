'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Adaptive prompt types
interface AdaptiveReadAndSelectPrompt {
  type: 'read_and_select';
  words: { word: string; isReal: boolean; difficulty: number }[];
}

interface AdaptiveFillInTheBlanksPrompt {
  type: 'fill_in_the_blanks';
  sentences: { sentence: string; missingWord: string }[];
}

interface AdaptiveReadAndCompletePrompt {
  type: 'read_and_complete';
  title: string;
  paragraph: string;
  missingWords: string[];
  context?: string;
}

interface AdaptiveInteractiveReadingPrompt {
  type: 'interactive_reading';
  title: string;
  passageParts: string[];
  sentenceBlanks: { partIndex: number; blankText: string; options: string[]; correctIndex: number }[];
  passageGap: { gapPosition: number; options: string[]; correctIndex: number };
  highlightQuestions: { question: string; correctHighlight: string; partIndex: number }[];
  mainIdea: { question: string; options: string[]; correctIndex: number };
  title_question: { question: string; options: string[]; correctIndex: number };
}

type AdaptivePromptData = AdaptiveReadAndSelectPrompt | AdaptiveFillInTheBlanksPrompt | AdaptiveReadAndCompletePrompt | AdaptiveInteractiveReadingPrompt | null;

interface ReadingRunnerClientProps {
  sessionId: string;
  supabaseUserId: string;
  readingType: string;
  adaptivePromptData?: AdaptivePromptData;
  promptId?: string | null;
}

// ==================== READ AND SELECT TYPES ====================
interface WordItem {
  word: string;
  isReal: boolean;
  difficulty: number;
}

interface WordResult {
  word: string;
  isReal: boolean;
  userAnswer: 'real' | 'fake' | 'timeout';
  isCorrect: boolean;
  difficulty: number;
}

// ==================== FILL IN THE BLANKS TYPES ====================
interface SentenceItem {
  sentence: string;
  missingWord: string;
}

interface ActiveSentence extends SentenceItem {
  revealedIndices: number[]; // Indices of letters that are shown as hints
}

interface SentenceResult {
  sentence: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

// ==================== READ AND COMPLETE TYPES ====================
interface ParagraphWord {
  word: string;
  revealedIndices: number[];
}

interface ParagraphItem {
  paragraph: string; // Full paragraph with _____ placeholders
  missingWords: string[]; // Words to fill in, in order
}

interface ActiveParagraph {
  paragraph: string;
  words: ParagraphWord[]; // Each missing word with its revealed indices
}

interface ParagraphWordResult {
  word: string;
  userAnswer: string;
  isCorrect: boolean;
}

// ==================== INTERACTIVE READING TYPES ====================
interface SentenceBlank {
  partIndex: number;      // Which passage part contains this blank
  blankText: string;      // The text marker like "[BLANK_1]"
  options: string[];      // 4 options for dropdown
  correctIndex: number;   // Index of correct answer
}

interface PassageGap {
  gapPosition: number;    // After which part the gap appears
  options: string[];      // 4 sentence options
  correctIndex: number;
}

interface HighlightQuestion {
  question: string;
  correctHighlight: string;  // The exact text to highlight
  partIndex: number;         // Which part contains the answer
}

interface InteractivePassage {
  passageParts: string[];    // The full passage split into parts
  sentenceBlanks: SentenceBlank[];
  passageGap: PassageGap;
  highlightQuestions: HighlightQuestion[];
  mainIdea: {
    question: string;
    options: string[];
    correctIndex: number;
  };
  title: {
    question: string;
    options: string[];
    correctIndex: number;
  };
}

interface InteractiveResult {
  questionType: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

type Phase = 'instructions' | 'practice' | 'processing' | 'feedback';

// ==================== READ AND SELECT DATA ====================
const WORD_BANK: { real: WordItem[]; fake: WordItem[] } = {
  real: [
    { word: 'house', isReal: true, difficulty: 1 },
    { word: 'water', isReal: true, difficulty: 1 },
    { word: 'happy', isReal: true, difficulty: 1 },
    { word: 'green', isReal: true, difficulty: 1 },
    { word: 'table', isReal: true, difficulty: 1 },
    { word: 'music', isReal: true, difficulty: 1 },
    { word: 'apple', isReal: true, difficulty: 1 },
    { word: 'friend', isReal: true, difficulty: 1 },
    { word: 'smile', isReal: true, difficulty: 1 },
    { word: 'bread', isReal: true, difficulty: 1 },
    { word: 'journey', isReal: true, difficulty: 2 },
    { word: 'believe', isReal: true, difficulty: 2 },
    { word: 'ancient', isReal: true, difficulty: 2 },
    { word: 'weather', isReal: true, difficulty: 2 },
    { word: 'nervous', isReal: true, difficulty: 2 },
    { word: 'balance', isReal: true, difficulty: 2 },
    { word: 'capture', isReal: true, difficulty: 2 },
    { word: 'deliver', isReal: true, difficulty: 2 },
    { word: 'explore', isReal: true, difficulty: 2 },
    { word: 'promise', isReal: true, difficulty: 2 },
    { word: 'peculiar', isReal: true, difficulty: 3 },
    { word: 'hesitate', isReal: true, difficulty: 3 },
    { word: 'elaborate', isReal: true, difficulty: 3 },
    { word: 'negotiate', isReal: true, difficulty: 3 },
    { word: 'phenomenon', isReal: true, difficulty: 3 },
    { word: 'authentic', isReal: true, difficulty: 3 },
    { word: 'consensus', isReal: true, difficulty: 3 },
    { word: 'gratitude', isReal: true, difficulty: 3 },
    { word: 'diligent', isReal: true, difficulty: 3 },
    { word: 'eloquent', isReal: true, difficulty: 3 },
    { word: 'ephemeral', isReal: true, difficulty: 4 },
    { word: 'ubiquitous', isReal: true, difficulty: 4 },
    { word: 'meticulous', isReal: true, difficulty: 4 },
    { word: 'pragmatic', isReal: true, difficulty: 4 },
    { word: 'resilient', isReal: true, difficulty: 4 },
    { word: 'ambiguous', isReal: true, difficulty: 4 },
    { word: 'benevolent', isReal: true, difficulty: 4 },
    { word: 'candid', isReal: true, difficulty: 4 },
    { word: 'coherent', isReal: true, difficulty: 4 },
    { word: 'diligence', isReal: true, difficulty: 4 },
    { word: 'sycophant', isReal: true, difficulty: 5 },
    { word: 'perspicacious', isReal: true, difficulty: 5 },
    { word: 'obfuscate', isReal: true, difficulty: 5 },
    { word: 'loquacious', isReal: true, difficulty: 5 },
    { word: 'magnanimous', isReal: true, difficulty: 5 },
    { word: 'surreptitious', isReal: true, difficulty: 5 },
    { word: 'vicissitude', isReal: true, difficulty: 5 },
    { word: 'ineffable', isReal: true, difficulty: 5 },
    { word: 'recalcitrant', isReal: true, difficulty: 5 },
    { word: 'verisimilitude', isReal: true, difficulty: 5 },
  ],
  fake: [
    { word: 'hause', isReal: false, difficulty: 1 },
    { word: 'watter', isReal: false, difficulty: 1 },
    { word: 'happey', isReal: false, difficulty: 1 },
    { word: 'grean', isReal: false, difficulty: 1 },
    { word: 'tabel', isReal: false, difficulty: 1 },
    { word: 'musec', isReal: false, difficulty: 1 },
    { word: 'appel', isReal: false, difficulty: 1 },
    { word: 'freind', isReal: false, difficulty: 1 },
    { word: 'smyle', isReal: false, difficulty: 1 },
    { word: 'braed', isReal: false, difficulty: 1 },
    { word: 'journy', isReal: false, difficulty: 2 },
    { word: 'beleive', isReal: false, difficulty: 2 },
    { word: 'anciant', isReal: false, difficulty: 2 },
    { word: 'weahter', isReal: false, difficulty: 2 },
    { word: 'nervious', isReal: false, difficulty: 2 },
    { word: 'balence', isReal: false, difficulty: 2 },
    { word: 'captrure', isReal: false, difficulty: 2 },
    { word: 'delivar', isReal: false, difficulty: 2 },
    { word: 'explor', isReal: false, difficulty: 2 },
    { word: 'promiss', isReal: false, difficulty: 2 },
    { word: 'peculior', isReal: false, difficulty: 3 },
    { word: 'hestitate', isReal: false, difficulty: 3 },
    { word: 'elaborite', isReal: false, difficulty: 3 },
    { word: 'negociate', isReal: false, difficulty: 3 },
    { word: 'phenomenan', isReal: false, difficulty: 3 },
    { word: 'authentec', isReal: false, difficulty: 3 },
    { word: 'concensus', isReal: false, difficulty: 3 },
    { word: 'gratitute', isReal: false, difficulty: 3 },
    { word: 'diligant', isReal: false, difficulty: 3 },
    { word: 'eloquant', isReal: false, difficulty: 3 },
    { word: 'ephemereal', isReal: false, difficulty: 4 },
    { word: 'ubiquious', isReal: false, difficulty: 4 },
    { word: 'meticulious', isReal: false, difficulty: 4 },
    { word: 'pragmatical', isReal: false, difficulty: 4 },
    { word: 'resiliant', isReal: false, difficulty: 4 },
    { word: 'ambiguious', isReal: false, difficulty: 4 },
    { word: 'benevolant', isReal: false, difficulty: 4 },
    { word: 'candidous', isReal: false, difficulty: 4 },
    { word: 'coherant', isReal: false, difficulty: 4 },
    { word: 'diligense', isReal: false, difficulty: 4 },
    { word: 'sycophantic', isReal: false, difficulty: 5 },
    { word: 'perspicatious', isReal: false, difficulty: 5 },
    { word: 'obfusticate', isReal: false, difficulty: 5 },
    { word: 'loquatious', isReal: false, difficulty: 5 },
    { word: 'magnanimus', isReal: false, difficulty: 5 },
    { word: 'surrepitious', isReal: false, difficulty: 5 },
    { word: 'vicissitute', isReal: false, difficulty: 5 },
    { word: 'ineffible', isReal: false, difficulty: 5 },
    { word: 'recalcitrent', isReal: false, difficulty: 5 },
    { word: 'verisimilatude', isReal: false, difficulty: 5 },
  ]
};

// ==================== FILL IN THE BLANKS DATA ====================
const SENTENCE_BANK: SentenceItem[] = [
  // Common everyday sentences
  { sentence: 'The sun rises in the _____.', missingWord: 'morning' },
  { sentence: 'She drinks a cup of _____ every day.', missingWord: 'coffee' },
  { sentence: 'The children are playing in the _____.', missingWord: 'garden' },
  { sentence: 'He takes the bus to _____ every morning.', missingWord: 'work' },
  { sentence: 'Please close the _____ when you leave.', missingWord: 'door' },
  { sentence: 'The library is a quiet place to _____.', missingWord: 'study' },
  { sentence: 'She bought a new _____ for the party.', missingWord: 'dress' },
  { sentence: 'The dog is sleeping on the _____.', missingWord: 'floor' },
  { sentence: 'We need to buy some _____ for breakfast.', missingWord: 'bread' },
  { sentence: 'The weather is very _____ today.', missingWord: 'sunny' },

  // Intermediate sentences
  { sentence: 'The scientist made an important _____.', missingWord: 'discovery' },
  { sentence: 'She felt a sense of _____ after finishing.', missingWord: 'relief' },
  { sentence: 'The meeting was _____ until next week.', missingWord: 'postponed' },
  { sentence: 'He showed great _____ during the crisis.', missingWord: 'courage' },
  { sentence: 'The company is facing financial _____.', missingWord: 'difficulties' },
  { sentence: 'She received a _____ from the university.', missingWord: 'scholarship' },
  { sentence: 'The museum has an excellent _____ of art.', missingWord: 'collection' },
  { sentence: 'They made a _____ to meet every week.', missingWord: 'commitment' },
  { sentence: 'The doctor recommended regular _____.', missingWord: 'exercise' },
  { sentence: 'The project requires careful _____.', missingWord: 'planning' },

  // More challenging sentences
  { sentence: 'His _____ to detail is remarkable.', missingWord: 'attention' },
  { sentence: 'The artist found _____ in nature.', missingWord: 'inspiration' },
  { sentence: 'We need to find a _____ solution.', missingWord: 'practical' },
  { sentence: 'The _____ was held in the main hall.', missingWord: 'ceremony' },
  { sentence: 'She expressed her _____ for their help.', missingWord: 'gratitude' },
  { sentence: 'The _____ of the book is quite complex.', missingWord: 'structure' },
  { sentence: 'They reached a _____ after long talks.', missingWord: 'compromise' },
  { sentence: 'The law requires strict _____.', missingWord: 'compliance' },
  { sentence: 'Her _____ of the situation was accurate.', missingWord: 'assessment' },
  { sentence: 'The team showed excellent _____.', missingWord: 'teamwork' },
];

// ==================== READ AND COMPLETE DATA ====================
const PARAGRAPH_BANK: ParagraphItem[] = [
  {
    paragraph: 'The sun was setting over the mountains, casting a warm golden light across the valley. Sarah decided to take a _____ through the nearby forest to enjoy the cool evening air. She noticed the leaves were beginning to _____ color as autumn approached, turning from green to brilliant shades of orange and red. The birds sang their evening songs while squirrels _____ for nuts among the fallen leaves. A gentle _____ carried the sweet scent of wildflowers through the trees. As she walked deeper into the forest, she could hear a small _____ babbling over smooth stones nearby. It was a peaceful end to a beautiful day.',
    missingWords: ['walk', 'change', 'searched', 'breeze', 'stream']
  },
  {
    paragraph: 'Learning a new language requires dedication and consistent practice over many months. Many students find it helpful to _____ vocabulary words every day using flashcards or apps. Listening to native speakers can greatly _____ your pronunciation and help you understand natural speech patterns. It is also important to _____ conversations with other learners whenever possible to build confidence. Reading books and watching _____ in the target language exposes you to new expressions and cultural contexts. Taking notes and keeping a _____ of new words helps reinforce what you have learned. With patience and effort, anyone can become fluent in a second language.',
    missingWords: ['review', 'improve', 'practice', 'movies', 'journal']
  },
  {
    paragraph: 'The ancient library stood at the center of the old town, its stone walls weathered by centuries of rain and wind. Inside, thousands of books lined the wooden _____ from floor to ceiling in neat rows. Scholars would spend hours _____ through dusty volumes looking for valuable knowledge and rare manuscripts. The librarian carefully _____ each book that was returned to its proper place on the shelves. Large windows allowed natural _____ to flood the reading rooms during the day. Students sat quietly at long oak tables, taking _____ and preparing for their examinations. The library had been serving the community for over two hundred years.',
    missingWords: ['shelves', 'searching', 'placed', 'light', 'notes']
  },
  {
    paragraph: 'Healthy eating habits are essential for maintaining good physical and mental condition throughout life. Doctors recommend eating plenty of fresh fruits and _____ every day to get necessary vitamins. It is wise to _____ the amount of processed foods and sugary snacks in your diet. Drinking enough water helps your body _____ properly and keeps you energized throughout the day. Regular _____ combined with good nutrition leads to better overall wellness. Getting enough _____ each night is equally important for recovery and health. Small changes in daily habits can lead to significant improvements in how you feel.',
    missingWords: ['vegetables', 'limit', 'function', 'exercise', 'sleep']
  },
  {
    paragraph: 'The small coastal town attracted many tourists during the warm summer months from all over the country. Visitors would _____ along the sandy beaches watching the waves roll gently onto the shore. Local restaurants served fresh seafood that fishermen _____ early that very morning before sunrise. Children built elaborate sandcastles while their parents _____ under colorful umbrellas nearby reading books. Street vendors sold cold _____ and ice cream to people seeking relief from the heat. In the evenings, families would _____ on the pier to watch the spectacular sunset over the ocean. The town came alive with activity from June through August.',
    missingWords: ['stroll', 'caught', 'relaxed', 'drinks', 'gather']
  },
  {
    paragraph: 'Technology has dramatically transformed the way we communicate and interact with each other across the world. People can now instantly _____ messages to friends and family members across the globe in seconds. Video calls allow families to stay _____ even when separated by thousands of miles and different time zones. Social media platforms help users _____ news, photos, and personal updates with their networks of friends. Online _____ has made it possible to buy almost anything without leaving your home. However, it is important to _____ time away from screens and enjoy real-world interactions. These innovations have made the world feel smaller and more accessible than ever before.',
    missingWords: ['send', 'connected', 'share', 'shopping', 'spend']
  },
  {
    paragraph: 'The art museum hosted a special exhibition featuring masterworks from famous painters throughout history. Visitors slowly _____ through the spacious galleries admiring each masterpiece carefully displayed on the walls. A knowledgeable guide would _____ the history and technique behind selected paintings to curious groups. Many guests took photographs to _____ their visit and share the experience with friends online. The museum gift shop sold prints and _____ inspired by the artwork in the collection. Special events and _____ were offered to children and adults who wanted to learn more. The exhibition ran for three months and attracted thousands of art lovers from around the region.',
    missingWords: ['walked', 'explain', 'remember', 'books', 'workshops']
  },
  {
    paragraph: 'Gardening can be a rewarding hobby that brings joy, relaxation, and fresh produce to your table. First, you need to _____ the soil carefully and remove any weeds before planting your seeds. Seeds should be _____ at the proper depth according to their specific type and requirements. Regular watering and adequate sunlight help plants _____ strong and healthy over the growing season. Adding natural _____ to the soil provides essential nutrients that plants need to thrive. Protecting your garden from pests and _____ ensures a successful harvest in the fall. With care, attention, and patience, your garden will flourish and reward you beautifully.',
    missingWords: ['prepare', 'planted', 'grow', 'fertilizer', 'insects']
  }
];

// ==================== INTERACTIVE READING DATA ====================
const INTERACTIVE_PASSAGE_BANK: InteractivePassage[] = [
  {
    passageParts: [
      // Part 0 - Introduction
      "Climate change represents one of the most [BLANK_1] challenges facing humanity in the twenty-first century. Scientists around the world have documented rising global [BLANK_2], melting ice caps, and increasingly severe weather patterns.",
      // Part 1 - Contains blanks
      "The primary cause of this global warming is the increased concentration of greenhouse gases in the [BLANK_3]. Carbon dioxide, released mainly through the burning of [BLANK_4] fuels like coal and oil, traps heat that would otherwise escape into space.",
      // Part 2 - Contains blanks
      "The [BLANK_5] of climate change extend far beyond rising temperatures. Coastal communities face threats from rising sea levels, while [BLANK_6] regions experience unpredictable growing seasons. Wildlife populations are migrating to new territories or facing extinction as their habitats transform.",
      // Part 3 - After this comes the gap for "Complete the Passage"
      "Governments and organizations worldwide have begun implementing [BLANK_7] to address these challenges. International agreements like the Paris Accord aim to limit global temperature increases by reducing carbon emissions.",
      // Gap position: after part 3, before part 4
      // Part 4 - Contains highlight answers
      "Renewable energy sources such as solar and wind power have become increasingly cost-effective alternatives to fossil fuels. Many countries have set ambitious targets to achieve carbon neutrality by 2050, recognizing that immediate action is essential to prevent the most catastrophic effects of climate change.",
      // Part 5 - Conclusion
      "While the challenge is immense, there is growing [BLANK_8] that sustainable solutions exist. Through international cooperation, technological innovation, and individual action, humanity has the potential to mitigate the worst effects of climate change and build a more sustainable future for generations to come."
    ],
    sentenceBlanks: [
      {
        partIndex: 0,
        blankText: '[BLANK_1]',
        options: ['significant', 'minor', 'temporary', 'imaginary'],
        correctIndex: 0
      },
      {
        partIndex: 0,
        blankText: '[BLANK_2]',
        options: ['temperatures', 'populations', 'economies', 'forests'],
        correctIndex: 0
      },
      {
        partIndex: 1,
        blankText: '[BLANK_3]',
        options: ['atmosphere', 'ocean', 'ground', 'forest'],
        correctIndex: 0
      },
      {
        partIndex: 1,
        blankText: '[BLANK_4]',
        options: ['renewable', 'fossil', 'nuclear', 'natural'],
        correctIndex: 1
      },
      {
        partIndex: 2,
        blankText: '[BLANK_5]',
        options: ['consequences', 'benefits', 'origins', 'predictions'],
        correctIndex: 0
      },
      {
        partIndex: 2,
        blankText: '[BLANK_6]',
        options: ['agricultural', 'industrial', 'commercial', 'residential'],
        correctIndex: 0
      },
      {
        partIndex: 3,
        blankText: '[BLANK_7]',
        options: ['strategies', 'obstacles', 'excuses', 'celebrations'],
        correctIndex: 0
      },
      {
        partIndex: 5,
        blankText: '[BLANK_8]',
        options: ['consensus', 'confusion', 'conflict', 'silence'],
        correctIndex: 0
      }
    ],
    passageGap: {
      gapPosition: 3, // Gap appears after part 3
      options: [
        'However, critics argue that these measures are insufficient given the scale of the problem.',
        'The weather has become much warmer in recent years.',
        'Many people enjoy outdoor activities during summer.',
        'Scientists have studied climate patterns for decades.'
      ],
      correctIndex: 0
    },
    highlightQuestions: [
      {
        question: 'According to the passage, what is the primary cause of global warming?',
        correctHighlight: 'increased concentration of greenhouse gases in the atmosphere',
        partIndex: 1
      },
      {
        question: 'What target have many countries set for reducing carbon emissions?',
        correctHighlight: 'carbon neutrality by 2050',
        partIndex: 4
      }
    ],
    mainIdea: {
      question: 'What is the main idea of this passage?',
      options: [
        'Climate change is a serious global challenge that requires immediate action through international cooperation and sustainable solutions.',
        'The Paris Accord has successfully solved all climate-related problems worldwide.',
        'Renewable energy is too expensive to replace fossil fuels in most countries.',
        'Wildlife populations are the only victims of climate change effects.'
      ],
      correctIndex: 0
    },
    title: {
      question: 'Which title best fits this passage?',
      options: [
        'Climate Change: Challenges and Solutions for a Sustainable Future',
        'The History of the Industrial Revolution',
        'Why Renewable Energy Will Never Work',
        'A Guide to International Politics'
      ],
      correctIndex: 0
    }
  },
  {
    passageParts: [
      // Part 0 - Introduction
      "The digital revolution has [BLANK_1] transformed how humans communicate, work, and access information. Within just a few decades, the internet has evolved from a specialized research tool into an [BLANK_2] infrastructure that connects billions of people worldwide.",
      // Part 1 - Contains blanks
      "Social media platforms have revolutionized the way people interact and share information. These digital networks enable instant [BLANK_3] across geographical boundaries, allowing friends, families, and colleagues to stay connected regardless of physical distance.",
      // Part 2
      "The workplace has experienced equally [BLANK_4] changes. Remote work, once considered unusual, has become [BLANK_5] for millions of professionals. Cloud computing and collaboration tools enable teams to work together seamlessly from different locations and time zones.",
      // Part 3 - Before gap
      "Education has also embraced digital [BLANK_6]. Online learning platforms offer courses from prestigious universities to students anywhere in the world.",
      // Gap after part 3
      // Part 4 - Contains highlight answers
      "Despite these benefits, the digital divide remains a [BLANK_7] concern. Approximately three billion people still lack reliable internet access, creating inequalities in educational and economic opportunities. Bridging this gap has become a priority for governments and international organizations.",
      // Part 5 - Conclusion
      "As technology continues to advance at an unprecedented pace, societies must grapple with both its opportunities and challenges. The decisions made today about digital governance, privacy, and access will shape the [BLANK_8] landscape for generations to come."
    ],
    sentenceBlanks: [
      {
        partIndex: 0,
        blankText: '[BLANK_1]',
        options: ['fundamentally', 'slightly', 'temporarily', 'negatively'],
        correctIndex: 0
      },
      {
        partIndex: 0,
        blankText: '[BLANK_2]',
        options: ['essential', 'optional', 'outdated', 'dangerous'],
        correctIndex: 0
      },
      {
        partIndex: 1,
        blankText: '[BLANK_3]',
        options: ['barriers', 'communication', 'isolation', 'competition'],
        correctIndex: 1
      },
      {
        partIndex: 2,
        blankText: '[BLANK_4]',
        options: ['dramatic', 'minor', 'invisible', 'negative'],
        correctIndex: 0
      },
      {
        partIndex: 2,
        blankText: '[BLANK_5]',
        options: ['mainstream', 'illegal', 'impossible', 'rare'],
        correctIndex: 0
      },
      {
        partIndex: 3,
        blankText: '[BLANK_6]',
        options: ['transformation', 'resistance', 'isolation', 'decline'],
        correctIndex: 0
      },
      {
        partIndex: 4,
        blankText: '[BLANK_7]',
        options: ['significant', 'minor', 'solved', 'imaginary'],
        correctIndex: 0
      },
      {
        partIndex: 5,
        blankText: '[BLANK_8]',
        options: ['technological', 'agricultural', 'historical', 'geographical'],
        correctIndex: 0
      }
    ],
    passageGap: {
      gapPosition: 3,
      options: [
        'This democratization of knowledge represents one of the most significant educational shifts in history.',
        'Most students prefer traditional classroom settings.',
        'Computers are becoming less important in modern society.',
        'The internet was invented in the 1990s by scientists.'
      ],
      correctIndex: 0
    },
    highlightQuestions: [
      {
        question: 'According to the passage, how many people still lack reliable internet access?',
        correctHighlight: 'three billion people',
        partIndex: 4
      },
      {
        question: 'What concern has the spread of social media raised according to the passage?',
        correctHighlight: 'privacy and the spread of misinformation',
        partIndex: 1
      }
    ],
    mainIdea: {
      question: 'What is the main idea of this passage?',
      options: [
        'The digital revolution has transformed communication, work, and education, but challenges like the digital divide must be addressed.',
        'Social media has only negative effects on society.',
        'Remote work is impossible without proper technology.',
        'The internet should be restricted to prevent misinformation.'
      ],
      correctIndex: 0
    },
    title: {
      question: 'Which title best fits this passage?',
      options: [
        'The Digital Revolution: Transforming Society in the Information Age',
        'Why Social Media Is Dangerous',
        'A Brief History of Computers',
        'The End of Traditional Education'
      ],
      correctIndex: 0
    }
  }
];

const INTERACTIVE_READING_TOTAL_SECONDS = 480; // 8 minutes

const READ_SELECT_SECONDS_PER_WORD = 5;
const READ_SELECT_TOTAL_WORDS = 10;
const FILL_BLANKS_SECONDS_PER_SENTENCE = 20;
const FILL_BLANKS_MIN_QUESTIONS = 6;
const FILL_BLANKS_MAX_QUESTIONS = 9;
const READ_COMPLETE_TOTAL_SECONDS = 180; // 3 minutes

export default function ReadingRunnerClient({
  sessionId,
  supabaseUserId,
  readingType,
  adaptivePromptData,
  promptId
}: ReadingRunnerClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('instructions');

  // Read and Select state
  const [words, setWords] = useState<WordItem[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordResults, setWordResults] = useState<WordResult[]>([]);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);

  // Fill in the Blanks state
  const [sentences, setSentences] = useState<ActiveSentence[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentenceResults, setSentenceResults] = useState<SentenceResult[]>([]);
  const [letterInputs, setLetterInputs] = useState<string[]>([]); // One input per letter position
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Read and Complete state
  const [activeParagraph, setActiveParagraph] = useState<ActiveParagraph | null>(null);
  const [paragraphLetterInputs, setParagraphLetterInputs] = useState<string[][]>([]); // One array per word
  const [paragraphWordResults, setParagraphWordResults] = useState<ParagraphWordResult[]>([]);
  const paragraphInputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const [activeParagraphWordIndex, setActiveParagraphWordIndex] = useState<number>(0);
  const [activeParagraphLetterIndex, setActiveParagraphLetterIndex] = useState<number | null>(null);

  // Interactive Reading state
  const [activeInteractivePassage, setActiveInteractivePassage] = useState<InteractivePassage | null>(null);
  const [interactiveQuestionIndex, setInteractiveQuestionIndex] = useState(0); // 0-5 for 6 questions
  const [sentenceBlankAnswers, setSentenceBlankAnswers] = useState<(number | null)[]>([]);
  const [passageGapAnswer, setPassageGapAnswer] = useState<number | null>(null);
  const [highlightAnswers, setHighlightAnswers] = useState<string[]>(['', '']);
  const [mainIdeaAnswer, setMainIdeaAnswer] = useState<number | null>(null);
  const [titleAnswer, setTitleAnswer] = useState<number | null>(null);
  const [interactiveResults, setInteractiveResults] = useState<InteractiveResult[]>([]);
  const passageRef = useRef<HTMLDivElement>(null);

  // Word-based selection state for highlighting
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ partIndex: number; wordIndex: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ partIndex: number; wordIndex: number } | null>(null);

  // Shared state
  const [timeRemaining, setTimeRemaining] = useState(
    readingType === 'interactive_reading' ? INTERACTIVE_READING_TOTAL_SECONDS :
    readingType === 'read_and_complete' ? READ_COMPLETE_TOTAL_SECONDS :
    readingType === 'fill_in_the_blanks' ? FILL_BLANKS_SECONDS_PER_SENTENCE : READ_SELECT_SECONDS_PER_WORD
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAnsweredRef = useRef(false);
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);

  // ==================== READ AND SELECT FUNCTIONS ====================
  const getWordAtDifficulty = useCallback((difficulty: number, usedWords: Set<string>): WordItem | null => {
    const targetDifficulty = Math.max(1, Math.min(5, difficulty));
    const isReal = Math.random() > 0.5;
    const pool = isReal ? WORD_BANK.real : WORD_BANK.fake;
    const availableWords = pool.filter(w => w.difficulty === targetDifficulty && !usedWords.has(w.word));
    if (availableWords.length === 0) {
      const allAvailable = pool.filter(w => !usedWords.has(w.word));
      if (allAvailable.length === 0) return null;
      return allAvailable[Math.floor(Math.random() * allAvailable.length)];
    }
    return availableWords[Math.floor(Math.random() * availableWords.length)];
  }, []);

  const generateInitialWords = useCallback(() => {
    // Use adaptive data if available
    if (adaptivePromptData?.type === 'read_and_select') {
      return adaptivePromptData.words.map(w => ({
        word: w.word,
        isReal: w.isReal,
        difficulty: w.difficulty
      }));
    }
    // Fallback to hardcoded word bank
    const sequence: WordItem[] = [];
    const usedWords = new Set<string>();
    for (let i = 0; i < READ_SELECT_TOTAL_WORDS; i++) {
      const word = getWordAtDifficulty(1, usedWords);
      if (word) {
        sequence.push(word);
        usedWords.add(word.word);
      }
    }
    return sequence;
  }, [getWordAtDifficulty, adaptivePromptData]);

  const handleWordAnswer = useCallback((answer: 'real' | 'fake') => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentWord = words[currentWordIndex];
    const isCorrect = (answer === 'real') === currentWord.isReal;

    const result: WordResult = {
      word: currentWord.word,
      isReal: currentWord.isReal,
      userAnswer: answer,
      isCorrect,
      difficulty: currentWord.difficulty
    };

    setWordResults(prev => [...prev, result]);

    if (isCorrect) {
      setConsecutiveCorrect(prev => prev + 1);
      setConsecutiveWrong(0);
      if (consecutiveCorrect >= 1) {
        setCurrentDifficulty(prev => Math.min(5, prev + 1));
        setConsecutiveCorrect(0);
      }
    } else {
      setConsecutiveWrong(prev => prev + 1);
      setConsecutiveCorrect(0);
      if (consecutiveWrong >= 1) {
        setCurrentDifficulty(prev => Math.max(1, prev - 1));
        setConsecutiveWrong(0);
      }
    }

    if (currentWordIndex < words.length - 1) {
      const usedWords = new Set(words.map(w => w.word));
      const nextWord = getWordAtDifficulty(currentDifficulty, usedWords);
      if (nextWord) {
        setWords(prev => {
          const updated = [...prev];
          updated[currentWordIndex + 1] = nextWord;
          return updated;
        });
      }
      setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
        setTimeRemaining(READ_SELECT_SECONDS_PER_WORD);
        hasAnsweredRef.current = false;
      }, 500);
    } else {
      setPhase('processing');
      setTimeout(() => setPhase('feedback'), 800);
    }
  }, [words, currentWordIndex, currentDifficulty, consecutiveCorrect, consecutiveWrong, getWordAtDifficulty]);

  const handleWordTimeout = useCallback(() => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;

    const currentWord = words[currentWordIndex];
    const result: WordResult = {
      word: currentWord.word,
      isReal: currentWord.isReal,
      userAnswer: 'timeout',
      isCorrect: false,
      difficulty: currentWord.difficulty
    };

    setWordResults(prev => [...prev, result]);
    setConsecutiveWrong(prev => prev + 1);
    setConsecutiveCorrect(0);
    if (consecutiveWrong >= 1) {
      setCurrentDifficulty(prev => Math.max(1, prev - 1));
      setConsecutiveWrong(0);
    }

    if (currentWordIndex < words.length - 1) {
      const usedWords = new Set(words.map(w => w.word));
      const nextWord = getWordAtDifficulty(currentDifficulty, usedWords);
      if (nextWord) {
        setWords(prev => {
          const updated = [...prev];
          updated[currentWordIndex + 1] = nextWord;
          return updated;
        });
      }
      setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
        setTimeRemaining(READ_SELECT_SECONDS_PER_WORD);
        hasAnsweredRef.current = false;
      }, 500);
    } else {
      setPhase('processing');
      setTimeout(() => setPhase('feedback'), 800);
    }
  }, [words, currentWordIndex, currentDifficulty, consecutiveWrong, getWordAtDifficulty]);

  // ==================== FILL IN THE BLANKS FUNCTIONS ====================
  // Generate scattered hint indices for a word
  const generateRevealedIndices = useCallback((wordLength: number): number[] => {
    // Reveal about 30-40% of letters, scattered across the word
    const numToReveal = Math.max(2, Math.min(Math.ceil(wordLength * 0.35), wordLength - 2));
    const indices: number[] = [];
    const available = Array.from({ length: wordLength }, (_, i) => i);

    // Shuffle and pick
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    return available.slice(0, numToReveal).sort((a, b) => a - b);
  }, []);

  const generateSentences = useCallback((): ActiveSentence[] => {
    // Use adaptive data if available
    if (adaptivePromptData?.type === 'fill_in_the_blanks') {
      return adaptivePromptData.sentences.map(item => ({
        sentence: item.sentence,
        missingWord: item.missingWord,
        revealedIndices: generateRevealedIndices(item.missingWord.length)
      }));
    }
    // Fallback to hardcoded sentence bank
    const count = Math.floor(Math.random() * (FILL_BLANKS_MAX_QUESTIONS - FILL_BLANKS_MIN_QUESTIONS + 1)) + FILL_BLANKS_MIN_QUESTIONS;
    const shuffled = [...SENTENCE_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(item => ({
      ...item,
      revealedIndices: generateRevealedIndices(item.missingWord.length)
    }));
  }, [generateRevealedIndices, adaptivePromptData]);

  // Build user answer from letterInputs and revealed letters
  const buildUserAnswer = useCallback((sentence: ActiveSentence, inputs: string[]): string => {
    const word = sentence.missingWord;
    return word.split('').map((char, idx) => {
      if (sentence.revealedIndices.includes(idx)) {
        return char;
      }
      return inputs[idx] || '';
    }).join('');
  }, []);

  const handleSentenceSubmit = useCallback(() => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentSentence = sentences[currentSentenceIndex];
    const userAnswer = buildUserAnswer(currentSentence, letterInputs);
    const isCorrect = userAnswer.toLowerCase() === currentSentence.missingWord.toLowerCase();

    const result: SentenceResult = {
      sentence: currentSentence.sentence,
      correctAnswer: currentSentence.missingWord,
      userAnswer: userAnswer || '(incomplete)',
      isCorrect
    };

    setSentenceResults(prev => [...prev, result]);

    if (currentSentenceIndex < sentences.length - 1) {
      setTimeout(() => {
        setCurrentSentenceIndex(prev => prev + 1);
        setTimeRemaining(FILL_BLANKS_SECONDS_PER_SENTENCE);
        // Initialize letter inputs for next sentence
        const nextSentence = sentences[currentSentenceIndex + 1];
        setLetterInputs(new Array(nextSentence.missingWord.length).fill(''));
        setActiveInputIndex(null); // Reset active index, will be set by useEffect
        hasAnsweredRef.current = false;
      }, 500);
    } else {
      setPhase('processing');
      setTimeout(() => setPhase('feedback'), 800);
    }
  }, [sentences, currentSentenceIndex, letterInputs, buildUserAnswer]);

  const handleSentenceTimeout = useCallback(() => {
    if (hasAnsweredRef.current) return;
    hasAnsweredRef.current = true;

    const currentSentence = sentences[currentSentenceIndex];
    const userAnswer = buildUserAnswer(currentSentence, letterInputs);

    const result: SentenceResult = {
      sentence: currentSentence.sentence,
      correctAnswer: currentSentence.missingWord,
      userAnswer: userAnswer || '(no answer)',
      isCorrect: false
    };

    setSentenceResults(prev => [...prev, result]);

    if (currentSentenceIndex < sentences.length - 1) {
      setTimeout(() => {
        setCurrentSentenceIndex(prev => prev + 1);
        setTimeRemaining(FILL_BLANKS_SECONDS_PER_SENTENCE);
        const nextSentence = sentences[currentSentenceIndex + 1];
        setLetterInputs(new Array(nextSentence.missingWord.length).fill(''));
        setActiveInputIndex(null); // Reset active index, will be set by useEffect
        hasAnsweredRef.current = false;
      }, 500);
    } else {
      setPhase('processing');
      setTimeout(() => setPhase('feedback'), 800);
    }
  }, [sentences, currentSentenceIndex, letterInputs, buildUserAnswer]);

  // Handle letter input change
  const handleLetterChange = useCallback((index: number, value: string) => {
    const char = value.slice(-1).toLowerCase(); // Take only last character
    setLetterInputs(prev => {
      const updated = [...prev];
      updated[index] = char;
      return updated;
    });

    // Auto-focus next empty input
    if (char && sentences[currentSentenceIndex]) {
      const currentSentence = sentences[currentSentenceIndex];
      // Find next non-revealed input
      let foundNext = false;
      for (let i = index + 1; i < currentSentence.missingWord.length; i++) {
        if (!currentSentence.revealedIndices.includes(i)) {
          inputRefs.current[i]?.focus();
          setActiveInputIndex(i);
          foundNext = true;
          break;
        }
      }
      // If no next input found, stay on current but mark as filled
      if (!foundNext) {
        setActiveInputIndex(null);
      }
    }
  }, [sentences, currentSentenceIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentSentence = sentences[currentSentenceIndex];
    if (!currentSentence) return;

    if (e.key === 'Backspace' && !letterInputs[index]) {
      // Move to previous non-revealed input
      for (let i = index - 1; i >= 0; i--) {
        if (!currentSentence.revealedIndices.includes(i)) {
          inputRefs.current[i]?.focus();
          setActiveInputIndex(i);
          break;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      for (let i = index - 1; i >= 0; i--) {
        if (!currentSentence.revealedIndices.includes(i)) {
          inputRefs.current[i]?.focus();
          setActiveInputIndex(i);
          break;
        }
      }
    } else if (e.key === 'ArrowRight') {
      for (let i = index + 1; i < currentSentence.missingWord.length; i++) {
        if (!currentSentence.revealedIndices.includes(i)) {
          inputRefs.current[i]?.focus();
          setActiveInputIndex(i);
          break;
        }
      }
    } else if (e.key === 'Enter') {
      handleSentenceSubmit();
    }
  }, [sentences, currentSentenceIndex, letterInputs, handleSentenceSubmit]);

  // ==================== READ AND COMPLETE FUNCTIONS ====================
  const generateParagraph = useCallback((): ActiveParagraph => {
    // Use adaptive data if available
    if (adaptivePromptData?.type === 'read_and_complete') {
      return {
        paragraph: adaptivePromptData.paragraph,
        words: adaptivePromptData.missingWords.map(word => ({
          word,
          revealedIndices: generateRevealedIndices(word.length)
        }))
      };
    }
    // Fallback to hardcoded paragraph bank
    const randomIndex = Math.floor(Math.random() * PARAGRAPH_BANK.length);
    const selected = PARAGRAPH_BANK[randomIndex];

    return {
      paragraph: selected.paragraph,
      words: selected.missingWords.map(word => ({
        word,
        revealedIndices: generateRevealedIndices(word.length)
      }))
    };
  }, [generateRevealedIndices, adaptivePromptData]);

  // Build user answer for a paragraph word
  const buildParagraphWordAnswer = useCallback((wordData: ParagraphWord, inputs: string[]): string => {
    return wordData.word.split('').map((char, idx) => {
      if (wordData.revealedIndices.includes(idx)) {
        return char;
      }
      return inputs[idx] || '';
    }).join('');
  }, []);

  const handleParagraphSubmit = useCallback(() => {
    if (hasAnsweredRef.current || !activeParagraph) return;
    hasAnsweredRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Calculate results for all words
    const results: ParagraphWordResult[] = activeParagraph.words.map((wordData, wordIdx) => {
      const userAnswer = buildParagraphWordAnswer(wordData, paragraphLetterInputs[wordIdx] || []);
      const isCorrect = userAnswer.toLowerCase() === wordData.word.toLowerCase();
      return {
        word: wordData.word,
        userAnswer: userAnswer || '(incomplete)',
        isCorrect
      };
    });

    setParagraphWordResults(results);
    setPhase('processing');
    setTimeout(() => setPhase('feedback'), 800);
  }, [activeParagraph, paragraphLetterInputs, buildParagraphWordAnswer]);

  const handleParagraphTimeout = useCallback(() => {
    if (hasAnsweredRef.current || !activeParagraph) return;
    hasAnsweredRef.current = true;

    // Calculate results for all words
    const results: ParagraphWordResult[] = activeParagraph.words.map((wordData, wordIdx) => {
      const userAnswer = buildParagraphWordAnswer(wordData, paragraphLetterInputs[wordIdx] || []);
      return {
        word: wordData.word,
        userAnswer: userAnswer || '(no answer)',
        isCorrect: userAnswer.toLowerCase() === wordData.word.toLowerCase()
      };
    });

    setParagraphWordResults(results);
    setPhase('processing');
    setTimeout(() => setPhase('feedback'), 800);
  }, [activeParagraph, paragraphLetterInputs, buildParagraphWordAnswer]);

  // Handle letter input change for paragraph
  const handleParagraphLetterChange = useCallback((wordIndex: number, letterIndex: number, value: string) => {
    if (!activeParagraph) return;
    const char = value.slice(-1).toLowerCase();

    setParagraphLetterInputs(prev => {
      const updated = [...prev];
      if (!updated[wordIndex]) {
        updated[wordIndex] = new Array(activeParagraph.words[wordIndex].word.length).fill('');
      }
      updated[wordIndex] = [...updated[wordIndex]];
      updated[wordIndex][letterIndex] = char;
      return updated;
    });

    // Auto-focus next empty input
    if (char) {
      const currentWord = activeParagraph.words[wordIndex];
      // First, try to find next input in current word
      let foundNext = false;
      for (let i = letterIndex + 1; i < currentWord.word.length; i++) {
        if (!currentWord.revealedIndices.includes(i)) {
          paragraphInputRefs.current[wordIndex]?.[i]?.focus();
          setActiveParagraphWordIndex(wordIndex);
          setActiveParagraphLetterIndex(i);
          foundNext = true;
          break;
        }
      }
      // If no more inputs in current word, move to next word
      if (!foundNext) {
        for (let w = wordIndex + 1; w < activeParagraph.words.length; w++) {
          const nextWord = activeParagraph.words[w];
          for (let i = 0; i < nextWord.word.length; i++) {
            if (!nextWord.revealedIndices.includes(i)) {
              paragraphInputRefs.current[w]?.[i]?.focus();
              setActiveParagraphWordIndex(w);
              setActiveParagraphLetterIndex(i);
              foundNext = true;
              break;
            }
          }
          if (foundNext) break;
        }
      }
      if (!foundNext) {
        setActiveParagraphLetterIndex(null);
      }
    }
  }, [activeParagraph]);

  // Handle keyboard navigation for paragraph
  const handleParagraphKeyDown = useCallback((wordIndex: number, letterIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeParagraph) return;
    const currentWord = activeParagraph.words[wordIndex];
    const currentInputs = paragraphLetterInputs[wordIndex] || [];

    if (e.key === 'Backspace' && !currentInputs[letterIndex]) {
      // Move to previous non-revealed input
      let found = false;
      // First check within current word
      for (let i = letterIndex - 1; i >= 0; i--) {
        if (!currentWord.revealedIndices.includes(i)) {
          paragraphInputRefs.current[wordIndex]?.[i]?.focus();
          setActiveParagraphWordIndex(wordIndex);
          setActiveParagraphLetterIndex(i);
          found = true;
          break;
        }
      }
      // If not found, check previous words
      if (!found) {
        for (let w = wordIndex - 1; w >= 0; w--) {
          const prevWord = activeParagraph.words[w];
          for (let i = prevWord.word.length - 1; i >= 0; i--) {
            if (!prevWord.revealedIndices.includes(i)) {
              paragraphInputRefs.current[w]?.[i]?.focus();
              setActiveParagraphWordIndex(w);
              setActiveParagraphLetterIndex(i);
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    } else if (e.key === 'Enter') {
      handleParagraphSubmit();
    }
  }, [activeParagraph, paragraphLetterInputs, handleParagraphSubmit]);

  // ==================== INTERACTIVE READING FUNCTIONS ====================
  // Word-based selection handlers for highlighting
  const handleWordMouseDown = useCallback((partIndex: number, wordIndex: number) => {
    if (interactiveQuestionIndex !== 2 && interactiveQuestionIndex !== 3) return;
    setIsSelecting(true);
    setSelectionStart({ partIndex, wordIndex });
    setSelectionEnd({ partIndex, wordIndex });
  }, [interactiveQuestionIndex]);

  const handleWordMouseEnter = useCallback((partIndex: number, wordIndex: number) => {
    if (!isSelecting) return;
    setSelectionEnd({ partIndex, wordIndex });
  }, [isSelecting]);

  const handleWordMouseUp = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd || !activeInteractivePassage) {
      setIsSelecting(false);
      return;
    }

    // Build the selected text from the words
    const allWords: { partIndex: number; wordIndex: number; word: string }[] = [];
    activeInteractivePassage.passageParts.forEach((part, pIdx) => {
      // Split part into words, preserving their positions
      const words = part.split(/(\s+)/).filter(w => w.trim().length > 0);
      words.forEach((word, wIdx) => {
        allWords.push({ partIndex: pIdx, wordIndex: wIdx, word: word.trim() });
      });
    });

    // Find start and end indices in the flat array
    const startFlatIdx = allWords.findIndex(
      w => w.partIndex === selectionStart.partIndex && w.wordIndex === selectionStart.wordIndex
    );
    const endFlatIdx = allWords.findIndex(
      w => w.partIndex === selectionEnd.partIndex && w.wordIndex === selectionEnd.wordIndex
    );

    if (startFlatIdx === -1 || endFlatIdx === -1) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // Get the range (handle reverse selection)
    const minIdx = Math.min(startFlatIdx, endFlatIdx);
    const maxIdx = Math.max(startFlatIdx, endFlatIdx);

    // Build selected text
    const selectedWords = allWords.slice(minIdx, maxIdx + 1).map(w => w.word);
    const selectedText = selectedWords.join(' ');

    if (selectedText.length >= 2) {
      const highlightIndex = interactiveQuestionIndex === 2 ? 0 : 1;
      setHighlightAnswers(prev => {
        const updated = [...prev];
        updated[highlightIndex] = selectedText;
        return updated;
      });
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, activeInteractivePassage, interactiveQuestionIndex]);

  // Check if a word is in the current selection range
  const isWordSelected = useCallback((partIndex: number, wordIndex: number): boolean => {
    if (!isSelecting || !selectionStart || !selectionEnd || !activeInteractivePassage) return false;

    // Build flat word list to determine selection range
    const allWords: { partIndex: number; wordIndex: number }[] = [];
    activeInteractivePassage.passageParts.forEach((part, pIdx) => {
      const words = part.split(/(\s+)/).filter(w => w.trim().length > 0);
      words.forEach((_, wIdx) => {
        allWords.push({ partIndex: pIdx, wordIndex: wIdx });
      });
    });

    const currentFlatIdx = allWords.findIndex(w => w.partIndex === partIndex && w.wordIndex === wordIndex);
    const startFlatIdx = allWords.findIndex(w => w.partIndex === selectionStart.partIndex && w.wordIndex === selectionStart.wordIndex);
    const endFlatIdx = allWords.findIndex(w => w.partIndex === selectionEnd.partIndex && w.wordIndex === selectionEnd.wordIndex);

    if (currentFlatIdx === -1 || startFlatIdx === -1 || endFlatIdx === -1) return false;

    const minIdx = Math.min(startFlatIdx, endFlatIdx);
    const maxIdx = Math.max(startFlatIdx, endFlatIdx);

    return currentFlatIdx >= minIdx && currentFlatIdx <= maxIdx;
  }, [isSelecting, selectionStart, selectionEnd, activeInteractivePassage]);

  // Clear highlight
  const clearHighlight = useCallback((highlightIndex: number) => {
    setHighlightAnswers(prev => {
      const updated = [...prev];
      updated[highlightIndex] = '';
      return updated;
    });
  }, []);

  // Navigate to next question
  const goToNextQuestion = useCallback(() => {
    if (interactiveQuestionIndex < 5) {
      setInteractiveQuestionIndex(prev => prev + 1);
    }
  }, [interactiveQuestionIndex]);

  // Navigate to previous question
  const goToPreviousQuestion = useCallback(() => {
    if (interactiveQuestionIndex > 0) {
      setInteractiveQuestionIndex(prev => prev - 1);
    }
  }, [interactiveQuestionIndex]);

  // Submit all Interactive Reading answers
  const handleInteractiveSubmit = useCallback(() => {
    if (!activeInteractivePassage) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const results: InteractiveResult[] = [];

    // Question 1: Complete the Sentences
    activeInteractivePassage.sentenceBlanks.forEach((blank, idx) => {
      const userAnswerIdx = sentenceBlankAnswers[idx];
      const userAnswer = userAnswerIdx !== null ? blank.options[userAnswerIdx] : '(no answer)';
      const correctAnswer = blank.options[blank.correctIndex];
      results.push({
        questionType: 'Complete the Sentences',
        questionText: `Blank ${idx + 1}: ${blank.blankText}`,
        userAnswer,
        correctAnswer,
        isCorrect: userAnswerIdx === blank.correctIndex
      });
    });

    // Question 2: Complete the Passage
    const gapUserAnswerIdx = passageGapAnswer;
    const gapUserAnswer = gapUserAnswerIdx !== null
      ? activeInteractivePassage.passageGap.options[gapUserAnswerIdx]
      : '(no answer)';
    const gapCorrectAnswer = activeInteractivePassage.passageGap.options[activeInteractivePassage.passageGap.correctIndex];
    results.push({
      questionType: 'Complete the Passage',
      questionText: 'Select the best sentence to fill the gap',
      userAnswer: gapUserAnswer.substring(0, 50) + '...',
      correctAnswer: gapCorrectAnswer.substring(0, 50) + '...',
      isCorrect: gapUserAnswerIdx === activeInteractivePassage.passageGap.correctIndex
    });

    // Questions 3-4: Highlight the Answer
    activeInteractivePassage.highlightQuestions.forEach((hq, idx) => {
      const userHighlight = highlightAnswers[idx] || '(no answer)';
      const isCorrect = userHighlight.toLowerCase().includes(hq.correctHighlight.toLowerCase()) ||
                        hq.correctHighlight.toLowerCase().includes(userHighlight.toLowerCase());
      results.push({
        questionType: 'Highlight the Answer',
        questionText: hq.question,
        userAnswer: userHighlight.substring(0, 50) + (userHighlight.length > 50 ? '...' : ''),
        correctAnswer: hq.correctHighlight,
        isCorrect
      });
    });

    // Question 5: Identify the Idea
    const ideaUserAnswerIdx = mainIdeaAnswer;
    const ideaUserAnswer = ideaUserAnswerIdx !== null
      ? activeInteractivePassage.mainIdea.options[ideaUserAnswerIdx]
      : '(no answer)';
    const ideaCorrectAnswer = activeInteractivePassage.mainIdea.options[activeInteractivePassage.mainIdea.correctIndex];
    results.push({
      questionType: 'Identify the Idea',
      questionText: activeInteractivePassage.mainIdea.question,
      userAnswer: ideaUserAnswer.substring(0, 50) + '...',
      correctAnswer: ideaCorrectAnswer.substring(0, 50) + '...',
      isCorrect: ideaUserAnswerIdx === activeInteractivePassage.mainIdea.correctIndex
    });

    // Question 6: Title the Passage
    const titleUserAnswerIdx = titleAnswer;
    const titleUserAnswer = titleUserAnswerIdx !== null
      ? activeInteractivePassage.title.options[titleUserAnswerIdx]
      : '(no answer)';
    const titleCorrectAnswer = activeInteractivePassage.title.options[activeInteractivePassage.title.correctIndex];
    results.push({
      questionType: 'Title the Passage',
      questionText: activeInteractivePassage.title.question,
      userAnswer: titleUserAnswer,
      correctAnswer: titleCorrectAnswer,
      isCorrect: titleUserAnswerIdx === activeInteractivePassage.title.correctIndex
    });

    setInteractiveResults(results);
    setPhase('processing');
    setTimeout(() => setPhase('feedback'), 800);
  }, [activeInteractivePassage, sentenceBlankAnswers, passageGapAnswer, highlightAnswers, mainIdeaAnswer, titleAnswer]);

  // Handle timeout for Interactive Reading
  const handleInteractiveTimeout = useCallback(() => {
    handleInteractiveSubmit();
  }, [handleInteractiveSubmit]);

  // Calculate Interactive Reading score
  const calculateInteractiveScore = useCallback(() => {
    if (interactiveResults.length === 0) return 0;
    const correct = interactiveResults.filter(r => r.isCorrect).length;
    return Math.round((correct / interactiveResults.length) * 100);
  }, [interactiveResults]);

  // ==================== SHARED FUNCTIONS ====================
  const handleStartPractice = useCallback(() => {
    if (readingType === 'interactive_reading') {
      let passage: InteractivePassage;
      // Use adaptive data if available
      if (adaptivePromptData?.type === 'interactive_reading') {
        passage = {
          passageParts: adaptivePromptData.passageParts,
          sentenceBlanks: adaptivePromptData.sentenceBlanks,
          passageGap: adaptivePromptData.passageGap,
          highlightQuestions: adaptivePromptData.highlightQuestions,
          mainIdea: adaptivePromptData.mainIdea,
          title: adaptivePromptData.title_question
        };
      } else {
        // Fallback to hardcoded passage bank
        const randomIndex = Math.floor(Math.random() * INTERACTIVE_PASSAGE_BANK.length);
        passage = INTERACTIVE_PASSAGE_BANK[randomIndex];
      }
      setActiveInteractivePassage(passage);
      setInteractiveQuestionIndex(0);
      setSentenceBlankAnswers(new Array(passage.sentenceBlanks.length).fill(null));
      setPassageGapAnswer(null);
      setHighlightAnswers(['', '']);
      setMainIdeaAnswer(null);
      setTitleAnswer(null);
      setInteractiveResults([]);
      setTimeRemaining(INTERACTIVE_READING_TOTAL_SECONDS);
    } else if (readingType === 'read_and_complete') {
      const paragraph = generateParagraph();
      setActiveParagraph(paragraph);
      setParagraphWordResults([]);
      setTimeRemaining(READ_COMPLETE_TOTAL_SECONDS);
      // Initialize letter inputs for all words
      const initialInputs = paragraph.words.map(w => new Array(w.word.length).fill(''));
      setParagraphLetterInputs(initialInputs);
      // Initialize refs arrays
      paragraphInputRefs.current = paragraph.words.map(() => []);
      setActiveParagraphWordIndex(0);
      setActiveParagraphLetterIndex(null);
    } else if (readingType === 'fill_in_the_blanks') {
      const sentenceSequence = generateSentences();
      setSentences(sentenceSequence);
      setCurrentSentenceIndex(0);
      setSentenceResults([]);
      setTimeRemaining(FILL_BLANKS_SECONDS_PER_SENTENCE);
      // Initialize letter inputs for first sentence
      if (sentenceSequence.length > 0) {
        setLetterInputs(new Array(sentenceSequence[0].missingWord.length).fill(''));
      }
    } else {
      const wordSequence = generateInitialWords();
      setWords(wordSequence);
      setCurrentWordIndex(0);
      setWordResults([]);
      setTimeRemaining(READ_SELECT_SECONDS_PER_WORD);
      setCurrentDifficulty(1);
      setConsecutiveCorrect(0);
      setConsecutiveWrong(0);
    }
    hasAnsweredRef.current = false;
    setPhase('practice');
  }, [readingType, generateParagraph, generateSentences, generateInitialWords, adaptivePromptData]);

  // Focus first input when entering practice phase for fill in blanks
  useEffect(() => {
    if (phase === 'practice' && readingType === 'fill_in_the_blanks' && sentences.length > 0) {
      const currentSentence = sentences[currentSentenceIndex];
      // Focus first non-revealed input
      for (let i = 0; i < currentSentence.missingWord.length; i++) {
        if (!currentSentence.revealedIndices.includes(i)) {
          setTimeout(() => {
            inputRefs.current[i]?.focus();
            setActiveInputIndex(i);
          }, 100);
          break;
        }
      }
    }
  }, [phase, currentSentenceIndex, readingType, sentences]);

  // Focus first input when entering practice phase for read and complete
  useEffect(() => {
    if (phase === 'practice' && readingType === 'read_and_complete' && activeParagraph) {
      // Focus first non-revealed input of the first word
      const firstWord = activeParagraph.words[0];
      for (let i = 0; i < firstWord.word.length; i++) {
        if (!firstWord.revealedIndices.includes(i)) {
          setTimeout(() => {
            paragraphInputRefs.current[0]?.[i]?.focus();
            setActiveParagraphWordIndex(0);
            setActiveParagraphLetterIndex(i);
          }, 100);
          break;
        }
      }
    }
  }, [phase, readingType, activeParagraph]);

  // Timer effect
  useEffect(() => {
    if (phase !== 'practice') return;

    const handleTimeout =
      readingType === 'interactive_reading' ? handleInteractiveTimeout :
      readingType === 'read_and_complete' ? handleParagraphTimeout :
      readingType === 'fill_in_the_blanks' ? handleSentenceTimeout : handleWordTimeout;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, currentWordIndex, currentSentenceIndex, readingType, handleWordTimeout, handleSentenceTimeout, handleParagraphTimeout, handleInteractiveTimeout]);

  // Submit attempt when entering feedback phase
  useEffect(() => {
    if (phase !== 'feedback') return;

    const submitAttempt = async () => {
      let score = 0;
      let details = {};

      if (readingType === 'read_and_select') {
        score = wordResults.length > 0 ? Math.round((wordResults.filter(r => r.isCorrect).length / wordResults.length) * 100) : 0;
        details = { wordResults };
      } else if (readingType === 'fill_in_the_blanks') {
        score = sentenceResults.length > 0 ? Math.round((sentenceResults.filter(r => r.isCorrect).length / sentenceResults.length) * 100) : 0;
        details = { sentenceResults };
      } else if (readingType === 'read_and_complete') {
        score = paragraphWordResults.length > 0 ? Math.round((paragraphWordResults.filter(r => r.isCorrect).length / paragraphWordResults.length) * 100) : 0;
        details = { paragraphWordResults };
      } else if (readingType === 'interactive_reading') {
        score = interactiveResults.length > 0 ? Math.round((interactiveResults.filter(r => r.isCorrect).length / interactiveResults.length) * 100) : 0;
        details = { interactiveResults };
      }

      try {
        await fetch('/api/reading-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId: promptId,
            questionType: readingType,
            score,
            details
          })
        });
        console.log(`Reading attempt submitted: ${readingType} with score ${score}`);
      } catch (error) {
        console.error('Error submitting reading attempt:', error);
      }
    };

    submitAttempt();
  }, [phase, readingType, sessionId, promptId, wordResults, sentenceResults, paragraphWordResults, interactiveResults]);

  // Calculate scores
  const calculateWordScore = useCallback(() => {
    if (wordResults.length === 0) return 0;
    const correct = wordResults.filter(r => r.isCorrect).length;
    return Math.round((correct / wordResults.length) * 100);
  }, [wordResults]);

  const calculateSentenceScore = useCallback(() => {
    if (sentenceResults.length === 0) return 0;
    const correct = sentenceResults.filter(r => r.isCorrect).length;
    return Math.round((correct / sentenceResults.length) * 100);
  }, [sentenceResults]);

  const calculateParagraphScore = useCallback(() => {
    if (paragraphWordResults.length === 0) return 0;
    const correct = paragraphWordResults.filter(r => r.isCorrect).length;
    return Math.round((correct / paragraphWordResults.length) * 100);
  }, [paragraphWordResults]);

  // ==================== RENDER: FILL IN THE BLANKS ====================
  if (readingType === 'fill_in_the_blanks') {
    // Instructions phase
    if (phase === 'instructions') {
      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
                    <Image
                      src="/icons/fill-the-blank.png"
                      alt="Fill in the Blanks"
                      width={96}
                      height={96}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Fill in the Blanks
                  </h1>
                  <p className="text-gray-600">
                    Complete sentences by filling in the missing words
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2">How it works:</h3>
                    <ul className="text-sm text-amber-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        You&apos;ll see sentences with missing words
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        Some letters are revealed as <strong>hints</strong> scattered across the word
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        Fill in the <strong>missing letters</strong> in the grid
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        Press Enter or click Submit when ready
                      </li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">Important:</h3>
                    <ul className="text-sm text-orange-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">⏱</span>
                        You have <strong>{FILL_BLANKS_SECONDS_PER_SENTENCE} seconds</strong> per sentence
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">📝</span>
                        You&apos;ll answer {FILL_BLANKS_MIN_QUESTIONS}-{FILL_BLANKS_MAX_QUESTIONS} questions
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">💡</span>
                        Read the sentence carefully for context clues
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleStartPractice}
                  className="w-full py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-lg"
                >
                  Start Practice
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Practice phase
    if (phase === 'practice' && sentences.length > 0) {
      const currentSentence = sentences[currentSentenceIndex];
      const progress = (currentSentenceIndex / sentences.length) * 100;
      const sentenceParts = currentSentence.sentence.split('_____');
      // Check if the blank is at the start of the sentence (first word)
      const isFirstWord = sentenceParts[0].trim() === '';

      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          {/* Header with progress */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Sentence {currentSentenceIndex + 1} of {sentences.length}
                </span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold ${
                  timeRemaining <= 5 ? 'bg-red-100 text-red-700' :
                  timeRemaining <= 10 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {timeRemaining}s
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
            <div className="max-w-2xl w-full">
              {/* Sentence with inline letter grid */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <div className="text-lg sm:text-xl text-gray-900 leading-relaxed text-center flex flex-wrap items-center justify-center gap-1">
                  {sentenceParts[0] && <span>{sentenceParts[0]}</span>}

                  {/* Inline letter grid */}
                  <span className="inline-flex items-center gap-0.5 mx-1">
                    {currentSentence.missingWord.split('').map((letter, idx) => {
                      const isRevealed = currentSentence.revealedIndices.includes(idx);
                      // Only capitalize if it's the first letter AND the word is at the start of sentence
                      const shouldCapitalize = isFirstWord && idx === 0;
                      const displayLetter = shouldCapitalize ? letter.toUpperCase() : letter.toLowerCase();
                      const isActive = activeInputIndex === idx;

                      if (isRevealed) {
                        // Revealed letter - same background as rest, grey border
                        return (
                          <div
                            key={idx}
                            className="w-6 h-7 sm:w-7 sm:h-8 flex items-center justify-center bg-white border-b border-gray-300 text-base sm:text-lg font-medium text-gray-900"
                          >
                            {displayLetter}
                          </div>
                        );
                      } else {
                        // Input cell for missing letter
                        // Active: light blue bg with darker blue border
                        // Filled/inactive: white bg with grey border
                        return (
                          <input
                            key={idx}
                            ref={(el) => { inputRefs.current[idx] = el; }}
                            type="text"
                            value={letterInputs[idx] || ''}
                            onChange={(e) => handleLetterChange(idx, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(idx, e)}
                            onFocus={() => setActiveInputIndex(idx)}
                            maxLength={1}
                            className={`w-6 h-7 sm:w-7 sm:h-8 text-center text-base sm:text-lg font-medium text-gray-900 outline-none transition-all ${
                              isActive
                                ? 'bg-blue-100 border-b border-blue-500'
                                : 'bg-white border-b border-gray-300'
                            }`}
                            autoComplete="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            style={{ textTransform: shouldCapitalize ? 'uppercase' : 'lowercase' }}
                          />
                        );
                      }
                    })}
                  </span>

                  {sentenceParts[1] && <span>{sentenceParts[1]}</span>}
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
                  {currentSentence.missingWord.length} letters
                </p>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSentenceSubmit}
                className="w-full py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-lg"
              >
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Processing phase
    if (phase === 'processing') {
      return (
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Calculating your results...</p>
          </div>
        </div>
      );
    }

    // Feedback phase
    if (phase === 'feedback') {
      const score = calculateSentenceScore();
      const correctCount = sentenceResults.filter(r => r.isCorrect).length;

      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
            <div className="max-w-2xl mx-auto">
              {/* Score card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <div className="text-center mb-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-4xl font-bold ${
                      score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {score}%
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good job!' : 'Keep practicing!'}
                  </h2>
                  <p className="text-gray-600">
                    You completed {correctCount} out of {sentenceResults.length} sentences correctly
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                    <p className="text-sm text-green-600">Correct</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{sentenceResults.length - correctCount}</p>
                    <p className="text-sm text-red-600">Incorrect</p>
                  </div>
                </div>
              </div>

              {/* Results breakdown */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
                <div className="space-y-4">
                  {sentenceResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        result.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-0.5 ${
                          result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {result.isCorrect ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <p className="text-gray-900 mb-2">
                            {result.sentence.replace('_____', `[${result.correctAnswer}]`)}
                          </p>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                              Answer: {result.correctAnswer}
                            </span>
                            {!result.isCorrect && (
                              <span className="px-2 py-1 rounded bg-red-100 text-red-700">
                                Your answer: {result.userAnswer}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/app')}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Back to Home
                </button>
                <button
                  onClick={handleStartPractice}
                  className="flex-1 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // ==================== RENDER: READ AND COMPLETE ====================
  if (readingType === 'read_and_complete') {
    // Instructions phase
    if (phase === 'instructions') {
      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
                    <Image
                      src="/icons/read-and-complete.png"
                      alt="Read and Complete"
                      width={96}
                      height={96}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Read and Complete
                  </h1>
                  <p className="text-gray-600">
                    Complete a paragraph by filling in multiple missing words
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2">How it works:</h3>
                    <ul className="text-sm text-amber-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        You&apos;ll see a paragraph with <strong>multiple missing words</strong>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        Some letters are revealed as hints scattered across each word
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        Fill in the <strong>missing letters</strong> for each word
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        Use context clues from the paragraph to guess correctly
                      </li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">Important:</h3>
                    <ul className="text-sm text-orange-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">⏱</span>
                        You have <strong>3 minutes</strong> to complete the entire paragraph
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">📖</span>
                        The first and last sentences have no blanks
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">💡</span>
                        Read carefully - context is key!
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleStartPractice}
                  className="w-full py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-lg"
                >
                  Start Practice
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Practice phase
    if (phase === 'practice' && activeParagraph) {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const progress = ((READ_COMPLETE_TOTAL_SECONDS - timeRemaining) / READ_COMPLETE_TOTAL_SECONDS) * 100;

      // Split paragraph by _____ to render with inline letter grids
      const paragraphParts = activeParagraph.paragraph.split('_____');

      // Helper function to render a word's letter grid
      const renderWordGrid = (wordIndex: number) => {
        const wordData = activeParagraph.words[wordIndex];
        const wordInputs = paragraphLetterInputs[wordIndex] || [];

        return (
          <span key={wordIndex} className="inline-flex items-center gap-0.5 mx-1">
            {wordData.word.split('').map((letter, idx) => {
              const isRevealed = wordData.revealedIndices.includes(idx);
              const displayLetter = letter.toLowerCase();
              const isActive = activeParagraphWordIndex === wordIndex && activeParagraphLetterIndex === idx;

              if (isRevealed) {
                return (
                  <div
                    key={idx}
                    className="w-6 h-7 sm:w-7 sm:h-8 flex items-center justify-center bg-white border-b border-gray-300 text-base sm:text-lg font-medium text-gray-900"
                  >
                    {displayLetter}
                  </div>
                );
              } else {
                return (
                  <input
                    key={idx}
                    ref={(el) => {
                      if (!paragraphInputRefs.current[wordIndex]) {
                        paragraphInputRefs.current[wordIndex] = [];
                      }
                      paragraphInputRefs.current[wordIndex][idx] = el;
                    }}
                    type="text"
                    value={wordInputs[idx] || ''}
                    onChange={(e) => handleParagraphLetterChange(wordIndex, idx, e.target.value)}
                    onKeyDown={(e) => handleParagraphKeyDown(wordIndex, idx, e)}
                    onFocus={() => {
                      setActiveParagraphWordIndex(wordIndex);
                      setActiveParagraphLetterIndex(idx);
                    }}
                    maxLength={1}
                    className={`w-6 h-7 sm:w-7 sm:h-8 text-center text-base sm:text-lg font-medium text-gray-900 outline-none transition-all ${
                      isActive
                        ? 'bg-blue-100 border-b border-blue-500'
                        : 'bg-white border-b border-gray-300'
                    }`}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    style={{ textTransform: 'lowercase' }}
                  />
                );
              }
            })}
          </span>
        );
      };

      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          {/* Header with progress */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {activeParagraph.words.length} words to complete
                </span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold ${
                  timeRemaining <= 30 ? 'bg-red-100 text-red-700' :
                  timeRemaining <= 60 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {timeDisplay}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-2xl mx-auto">
              {/* Paragraph with inline letter grids */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <div className="text-base sm:text-lg text-gray-900 leading-relaxed">
                  {paragraphParts.map((part, index) => (
                    <span key={index}>
                      {part}
                      {index < paragraphParts.length - 1 && renderWordGrid(index)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Submit button */}
              <button
                onClick={handleParagraphSubmit}
                className="w-full py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-lg"
              >
                Submit Answers
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Processing phase
    if (phase === 'processing') {
      return (
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Calculating your results...</p>
          </div>
        </div>
      );
    }

    // Feedback phase
    if (phase === 'feedback') {
      const score = calculateParagraphScore();
      const correctCount = paragraphWordResults.filter(r => r.isCorrect).length;

      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
            <div className="max-w-2xl mx-auto">
              {/* Score card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <div className="text-center mb-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-4xl font-bold ${
                      score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {score}%
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good job!' : 'Keep practicing!'}
                  </h2>
                  <p className="text-gray-600">
                    You completed {correctCount} out of {paragraphWordResults.length} words correctly
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                    <p className="text-sm text-green-600">Correct</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{paragraphWordResults.length - correctCount}</p>
                    <p className="text-sm text-red-600">Incorrect</p>
                  </div>
                </div>
              </div>

              {/* Results breakdown */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Word Results</h3>
                <div className="space-y-3">
                  {paragraphWordResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        result.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                          result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {result.isCorrect ? '✓' : '✗'}
                        </span>
                        <div>
                          <span className="font-medium text-gray-900">
                            {result.word}
                          </span>
                          {!result.isCorrect && (
                            <span className="text-sm text-red-600 ml-2">
                              (you wrote: {result.userAnswer})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/app')}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Back to Home
                </button>
                <button
                  onClick={handleStartPractice}
                  className="flex-1 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // ==================== RENDER: INTERACTIVE READING ====================
  if (readingType === 'interactive_reading') {
    // Instructions phase
    if (phase === 'instructions') {
      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
                    <Image
                      src="/icons/interactive-reading.png"
                      alt="Interactive Reading"
                      width={96}
                      height={96}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Interactive Reading
                  </h1>
                  <p className="text-gray-600">
                    Read an academic passage and answer 6 different question types
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-amber-50 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2">Question Types:</h3>
                    <ul className="text-sm text-amber-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">1.</span>
                        <strong>Complete the Sentences</strong> - Fill in blanks with dropdown menus
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">2.</span>
                        <strong>Complete the Passage</strong> - Select the best sentence to fill a gap
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">3-4.</span>
                        <strong>Highlight the Answer</strong> - Click and drag to highlight words that answer a question
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">5.</span>
                        <strong>Identify the Idea</strong> - Choose the main theme of the passage
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">6.</span>
                        <strong>Title the Passage</strong> - Select the best title
                      </li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">Important:</h3>
                    <ul className="text-sm text-orange-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">⏱</span>
                        You have <strong>8 minutes</strong> to complete all 6 questions
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">↔️</span>
                        You can go back to previous questions to change answers
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">📖</span>
                        The passage will remain visible as you answer questions
                      </li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleStartPractice}
                  className="w-full py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-lg"
                >
                  Start Practice
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Practice phase
    if (phase === 'practice' && activeInteractivePassage) {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const progress = ((interactiveQuestionIndex + 1) / 6) * 100;

      // Get question type label
      const getQuestionLabel = () => {
        switch (interactiveQuestionIndex) {
          case 0: return 'Complete the Sentences';
          case 1: return 'Complete the Passage';
          case 2: return 'Highlight the Answer (1/2)';
          case 3: return 'Highlight the Answer (2/2)';
          case 4: return 'Identify the Idea';
          case 5: return 'Title the Passage';
          default: return '';
        }
      };

      // Render passage with blanks filled or as dropdowns
      const renderPassage = () => {
        return activeInteractivePassage.passageParts.map((part, partIndex) => {
          // Show gap marker for question 1
          const showGap = interactiveQuestionIndex === 1 && partIndex === activeInteractivePassage.passageGap.gapPosition;
          // Show selected gap answer for other questions
          const showGapAnswer = interactiveQuestionIndex !== 1 && passageGapAnswer !== null && partIndex === activeInteractivePassage.passageGap.gapPosition;

          // For question 0, render dropdowns for any part that has blanks
          const blanksInThisPart = activeInteractivePassage.sentenceBlanks.filter(b => b.partIndex === partIndex);
          if (interactiveQuestionIndex === 0 && blanksInThisPart.length > 0) {
            const blanks = blanksInThisPart;

            // Split the text by blank markers and interleave with dropdowns
            let segments: (string | { type: 'dropdown'; blankIdx: number; blank: typeof blanks[0] })[] = [];
            let remainingText = part;

            blanks.forEach((blank) => {
              // Find the global index of this blank in the full sentenceBlanks array
              const globalBlankIdx = activeInteractivePassage.sentenceBlanks.findIndex(
                b => b.blankText === blank.blankText && b.partIndex === blank.partIndex
              );
              const splitIndex = remainingText.indexOf(blank.blankText);
              if (splitIndex !== -1) {
                if (splitIndex > 0) {
                  segments.push(remainingText.substring(0, splitIndex));
                }
                segments.push({ type: 'dropdown', blankIdx: globalBlankIdx, blank });
                remainingText = remainingText.substring(splitIndex + blank.blankText.length);
              }
            });
            if (remainingText) {
              segments.push(remainingText);
            }

            return (
              <div key={partIndex}>
                <p className="mb-4 text-gray-800 leading-relaxed">
                  {segments.map((segment, segIdx) => {
                    if (typeof segment === 'string') {
                      return <span key={segIdx}>{segment}</span>;
                    } else {
                      return (
                        <select
                          key={segIdx}
                          className="inline-block mx-1 px-2 py-1 border border-amber-300 rounded bg-white text-amber-700 font-medium"
                          value={sentenceBlankAnswers[segment.blankIdx] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setSentenceBlankAnswers(prev => {
                              const updated = [...prev];
                              updated[segment.blankIdx] = value;
                              return updated;
                            });
                          }}
                        >
                          <option value="">Select...</option>
                          {segment.blank.options.map((opt, optIdx) => (
                            <option key={optIdx} value={optIdx}>{opt}</option>
                          ))}
                        </select>
                      );
                    }
                  })}
                </p>
                {showGap && (
                  <div className="my-4 p-4 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg text-center">
                    <p className="text-amber-600 font-medium">[Select a sentence to fill this gap]</p>
                  </div>
                )}
                {showGapAnswer && (
                  <p className="mb-4 text-gray-800 leading-relaxed bg-amber-50 p-2 rounded border-l-4 border-amber-400">
                    {activeInteractivePassage.passageGap.options[passageGapAnswer]}
                  </p>
                )}
              </div>
            );
          }

          // For highlight questions (2 and 3), render word-by-word with click handlers
          if (interactiveQuestionIndex === 2 || interactiveQuestionIndex === 3) {
            // First replace blanks in the text
            let processedPart = part;
            activeInteractivePassage.sentenceBlanks.forEach((blank, blankIdx) => {
              if (blank.partIndex === partIndex) {
                const answer = sentenceBlankAnswers[blankIdx];
                const displayText = answer !== null ? blank.options[answer] : '[blank]';
                processedPart = processedPart.replace(blank.blankText, displayText);
              }
            });

            // Split into words while preserving whitespace structure
            const tokens = processedPart.split(/(\s+)/);
            let wordIndex = 0;

            return (
              <div key={partIndex}>
                <p className="mb-4 text-gray-800 leading-relaxed select-none">
                  {tokens.map((token, tokenIdx) => {
                    // If it's whitespace, just render it
                    if (/^\s+$/.test(token)) {
                      return <span key={tokenIdx}>{token}</span>;
                    }
                    // It's a word - make it selectable
                    const currentWordIndex = wordIndex;
                    wordIndex++;
                    const isSelected = isWordSelected(partIndex, currentWordIndex);
                    return (
                      <span
                        key={tokenIdx}
                        className={`cursor-pointer rounded px-0.5 transition-colors ${
                          isSelected ? 'bg-amber-300 text-amber-900' : 'hover:bg-amber-100'
                        }`}
                        onMouseDown={() => handleWordMouseDown(partIndex, currentWordIndex)}
                        onMouseEnter={() => handleWordMouseEnter(partIndex, currentWordIndex)}
                      >
                        {token}
                      </span>
                    );
                  })}
                </p>
                {showGap && (
                  <div className="my-4 p-4 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg text-center">
                    <p className="text-amber-600 font-medium">[Select a sentence to fill this gap]</p>
                  </div>
                )}
                {showGapAnswer && (
                  <p className="mb-4 text-gray-800 leading-relaxed bg-amber-50 p-2 rounded border-l-4 border-amber-400">
                    {activeInteractivePassage.passageGap.options[passageGapAnswer]}
                  </p>
                )}
              </div>
            );
          }

          // For other questions/parts, show filled answers or placeholders
          let renderedPart = part;
          activeInteractivePassage.sentenceBlanks.forEach((blank, blankIdx) => {
            if (blank.partIndex === partIndex) {
              const answer = sentenceBlankAnswers[blankIdx];
              const displayText = answer !== null
                ? `<span class="px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">${blank.options[answer]}</span>`
                : `<span class="px-1 py-0.5 bg-gray-200 text-gray-500 rounded">[blank]</span>`;
              renderedPart = renderedPart.replace(blank.blankText, displayText);
            }
          });

          return (
            <div key={partIndex}>
              <p
                className="mb-4 text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderedPart }}
              />
              {showGap && (
                <div className="my-4 p-4 border-2 border-dashed border-amber-400 bg-amber-50 rounded-lg text-center">
                  <p className="text-amber-600 font-medium">[Select a sentence to fill this gap]</p>
                </div>
              )}
              {showGapAnswer && (
                <p className="mb-4 text-gray-800 leading-relaxed bg-amber-50 p-2 rounded border-l-4 border-amber-400">
                  {activeInteractivePassage.passageGap.options[passageGapAnswer]}
                </p>
              )}
            </div>
          );
        });
      };

      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          {/* Header with progress */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700">
                  Question {interactiveQuestionIndex + 1} of 6: {getQuestionLabel()}
                </span>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold ${
                  timeRemaining <= 60 ? 'bg-red-100 text-red-700' :
                  timeRemaining <= 180 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {timeDisplay}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main content - split view */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Passage panel */}
            <div
              ref={passageRef}
              className="flex-1 overflow-y-auto p-4 lg:p-6 bg-white lg:border-r border-gray-200"
              onMouseUp={handleWordMouseUp}
              onMouseLeave={() => {
                if (isSelecting) {
                  handleWordMouseUp();
                }
              }}
            >
              <div className="max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 select-none">Reading Passage</h3>
                <div className="prose prose-sm max-w-none">
                  {renderPassage()}
                </div>
              </div>
            </div>

            {/* Question panel */}
            <div className="lg:w-96 p-4 lg:p-6 bg-gray-50 overflow-y-auto">
              <div className="space-y-4">
                {/* Question 0: Complete the Sentences */}
                {interactiveQuestionIndex === 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Complete the Sentences</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Use the dropdown menus in the passage to select the best word for each blank.
                    </p>
                    <div className="space-y-2">
                      {activeInteractivePassage.sentenceBlanks.map((blank, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            sentenceBlankAnswers[idx] !== null ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-gray-700">
                            {sentenceBlankAnswers[idx] !== null ? blank.options[sentenceBlankAnswers[idx]!] : 'Not answered'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question 1: Complete the Passage */}
                {interactiveQuestionIndex === 1 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Complete the Passage</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Select the sentence that best fills the gap in the passage.
                    </p>
                    <div className="space-y-2">
                      {activeInteractivePassage.passageGap.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPassageGapAnswer(idx)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            passageGapAnswer === idx
                              ? 'border-amber-500 bg-amber-50 text-amber-900'
                              : 'border-gray-200 bg-white text-gray-800 hover:border-amber-300'
                          }`}
                        >
                          <span className="text-sm">{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions 2-3: Highlight the Answer */}
                {(interactiveQuestionIndex === 2 || interactiveQuestionIndex === 3) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Highlight the Answer</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {activeInteractivePassage.highlightQuestions[interactiveQuestionIndex - 2].question}
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Click and drag across words in the passage to highlight your answer. Words will highlight as you select them.
                    </p>
                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Your selection:</p>
                      <p className={`text-sm ${highlightAnswers[interactiveQuestionIndex - 2] ? 'text-amber-700 font-medium' : 'text-gray-400 italic'}`}>
                        {highlightAnswers[interactiveQuestionIndex - 2] || 'No text selected'}
                      </p>
                      {highlightAnswers[interactiveQuestionIndex - 2] && (
                        <button
                          onClick={() => clearHighlight(interactiveQuestionIndex - 2)}
                          className="mt-2 text-xs text-red-600 hover:text-red-700"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Question 4: Identify the Idea */}
                {interactiveQuestionIndex === 4 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Identify the Idea</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {activeInteractivePassage.mainIdea.question}
                    </p>
                    <div className="space-y-2">
                      {activeInteractivePassage.mainIdea.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMainIdeaAnswer(idx)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            mainIdeaAnswer === idx
                              ? 'border-amber-500 bg-amber-50 text-amber-900'
                              : 'border-gray-200 bg-white text-gray-800 hover:border-amber-300'
                          }`}
                        >
                          <span className="text-sm">{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question 5: Title the Passage */}
                {interactiveQuestionIndex === 5 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Title the Passage</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {activeInteractivePassage.title.question}
                    </p>
                    <div className="space-y-2">
                      {activeInteractivePassage.title.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTitleAnswer(idx)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            titleAnswer === idx
                              ? 'border-amber-500 bg-amber-50 text-amber-900'
                              : 'border-gray-200 bg-white text-gray-800 hover:border-amber-300'
                          }`}
                        >
                          <span className="text-sm font-medium">{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={interactiveQuestionIndex === 0}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      interactiveQuestionIndex === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  {interactiveQuestionIndex < 5 ? (
                    <button
                      onClick={goToNextQuestion}
                      className="flex-1 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleInteractiveSubmit}
                      className="flex-1 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Submit All
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Processing phase
    if (phase === 'processing') {
      return (
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Calculating your results...</p>
          </div>
        </div>
      );
    }

    // Feedback phase
    if (phase === 'feedback') {
      const score = calculateInteractiveScore();
      const correctCount = interactiveResults.filter(r => r.isCorrect).length;

      return (
        <div className="h-screen bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
            <div className="max-w-2xl mx-auto">
              {/* Score card */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <div className="text-center mb-6">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-4xl font-bold ${
                      score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {score}%
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good job!' : 'Keep practicing!'}
                  </h2>
                  <p className="text-gray-600">
                    You answered {correctCount} out of {interactiveResults.length} questions correctly
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                    <p className="text-sm text-green-600">Correct</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{interactiveResults.length - correctCount}</p>
                    <p className="text-sm text-red-600">Incorrect</p>
                  </div>
                </div>
              </div>

              {/* Results breakdown */}
              <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Results</h3>
                <div className="space-y-3">
                  {interactiveResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        result.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 mt-0.5 ${
                          result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {result.isCorrect ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{result.questionType}</p>
                          <p className="text-xs text-gray-600 mt-1">{result.questionText}</p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-green-700">
                              <span className="font-medium">Correct:</span> {result.correctAnswer}
                            </p>
                            {!result.isCorrect && (
                              <p className="text-red-700">
                                <span className="font-medium">Your answer:</span> {result.userAnswer}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/app')}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Back to Home
                </button>
                <button
                  onClick={handleStartPractice}
                  className="flex-1 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // ==================== RENDER: READ AND SELECT ====================
  // Instructions phase
  if (phase === 'instructions') {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <Image
                    src="/icons/read-and-select.png"
                    alt="Read and Select"
                    width={96}
                    height={96}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Read and Select
                </h1>
                <p className="text-gray-600">
                  Test your vocabulary by identifying real English words
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-amber-50 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">How it works:</h3>
                  <ul className="text-sm text-amber-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      You&apos;ll see {READ_SELECT_TOTAL_WORDS} words, one at a time
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      Decide if each word is <strong>Real</strong> or <strong>Fake</strong>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      You have {READ_SELECT_SECONDS_PER_WORD} seconds per word
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      Difficulty adapts to your performance
                    </li>
                  </ul>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">Important:</h3>
                  <ul className="text-sm text-orange-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">⏱</span>
                      If time runs out, it counts as wrong
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">⚠️</span>
                      Watch out for spelling tricks and fake words!
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">📈</span>
                      Get answers right to face harder words
                    </li>
                  </ul>
                </div>
              </div>

              <button
                onClick={handleStartPractice}
                className="w-full py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors text-lg shadow-lg"
              >
                Start Practice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Practice phase
  if (phase === 'practice' && words.length > 0) {
    const currentWord = words[currentWordIndex];
    const progress = (currentWordIndex / words.length) * 100;

    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        {/* Header with progress */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Word {currentWordIndex + 1} of {words.length}
              </span>
              <span className="text-sm text-gray-500">
                Level {currentDifficulty}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="max-w-md w-full">
            {/* Timer */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-2xl ${
                timeRemaining <= 2 ? 'bg-red-100 text-red-700' :
                timeRemaining <= 3 ? 'bg-orange-100 text-orange-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {timeRemaining}
              </div>
            </div>

            {/* Word display */}
            <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 mb-8">
              <p className="text-4xl sm:text-5xl font-bold text-center text-gray-900">
                {currentWord.word}
              </p>
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleWordAnswer('real')}
                className="py-5 bg-green-500 text-white font-bold text-xl rounded-xl hover:bg-green-600 transition-colors shadow-lg"
              >
                Real
              </button>
              <button
                onClick={() => handleWordAnswer('fake')}
                className="py-5 bg-red-500 text-white font-bold text-xl rounded-xl hover:bg-red-600 transition-colors shadow-lg"
              >
                Fake
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing phase
  if (phase === 'processing') {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Calculating your results...</p>
        </div>
      </div>
    );
  }

  // Feedback phase
  if (phase === 'feedback') {
    const score = calculateWordScore();
    const correctCount = wordResults.filter(r => r.isCorrect).length;
    const timeoutCount = wordResults.filter(r => r.userAnswer === 'timeout').length;
    const avgDifficulty = wordResults.length > 0
      ? (wordResults.reduce((sum, r) => sum + r.difficulty, 0) / wordResults.length).toFixed(1)
      : '1.0';

    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6">
          <div className="max-w-2xl mx-auto">
            {/* Score card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
              <div className="text-center mb-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <span className={`text-4xl font-bold ${
                    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {score}%
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good job!' : 'Keep practicing!'}
                </h2>
                <p className="text-gray-600">
                  You got {correctCount} out of {wordResults.length} words correct
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{correctCount}</p>
                  <p className="text-xs text-green-600">Correct</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{wordResults.length - correctCount - timeoutCount}</p>
                  <p className="text-xs text-red-600">Wrong</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-700">{timeoutCount}</p>
                  <p className="text-xs text-gray-600">Timeout</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-sm text-amber-800">
                  Average Difficulty Level: <span className="font-bold">{avgDifficulty}</span> / 5
                </p>
              </div>
            </div>

            {/* Results breakdown */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Word Results</h3>
              <div className="space-y-2">
                {wordResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      result.isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                        result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {result.isCorrect ? '✓' : '✗'}
                      </span>
                      <span className="font-medium text-gray-900">{result.word}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-2 py-1 rounded ${
                        result.isReal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {result.isReal ? 'Real' : 'Fake'}
                      </span>
                      {result.userAnswer === 'timeout' && (
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">
                          Timeout
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/app')}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </button>
              <button
                onClick={handleStartPractice}
                className="flex-1 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
