'use client';

import { SignUp } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignUpPage() {
  // Debug logging
  useEffect(() => {
    console.log('SignUp page mounted');
    console.log('Clerk publishable key exists:', !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
    console.log('Window location:', window.location.href);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Fallback message */}
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <div className="text-center">
          <p className="text-gray-500">Loading sign-up form...</p>
          <p className="text-xs text-gray-400 mt-2">If this message persists, please check your connection.</p>
        </div>
      </div>

      {/* Simplified SignUp component */}
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/app"
        appearance={{
          elements: {
            formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-white",
            footerActionLink: "text-amber-600 hover:text-amber-700"
          }
        }}
      />
    </div>
  );
}