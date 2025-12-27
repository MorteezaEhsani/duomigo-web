import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ReadingClient from './ReadingClient';

export default async function ReadingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <ReadingClient userId={userId} />;
}
