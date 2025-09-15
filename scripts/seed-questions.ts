import { createClient } from '@supabase/supabase-js';

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

const questionTypes = [
  'listen_then_speak',
  'read_aloud',
  'describe_image',
  'answer_question',
  'speak_on_topic'
];

const sampleQuestions = [
  // Listen then speak questions
  {
    type: 'listen_then_speak',
    prompt: 'Listen to the audio and repeat: "Buenos días, ¿cómo está usted?"',
    target_language: 'Spanish',
    source_language: 'English',
    difficulty: 1,
    metadata: { audio_url: 'placeholder_audio_1.mp3' }
  },
  {
    type: 'listen_then_speak',
    prompt: 'Listen and repeat: "Je voudrais un café, s\'il vous plaît"',
    target_language: 'French',
    source_language: 'English',
    difficulty: 1,
    metadata: { audio_url: 'placeholder_audio_2.mp3' }
  },

  // Read aloud questions
  {
    type: 'read_aloud',
    prompt: 'Read this sentence aloud: "The quick brown fox jumps over the lazy dog"',
    target_language: 'English',
    source_language: 'English',
    difficulty: 1,
    metadata: { expected_duration: 5 }
  },
  {
    type: 'read_aloud',
    prompt: 'Read aloud: "Ich möchte gerne ein Glas Wasser bestellen"',
    target_language: 'German',
    source_language: 'English',
    difficulty: 2,
    metadata: { expected_duration: 6 }
  },

  // Describe image questions
  {
    type: 'describe_image',
    prompt: 'Describe what you see in this image of a busy marketplace',
    target_language: 'English',
    source_language: 'English',
    difficulty: 2,
    metadata: { image_url: 'placeholder_market.jpg', min_duration: 15 }
  },
  {
    type: 'describe_image',
    prompt: 'Describe this picture of a family having dinner',
    target_language: 'Spanish',
    source_language: 'English',
    difficulty: 2,
    metadata: { image_url: 'placeholder_dinner.jpg', min_duration: 15 }
  },

  // Answer question
  {
    type: 'answer_question',
    prompt: 'What is your favorite food and why do you like it?',
    target_language: 'English',
    source_language: 'English',
    difficulty: 1,
    metadata: { expected_duration: 10 }
  },
  {
    type: 'answer_question',
    prompt: '¿Cuál es tu pasatiempo favorito?',
    target_language: 'Spanish',
    source_language: 'Spanish',
    difficulty: 2,
    metadata: { expected_duration: 10 }
  },

  // Speak on topic
  {
    type: 'speak_on_topic',
    prompt: 'Talk about your daily routine for 30 seconds',
    target_language: 'English',
    source_language: 'English',
    difficulty: 2,
    metadata: { min_duration: 25, max_duration: 35 }
  },
  {
    type: 'speak_on_topic',
    prompt: 'Describe your hometown and what makes it special',
    target_language: 'English',
    source_language: 'English',
    difficulty: 3,
    metadata: { min_duration: 30, max_duration: 45 }
  }
];

async function seedQuestions() {
  console.log('🌱 Starting to seed questions...\n');

  // First, upsert question types
  console.log('📝 Upserting question types...');
  for (const type of questionTypes) {
    const { error } = await supabase
      .from('question_types')
      .upsert({ 
        name: type,
        description: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }, { 
        onConflict: 'name' 
      });

    if (error) {
      console.error(`❌ Error upserting question type ${type}:`, error);
    } else {
      console.log(`✅ Upserted question type: ${type}`);
    }
  }

  console.log('\n📚 Inserting sample questions...');
  
  // Insert sample questions
  for (const question of sampleQuestions) {
    const { data, error } = await supabase
      .from('questions')
      .insert(question)
      .select();

    if (error) {
      console.error(`❌ Error inserting question:`, error);
      console.error('Question data:', question);
    } else {
      console.log(`✅ Inserted ${question.type} question: "${question.prompt.substring(0, 50)}..."`);
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`Total questions inserted: ${sampleQuestions.length}`);
}

// Run the seed function
seedQuestions()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });