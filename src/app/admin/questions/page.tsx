import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminQuestionsClient from './AdminQuestionsClient';

// Define admin emails here - you should replace with your email
const ADMIN_EMAILS = [
  'your-email@example.com', // Replace with your actual email
];

export default async function AdminQuestionsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // For now, we'll check by email. You could also use Clerk's metadata or roles
  // You need to get the user's email from Clerk
  const { currentUser } = await import('@clerk/nextjs/server');
  const user = await currentUser();

  const userEmail = user?.emailAddresses[0]?.emailAddress;

  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    redirect('/app'); // Redirect non-admins to dashboard
  }

  return <AdminQuestionsClient />;
}