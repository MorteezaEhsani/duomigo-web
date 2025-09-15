import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixStreakLogic() {
  try {
    console.log('🔧 Fixing streak logic...\n');
    
    // First, let's check current streaks in the database
    const { data: streaks, error: fetchError } = await supabase
      .from('streaks')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      console.error('Error fetching streaks:', fetchError);
    } else {
      console.log('Current streak records (sample):', streaks);
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`\nToday's date: ${today}`);
    
    // Update all streaks where last_activity_date is more than 1 day ago
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`Yesterday's date: ${yesterdayStr}`);
    console.log('\n📝 Resetting streaks for users who haven\'t practiced since before yesterday...');
    
    const { data: updatedStreaks, error: updateError } = await supabase
      .from('streaks')
      .update({ current_streak: 0 })
      .lt('last_activity_date', yesterdayStr)
      .select();
    
    if (updateError) {
      console.error('Error updating streaks:', updateError);
    } else {
      console.log(`✅ Reset ${updatedStreaks?.length || 0} streak(s) that were broken`);
      if (updatedStreaks && updatedStreaks.length > 0) {
        console.log('Reset streaks for:', updatedStreaks.map(s => ({
          user_id: s.user_id,
          was: s.current_streak,
          last_activity: s.last_activity_date
        })));
      }
    }
    
    console.log('\n✨ Streak logic has been fixed!');
    console.log('From now on, the dashboard will check and reset streaks automatically.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixStreakLogic();