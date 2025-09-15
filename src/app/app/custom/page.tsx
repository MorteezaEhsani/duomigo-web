import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CustomPromptClient from './CustomPromptClient';

export default async function CustomPromptPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return <CustomPromptClient />;
}