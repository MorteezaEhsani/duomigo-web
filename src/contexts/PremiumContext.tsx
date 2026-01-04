'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useUser } from '@clerk/nextjs';
import type {
  FreeUsage,
  SubscriptionInfo,
  PremiumStatus,
} from '@/types/subscription.types';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  subscription: SubscriptionInfo | null;
  freeUsage: FreeUsage | null;
  refetch: () => Promise<void>;
  createCheckout: () => Promise<string | null>;
  createPortal: () => Promise<string | null>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export function PremiumProvider({ children }: PremiumProviderProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null
  );
  const [freeUsage, setFreeUsage] = useState<FreeUsage | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!isSignedIn) {
      setIsLoading(false);
      setIsPremium(false);
      setSubscription(null);
      setFreeUsage(null);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/subscription/status');

      if (response.ok) {
        const data: PremiumStatus = await response.json();
        setIsPremium(data.isPremium);
        setSubscription(data.subscription);
        setFreeUsage(data.freeUsage);
      } else {
        console.error('Failed to fetch subscription status');
        setIsPremium(false);
        setSubscription(null);
        setFreeUsage(null);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
      setIsPremium(false);
      setSubscription(null);
      setFreeUsage(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  // Fetch status when user signs in
  useEffect(() => {
    if (isLoaded) {
      fetchStatus();
    }
  }, [isLoaded, fetchStatus]);

  // Create checkout session and return URL
  const createCheckout = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { url } = await response.json();
        return url;
      }

      const error = await response.json();
      console.error('Failed to create checkout:', error);
      return null;
    } catch (error) {
      console.error('Failed to create checkout:', error);
      return null;
    }
  }, []);

  // Create customer portal session and return URL
  const createPortal = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { url } = await response.json();
        return url;
      }

      const error = await response.json();
      console.error('Failed to create portal:', error);
      return null;
    } catch (error) {
      console.error('Failed to create portal:', error);
      return null;
    }
  }, []);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        isLoading,
        subscription,
        freeUsage,
        refetch: fetchStatus,
        createCheckout,
        createPortal,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}
