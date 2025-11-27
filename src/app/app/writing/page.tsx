import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import WritingClient from './WritingClient';

export default async function WritingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <WritingClient userId={userId} />;
}
