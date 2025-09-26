'use client';

import { SignIn } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SignInPage() {
  // Debug logging
  useEffect(() => {
    console.log('SignIn page mounted');
    console.log('Clerk publishable key exists:', !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
    console.log('Window location:', window.location.href);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Fallback message */}
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <div className="text-center">
          <p className="text-gray-500">Loading sign-in form...</p>
          <p className="text-xs text-gray-400 mt-2">If this message persists, please check your connection.</p>
        </div>
      </div>

      {/* SignIn component without Clerk branding */}
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/app"
        appearance={{
          elements: {
            // Hide Clerk branding
            logoBox: "hidden",
            footer: "hidden",

            // Card and form styling
            card: "shadow-xl border-0 bg-white",
            rootBox: "mx-auto",
            formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-white font-medium",
            footerActionLink: "text-amber-600 hover:text-amber-700 font-medium",

            // Header styling
            headerTitle: "text-2xl font-bold text-gray-900",
            headerSubtitle: "text-gray-600",

            // Form fields
            formFieldInput: "border-gray-300 focus:border-amber-500 focus:ring-amber-500",
            formFieldLabel: "text-gray-700 font-medium",

            // Other elements
            socialButtonsBlockButton: "border-gray-300 hover:bg-gray-50",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-500",
            identityPreviewEditButtonIcon: "text-amber-600"
          },
          layout: {
            logoPlacement: "none",
            showOptionalFields: true
          },
          variables: {
            colorPrimary: "#f59e0b",
            colorText: "#111827",
            borderRadius: "0.5rem"
          }
        }}
      />
    </div>
  );
}