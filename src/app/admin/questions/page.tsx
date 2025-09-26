import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminQuestionsClient from './AdminQuestionsClient';

// Define admin emails - can be set via environment variable or hardcoded
const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  : [
      'morteezaehsani@gmail.com', // Primary admin (corrected spelling)
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

  // Debug logging - this will show in Vercel logs
  console.log('Admin access check:', {
    userEmail,
    adminEmails: ADMIN_EMAILS,
    isAdmin: userEmail ? ADMIN_EMAILS.includes(userEmail) : false,
    emailMatch: userEmail === 'morteezaehsani@gmail.com'
  });

  // Check if user email matches admin list (case-insensitive)
  const isAdmin = userEmail && ADMIN_EMAILS.some(
    adminEmail => adminEmail.toLowerCase() === userEmail.toLowerCase()
  );

  if (!isAdmin) {
    console.log('Access denied - redirecting to /app');
    redirect('/app'); // Redirect non-admins to dashboard
  }

  return <AdminQuestionsClient />;
}