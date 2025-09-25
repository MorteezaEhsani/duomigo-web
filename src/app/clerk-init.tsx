'use client';

import { useEffect } from 'react';

export function ClerkInit() {
  useEffect(() => {
    // Override any custom domain configuration
    if (typeof window !== 'undefined') {
      // Log current Clerk configuration
      console.log('Checking Clerk configuration...');

      // Get the publishable key
      const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      console.log('Publishable key type:', pk?.startsWith('pk_live_') ? 'PRODUCTION' : 'TEST');

      // Check if Clerk is trying to use a custom domain
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.src && script.src.includes('clerk.duomigo.com')) {
          console.error('FOUND CUSTOM DOMAIN SCRIPT:', script.src);
          // Remove the broken script
          script.remove();
        }
      });

      // Force Clerk to reinitialize if needed
      if ((window as any).Clerk === undefined) {
        console.log('Clerk not loaded - may be blocked by SSL error');
      }
    }
  }, []);

  return null;
}