'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ManualSignUpPage() {
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Manually load Clerk from the correct domain
    const script = document.createElement('script');
    const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    // Use the default Clerk CDN
    script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
    script.async = true;

    script.onload = async () => {
      console.log('Clerk script loaded successfully');

      try {
        // Initialize Clerk manually
        interface ClerkConstructor {
          new(key: string): {
            load: (options?: object) => Promise<void>;
            mountSignUp: (element: HTMLElement | null, options?: object) => void;
          };
        }
        const Clerk = (window as Window & { Clerk?: ClerkConstructor }).Clerk;
        if (Clerk && pk) {
          const clerkInstance = new Clerk(pk);
          await clerkInstance.load({
            // Force standard domain
            domain: undefined,
            // Standard sign-in/up URLs
            signInUrl: '/sign-in',
            signUpUrl: '/sign-up',
          });

          console.log('Clerk initialized successfully');
          setClerkLoaded(true);

          // Mount sign-up UI
          clerkInstance.mountSignUp(
            document.getElementById('sign-up-container'),
            {
              appearance: {
                elements: {
                  formButtonPrimary: 'bg-amber-500 hover:bg-amber-600 text-white',
                  footerActionLink: 'text-amber-600 hover:text-amber-700'
                }
              }
            }
          );
        }
      } catch (err) {
        console.error('Failed to initialize Clerk:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    script.onerror = () => {
      console.error('Failed to load Clerk script');
      setError('Failed to load Clerk script from CDN');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">Create Account</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error loading authentication</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2">Try refreshing the page or clearing your browser cache.</p>
          </div>
        )}

        {!clerkLoaded && !error && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <p className="mt-4 text-gray-600">Loading sign-up form...</p>
          </div>
        )}

        <div id="sign-up-container"></div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Already have an account? <Link href="/sign-in" className="text-amber-600 hover:text-amber-700">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}