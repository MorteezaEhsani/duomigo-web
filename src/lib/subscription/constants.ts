/**
 * Subscription-related constants
 */

// Free tier lifetime limit (total practices allowed before requiring upgrade)
export const FREE_TIER_LIFETIME_LIMIT = 5;

// Subscription status values (matching Stripe statuses)
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
  UNPAID: 'unpaid',
  TRIALING: 'trialing',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
} as const;

// Statuses that grant premium access
export const PREMIUM_STATUSES = [
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.TRIALING,
] as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
export type PremiumStatus = typeof PREMIUM_STATUSES[number];
