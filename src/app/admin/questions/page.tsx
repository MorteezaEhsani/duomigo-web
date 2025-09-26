import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminQuestionsClient from './AdminQuestionsClient';

// Define admin emails - can be set via environment variable or hardcoded
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  : [
      'mortezaehsani@gmail.com', // Primary admin
      'admin@duomigo.com', // Backup admin email
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

  // Debug logging (remove in production)
  console.log('Admin access check:', {
    userEmail,
    adminEmails: ADMIN_EMAILS,
    isAdmin: userEmail ? ADMIN_EMAILS.includes(userEmail) : false
  });

  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    redirect('/app'); // Redirect non-admins to dashboard
  }

  return <AdminQuestionsClient />;
}