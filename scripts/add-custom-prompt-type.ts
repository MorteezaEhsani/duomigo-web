import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addCustomPromptType() {
  console.log('🔧 Adding custom_prompt to question_types table...\n');

  // Upsert the custom_prompt type
  const { error } = await supabase
    .from('question_types')
    .upsert({ 
      name: 'custom_prompt',
      description: 'User-created custom speaking prompt'
    }, { 
      onConflict: 'name' 
    });

  if (error) {
    console.error('❌ Error adding custom_prompt type:', error);
  } else {
    console.log('✅ Successfully added custom_prompt type');
  }

  // Check all types
  const { data: types } = await supabase
    .from('question_types')
    .select('*');

  console.log('\n📝 All question types:');
  types?.forEach(type => {
    console.log(`  - ${type.name}: ${type.description}`);
  });
}

addCustomPromptType()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });