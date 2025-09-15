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

async function makeUserAdmin(email: string) {
  console.log(`🔐 Making user with email "${email}" an admin...\n`);
  
  // First find the user by email in profiles table
  const { data: profiles, error: userError } = await supabase
    .from('profiles')
    .select('user_id, email, display_name, is_admin')
    .eq('email', email);
  
  if (userError) {
    console.error('❌ Error finding user:', userError);
    process.exit(1);
  }
  
  if (!profiles || profiles.length === 0) {
    console.error(`❌ No user found with email: ${email}`);
    console.log('\n📝 Available users:');
    
    // List all users to help
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('email, display_name, created_at');
    
    if (allProfiles && allProfiles.length > 0) {
      allProfiles.forEach(p => {
        console.log(`  - ${p.email || 'No email'} (${p.display_name}, created: ${new Date(p.created_at).toLocaleDateString()})`);
      });
    } else {
      console.log('  No users found in database');
    }
    process.exit(1);
  }
  
  const profile = profiles[0];
  console.log(`✅ Found user: ${profile.email} (Name: ${profile.display_name})`);
  
  if (profile.is_admin) {
    console.log('ℹ️  User is already an admin!');
    process.exit(0);
  }
  
  // Update the profile to set is_admin = true
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('user_id', profile.user_id);
  
  if (updateError) {
    console.error('❌ Error updating profile:', updateError);
    process.exit(1);
  }
  
  console.log(`\n🎉 Successfully made ${email} an admin!`);
  console.log('📝 You can now access the admin panel at /app/admin/questions');
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address as an argument');
  console.log('Usage: npx tsx scripts/make-user-admin.ts your-email@example.com');
  process.exit(1);
}

makeUserAdmin(email)
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });