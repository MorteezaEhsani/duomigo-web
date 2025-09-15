import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Guard against running in browser
if (typeof window !== 'undefined') {
  throw new Error('This script must only run in Node.js environment, never in browser!');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Add your new questions here
const newQuestions = [
  // Listen then speak questions
  {
    type: 'listen_then_speak',
    prompt: 'Listen and repeat: "Guten Tag, wie geht es Ihnen?"',
    target_language: 'German',
    source_language: 'English',
    difficulty: 1,
    metadata: { audio_url: 'placeholder_audio.mp3' }
  },
  
  // Read aloud questions
  {
    type: 'read_aloud',
    prompt: 'Read this paragraph aloud: "Technology has transformed the way we communicate, work, and live our daily lives."',
    target_language: 'English',
    source_language: 'English',
    difficulty: 2,
    metadata: { expected_duration: 8 }
  },
  
  // Describe image questions
  {
    type: 'describe_image',
    prompt: 'Describe this beach scene in detail. What do you see? What are people doing?',
    target_language: 'English',
    source_language: 'English',
    difficulty: 2,
    metadata: { image_url: 'placeholder_beach.jpg', min_duration: 20 }
  },
  
  // Answer question
  {
    type: 'answer_question',
    prompt: 'What are the advantages and disadvantages of working from home?',
    target_language: 'English',
    source_language: 'English',
    difficulty: 3,
    metadata: { expected_duration: 30 }
  },
  {
    type: 'answer_question',
    prompt: 'Describe your ideal vacation destination and explain why you would like to go there.',
    target_language: 'English',
    source_language: 'English',
    difficulty: 2,
    metadata: { expected_duration: 25 }
  },
  
  // Speak on topic
  {
    type: 'speak_on_topic',
    prompt: 'Talk about the importance of learning foreign languages in today\'s globalized world.',
    target_language: 'English',
    source_language: 'English',
    difficulty: 3,
    metadata: { min_duration: 45, max_duration: 60 }
  },
  {
    type: 'speak_on_topic',
    prompt: 'Discuss your favorite hobby and how you got started with it.',
    target_language: 'English',
    source_language: 'English',
    difficulty: 2,
    metadata: { min_duration: 30, max_duration: 45 }
  }
];

async function addNewQuestions() {
  console.log('📝 Adding new questions to the database...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const question of newQuestions) {
    const { data, error } = await supabase
      .from('questions')
      .insert(question)
      .select();
    
    if (error) {
      console.error(`❌ Error inserting question:`, error);
      console.error('Question data:', question);
      errorCount++;
    } else {
      console.log(`✅ Added ${question.type}: "${question.prompt.substring(0, 50)}..."`);
      successCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully added: ${successCount} questions`);
  if (errorCount > 0) {
    console.log(`❌ Failed to add: ${errorCount} questions`);
  }
  console.log(`📚 Total questions attempted: ${newQuestions.length}`);
}

addNewQuestions()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });