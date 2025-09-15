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

async function checkQuestionTypes() {
  // Get all unique question types
  const { data, error } = await supabase
    .from('questions')
    .select('type, id');

  if (error) {
    console.error('Error:', error);
  } else if (data) {
    const uniqueTypes = [...new Set(data.map(q => q.type))];
    console.log('Unique question types in database:', uniqueTypes);
    console.log('\nQuestion count by type:');
    uniqueTypes.forEach(type => {
      const count = data.filter(q => q.type === type).length;
      console.log(`  ${type}: ${count} questions`);
    });
  }
}

checkQuestionTypes();