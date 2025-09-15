'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-zinc-900">
              Duomigo
            </Link>
            
            <div className="hidden sm:block ml-10">
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className="text-zinc-700 hover:text-zinc-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Home
                </Link>
                {user && (
                  <>
                    <Link
                      href="/app"
                      className="text-zinc-700 hover:text-zinc-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      App
                    </Link>
                    <Link
                      href="/app/profile"
                      className="text-zinc-700 hover:text-zinc-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Profile
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse" />
            ) : user ? (
              <div className="flex items-center space-x-3">
                <Link href="/app/profile">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-zinc-700 hover:text-zinc-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 rounded-md text-sm font-medium transition-colors"
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