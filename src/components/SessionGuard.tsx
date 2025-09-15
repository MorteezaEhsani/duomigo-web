import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/supabase/server';

export default async function SessionGuard({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  
  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}