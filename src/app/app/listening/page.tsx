import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ListeningClient from './ListeningClient';

export default async function ListeningPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <ListeningClient userId={userId} />;
}
