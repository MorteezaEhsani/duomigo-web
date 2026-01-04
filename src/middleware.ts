import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/api/grade(.*)',
  '/api/upload-audio(.*)',
  '/api/storage(.*)',
  '/api/attempts(.*)',
  '/api/activity(.*)',
  // Stripe routes (except webhook)
  '/api/stripe/create-checkout(.*)',
  '/api/stripe/create-portal(.*)',
  // Subscription routes
  '/api/subscription(.*)',
]);

// Webhook routes should NOT be protected (Stripe needs to call them directly)
const isWebhookRoute = createRouteMatcher([
  '/api/stripe/webhook(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth for webhook routes - Stripe needs to call these directly
  if (isWebhookRoute(req)) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};