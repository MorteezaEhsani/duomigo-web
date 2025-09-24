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
                    avatarBox: "h-8 w-8 rounded-full",
                    userButtonBox: "flex-row-reverse",
                    userButtonTrigger: "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded-full",

                    // User menu popup styling
                    userButtonPopoverCard: "shadow-xl border-0",
                    userButtonPopoverMain: "bg-white",
                    userButtonPopoverFooter: "hidden",
                    userButtonPopoverActionButton: "hover:bg-gray-50 text-gray-700",
                    userButtonPopoverActionButtonText: "text-gray-700",
                    userButtonPopoverActionButtonIcon: "text-gray-500",

                    // Hide Clerk branding in menu
                    userPreviewMainIdentifier: "text-gray-900 font-medium",
                    userPreviewSecondaryIdentifier: "text-gray-600",
                    userButtonPopoverCustomItemButton: "hover:bg-gray-50",

                    // Profile modal styling
                    modalContent: "bg-white",
                    profileSectionTitle: "text-gray-900 font-semibold",
                    profileSectionContent: "text-gray-700",
                    formButtonPrimary: "bg-amber-500 hover:bg-amber-600 text-white",
                    badge: "bg-amber-100 text-amber-800",

                    // Hide footer with Clerk branding
                    footer: "hidden",
                    logoBox: "hidden"
                  },
                  layout: {
                    logoPlacement: "none"
                  },
                  variables: {
                    colorPrimary: "#f59e0b",
                    colorText: "#111827",
                    colorTextOnPrimaryBackground: "#ffffff",
                    borderRadius: "0.5rem"
                  }
                }}
              />
            ) : (
              <div className="flex items-center space-x-3">
                <SignInButton
                  mode="modal"
                  appearance={{
                    elements: {
                      // Hide Clerk branding
                      logoBox: "hidden",
                      footer: "hidden",

                      // Modal and card styling
                      modalContent: "bg-white",
                      card: "shadow-xl border-0 bg-white",
                      rootBox: "w-full",

                      // Header styling
                      headerTitle: "text-2xl font-bold text-gray-900",
                      headerSubtitle: "text-gray-600 mt-2",

                      // Form styling
                      formButtonPrimary:
                        "bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium normal-case shadow-sm transition-colors",
                      formFieldLabel: "text-gray-700 font-medium text-sm",
                      formFieldInput: "border-gray-300 focus:border-amber-500 focus:ring-amber-500",

                      // Links
                      footerActionLink: "text-amber-600 hover:text-amber-700 font-medium",

                      // Other elements
                      socialButtonsBlockButton:
                        "border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 font-medium"
                    },
                    layout: {
                      logoPlacement: "none"
                    },
                    variables: {
                      colorPrimary: "#f59e0b",
                      borderRadius: "0.5rem"
                    }
                  }}
                >
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