import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function AppPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // For now, we'll just pass the Clerk user ID
  // The dashboard will handle Supabase data fetching
  return <DashboardClient userId={userId} initialStreakData={null} />;
}