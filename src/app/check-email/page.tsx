import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function CheckEmailPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  const allEmails = user?.emailAddresses?.map(e => e.emailAddress) || [];

  // Admin emails from the admin page
  const ADMIN_EMAILS = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
    : [
        'morteezaehsani@gmail.com',
        'admin@duomigo.com',
      ];

  const isAdmin = userEmail && ADMIN_EMAILS.some(
    adminEmail => adminEmail.toLowerCase() === userEmail.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Email & Admin Check</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-lg mb-2">Your Clerk User Info</h2>
            <div className="space-y-2 text-sm">
              <p><strong>User ID:</strong> {userId}</p>
              <p><strong>Primary Email:</strong> {userEmail || 'Not found'}</p>
              <p><strong>All Emails:</strong></p>
              <ul className="list-disc list-inside ml-4">
                {allEmails.map((email, i) => (
                  <li key={i}>{email}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <h2 className="font-semibold text-lg mb-2">Admin Access Check</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Admin Emails List:</strong></p>
              <ul className="list-disc list-inside ml-4">
                {ADMIN_EMAILS.map((email, i) => (
                  <li key={i}>{email}</li>
                ))}
              </ul>
              <p className="mt-4">
                <strong>Is Admin:</strong>{' '}
                <span className={isAdmin ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {isAdmin ? 'YES ✅' : 'NO ❌'}
                </span>
              </p>
              {!isAdmin && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    Your email &quot;{userEmail}&quot; is not in the admin list.
                    Make sure it matches exactly (case-sensitive).
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <a
              href="/admin/questions"
              className="block w-full bg-amber-500 text-white text-center py-2 rounded hover:bg-amber-600"
            >
              Try Admin Page
            </a>
            <a
              href="/app"
              className="block w-full bg-gray-500 text-white text-center py-2 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}