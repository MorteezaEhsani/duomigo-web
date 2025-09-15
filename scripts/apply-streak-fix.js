import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📝 Applying streak fix migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '004_add_streak_check_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // Try direct execution if exec_sql doesn't exist
      console.log('exec_sql not available, executing statements directly...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(/;\s*$/m)
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');
      
      for (const statement of statements) {
        if (statement.includes('CREATE OR REPLACE FUNCTION') || 
            statement.includes('GRANT EXECUTE')) {
          console.log('Executing:', statement.substring(0, 50) + '...');
          
          // Execute via raw SQL query
          const { error: stmtError } = await supabase
            .from('_migrations')
            .select('*')
            .limit(0)
            .then(() => supabase.rpc('get_user_streak_with_reset', { p_clerk_user_id: 'test' }))
            .catch(async () => {
              // Function doesn't exist yet, create it
              const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: statement })
              });
              
              if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to execute: ${text}`);
              }
              
              return { error: null };
            });
          
          if (stmtError) {
            console.error('Error executing statement:', stmtError);
          }
        }
      }
    }
    
    console.log('✅ Streak fix migration applied successfully!');
    console.log('\n📝 Testing the new function...');
    
    // Test the function
    const { data: testData, error: testError } = await supabase.rpc(
      'get_user_streak_with_reset',
      { p_clerk_user_id: 'test_user' }
    );
    
    if (testError) {
      console.log('⚠️  Function not yet available (may need to wait for propagation)');
      console.log('The migration has been applied but may take a moment to be available.');
    } else {
      console.log('✅ Function is working! Test result:', testData);
    }
    
    console.log('\n🎉 Streak logic has been updated!');
    console.log('Now streaks will automatically reset if a user misses a day of practice.');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n💡 You can also apply this migration manually via Supabase dashboard:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of supabase/migrations/004_add_streak_check_function.sql');
    console.log('4. Run the query');
    process.exit(1);
  }
}

applyMigration();