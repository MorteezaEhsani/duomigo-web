import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import SessionGuard from '@/components/SessionGuard';
import SignOutButton from '@/components/SignOutButton';
import ProfileEditForm from './ProfileEditForm';

async function getOrCreateProfile(userId: string) {
  const supabase = await createServerSupabase();
  
  // Try to get existing profile
  const result = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  let profile = result.data;
  const error = result.error;

  // If no profile exists, create one
  if (!profile || error?.code === 'PGRST116') {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: user?.email?.split('@')[0] || 'User',
        email: user?.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating profile:', insertError);
      return null;
    }

    profile = newProfile;
  }

  return profile;
}

export default async function ProfilePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const profile = await getOrCreateProfile(user.id);

  return (
    <SessionGuard>
      <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Account Information</h2>
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">User ID</p>
                    <p className="mt-1 text-sm text-zinc-900 font-mono bg-zinc-50 px-3 py-2 rounded-md">
                      {user.id}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Email</p>
                    <p className="mt-1 text-sm text-zinc-900">
                      {user.email}
                    </p>
                  </div>
                  
                  {profile && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-zinc-700">Display Name</p>
                        <p className="mt-1 text-sm text-zinc-900">
                          {profile.display_name || 'Not set'}
                        </p>
                      </div>
                      
                      {profile.created_at && (
                        <div>
                          <p className="text-sm font-medium text-zinc-700">Member Since</p>
                          <p className="mt-1 text-sm text-zinc-900">
                            {new Date(profile.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-6">
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Edit Profile</h2>
                <ProfileEditForm 
                  userId={user.id} 
                  currentDisplayName={profile?.display_name || ''} 
                />
              </div>

              <div className="border-t border-zinc-200 pt-6">
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Account Actions</h2>
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SessionGuard>
  );
}