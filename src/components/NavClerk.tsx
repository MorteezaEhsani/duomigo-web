'use client';

import Link from 'next/link';
import { UserButton, useUser, SignInButton } from '@clerk/nextjs';

export default function NavClerk() {
  const { isLoaded, isSignedIn, user: _user } = useUser();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-zinc-900">
              Duomigo
            </Link>
            
          </div>
          
          <div className="flex items-center space-x-4">
            {!isLoaded ? (
              <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse" />
            ) : isSignedIn ? (
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8"
                  }
                }}
              />
            ) : (
              <div className="flex items-center space-x-3">
                <SignInButton mode="modal">
                  <button className="text-zinc-700 hover:text-zinc-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Sign in
                  </button>
                </SignInButton>
                <Link
                  href="/sign-up"
                  className="bg-amber-500 text-white hover:bg-amber-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}