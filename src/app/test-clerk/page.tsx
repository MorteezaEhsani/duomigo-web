'use client';

import { useAuth, useUser } from "@clerk/nextjs";

export default function TestClerkPage() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Clerk Debug Information</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-lg mb-2">Environment</h2>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify({
                publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Set (hidden)' : 'NOT SET',
                signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'NOT SET',
                signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'NOT SET',
                afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || 'NOT SET',
                afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || 'NOT SET',
              }, null, 2)}
            </pre>
          </div>

          <div>
            <h2 className="font-semibold text-lg mb-2">Auth Status</h2>
            <div className="space-y-1">
              <p>Auth Loaded: <span className={authLoaded ? "text-green-600" : "text-red-600"}>{authLoaded ? 'Yes' : 'No'}</span></p>
              <p>User Loaded: <span className={userLoaded ? "text-green-600" : "text-red-600"}>{userLoaded ? 'Yes' : 'No'}</span></p>
              <p>Signed In: <span className={isSignedIn ? "text-green-600" : "text-gray-600"}>{isSignedIn ? 'Yes' : 'No'}</span></p>
            </div>
          </div>

          {user && (
            <div>
              <h2 className="font-semibold text-lg mb-2">User Info</h2>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify({
                  id: user.id,
                  email: user.emailAddresses[0]?.emailAddress,
                  firstName: user.firstName,
                  lastName: user.lastName,
                }, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <h2 className="font-semibold text-lg mb-2">Console Check</h2>
            <p className="text-sm text-gray-600">Open browser console for additional debug information</p>
          </div>

          <div className="pt-4 border-t space-y-2">
            <a href="/sign-in" className="block w-full bg-blue-500 text-white text-center py-2 rounded hover:bg-blue-600">
              Go to Sign In
            </a>
            <a href="/sign-up" className="block w-full bg-green-500 text-white text-center py-2 rounded hover:bg-green-600">
              Go to Sign Up
            </a>
            <a href="/app" className="block w-full bg-gray-500 text-white text-center py-2 rounded hover:bg-gray-600">
              Go to App (Protected)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}