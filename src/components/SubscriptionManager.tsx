'use client';

import { useState } from 'react';
import { usePremium } from '@/hooks/usePremium';
import PremiumBadge from './PremiumBadge';

export default function SubscriptionManager() {
  const {
    isPremium,
    isLoading,
    subscription,
    freeUsage,
    createCheckout,
    createPortal,
    refetch,
  } = usePremium();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await createCheckout();
      if (url) {
        window.location.href = url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const url = await createPortal();
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/subscription/sync', { method: 'POST' });
      const data = await response.json();
      console.log('Sync result:', data);
      setSyncResult(data.message || 'Synced');
      // Refetch subscription status after sync
      console.log('Before refetch - isPremium:', isPremium);
      await refetch();
      console.log('After refetch - isPremium:', isPremium);
      // Force a page reload to ensure fresh state
      window.location.reload();
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResult('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
        {isPremium && <PremiumBadge />}
      </div>

      {isPremium && subscription ? (
        <div>
          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              You have access to all premium features.
            </p>
            {subscription.currentPeriodEnd && (
              <p className="text-sm text-gray-500">
                {subscription.cancelAtPeriodEnd ? (
                  <>
                    Your subscription ends on{' '}
                    <span className="font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </>
                ) : (
                  <>
                    Next billing date:{' '}
                    <span className="font-medium">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleManage}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Loading...' : 'Manage Subscription'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 font-medium text-sm"
              title="Sync subscription status with Stripe"
            >
              {syncing ? '...' : 'Sync'}
            </button>
          </div>
          {syncResult && (
            <p className="text-sm text-gray-600 mt-2">{syncResult}</p>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              You&apos;re on the free plan with limited practice sessions.
            </p>
            {freeUsage && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Free practices used</span>
                  <span className="font-medium text-gray-900">
                    {freeUsage.used} / {freeUsage.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      freeUsage.remaining === 0
                        ? 'bg-red-500'
                        : freeUsage.remaining <= 2
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${(freeUsage.used / freeUsage.limit) * 100}%`,
                    }}
                  />
                </div>
                {freeUsage.remaining === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    You&apos;ve used all free practices. Upgrade to continue!
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-amber-900 mb-2">
              Upgrade to Premium
            </h4>
            <ul className="text-sm text-amber-800 space-y-1 mb-3">
              <li>Unlimited practice sessions</li>
              <li>Access to all question types</li>
              <li>Detailed AI feedback</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 font-medium shadow-sm"
          >
            {loading ? 'Loading...' : 'Upgrade to Premium'}
          </button>
        </div>
      )}
    </div>
  );
}
