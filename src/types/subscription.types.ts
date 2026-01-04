/**
 * Subscription-related TypeScript types
 */

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'unpaid'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FreeUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PremiumStatus {
  isPremium: boolean;
  subscription: SubscriptionInfo | null;
  freeUsage: FreeUsage | null;
}

export interface UsageCheckResult {
  allowed: boolean;
  is_premium: boolean;
  remaining: number;
  limit: number;
  current_count?: number;
}
