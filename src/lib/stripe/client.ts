/**
 * Stripe client singleton for server-side operations
 * ONLY use this in server components and API routes
 */

import Stripe from 'stripe';
import { SERVER_ENV } from '../env.server';

// Create a single Stripe client instance
let stripeClient: Stripe | null = null;

/**
 * Get the Stripe client
 * This client should only be used server-side
 */
export function getStripeClient(): Stripe {
  // Return existing client if already created
  if (stripeClient) {
    return stripeClient;
  }

  // Ensure we're in a server environment
  if (typeof window !== 'undefined') {
    throw new Error('Stripe client can only be used on the server');
  }

  // Validate environment variable
  if (!SERVER_ENV.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  // Create and cache the Stripe client
  stripeClient = new Stripe(SERVER_ENV.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
    typescript: true,
  });

  return stripeClient;
}
