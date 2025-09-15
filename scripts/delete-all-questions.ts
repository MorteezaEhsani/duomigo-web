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

async function deleteAllQuestions() {
  console.log('⚠️  WARNING: This will delete ALL questions from the database!');
  console.log('Press Ctrl+C within 5 seconds to cancel...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('🗑️  Deleting all questions...');
  
  const { data, error, count } = await supabase
    .from('questions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible UUID)
    .select('*', { count: 'exact' });
  
  if (error) {
    console.error('❌ Error deleting questions:', error);
    process.exit(1);
  }
  
  console.log(`✅ Successfully deleted ${data?.length || 0} questions from the database`);
}

deleteAllQuestions()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });