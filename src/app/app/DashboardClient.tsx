'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase/client';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import StreakPanel from '@/components/Progress/StreakPanel';
import PracticeCard from '@/components/PracticeCard';
import { usePremium } from '@/hooks/usePremium';
import UpgradeModal from '@/components/UpgradeModal';
import WordOfTheDay from '@/components/WordOfTheDay';
interface DashboardClientProps {
  userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isPremium, freeUsage, refetch: refetchPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check for upgrade required or subscription success/canceled query params
  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    const subscription = searchParams.get('subscription');

    if (upgrade === 'required') {
      setShowUpgradeModal(true);
      // Remove query param from URL without refresh
      router.replace('/app', { scroll: false });
    }

    if (subscription === 'success') {
      // Try to sync subscription from Stripe (in case webhook didn't fire)
      const syncSubscription = async () => {
        try {
          const response = await fetch('/api/stripe/sync-subscription', {
            method: 'POST',
          });
          if (response.ok) {
            const data = await response.json();
            console.log('Subscription synced:', data);
          } else {
            console.log('Sync response:', await response.json());
          }
        } catch (err) {
          console.error('Failed to sync subscription:', err);
        }
        // Always refetch premium status after sync attempt
        await refetchPremium();
      };

      syncSubscription();
      toast.success('Welcome to Duomigo Premium! Enjoy unlimited practice.');
      router.replace('/app', { scroll: false });
    } else if (subscription === 'canceled') {
      toast.info('Subscription checkout was canceled.');
      router.replace('/app', { scroll: false });
    }
  }, [searchParams, router, refetchPremium]);

  // Refetch premium status when pathname changes to /app (returning from practice)
  // or when window gains focus (returning from Stripe checkout in new tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        refetchPremium();
      }
    };

    // Also refetch on visibility change (tab becomes visible)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refetchPremium();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refetchPremium]);

  // Refetch when navigating back to dashboard (pathname changes to /app)
  useEffect(() => {
    if (pathname === '/app' && user) {
      refetchPremium();
    }
  }, [pathname, user, refetchPremium]);

  const initializeUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure the user exists in Supabase
      const { error: mappingError } = await supabase.rpc(
        'get_or_create_user_by_clerk_id',
        {
          p_clerk_user_id: userId,
          p_email: user?.emailAddresses[0]?.emailAddress || undefined,
          p_display_name: user?.firstName || user?.username || 'User'
        }
      );

      if (mappingError) {
        console.error('Error mapping user:', mappingError);
        throw new Error('Failed to initialize user profile');
      }
    } catch (err) {
      console.error('Error initializing user:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to initialize user. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && userId) {
      initializeUser();
    }
  }, [user, userId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-red-800 text-lg font-semibold mb-2">Unable to Load Dashboard</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={initializeUser}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const skillSections = [
    {
      id: 'speaking',
      title: 'Speaking',
      practices: [
        {
          type: 'listen_then_speak',
          title: 'Listen & Speak',
          description: 'Listen to audio and respond',
          bgColor: '#DBEAFE',
          iconColor: '#3B82F6',
          iconPath: '/icons/listen-speak.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )
        },
        {
          type: 'speak_about_photo',
          title: 'Speak About Photo',
          description: 'Describe what you see',
          bgColor: '#EDE9FE',
          iconColor: '#8B5CF6',
          iconPath: '/icons/speak-photo.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )
        },
        {
          type: 'read_then_speak',
          title: 'Read & Speak',
          description: 'Read text and discuss',
          bgColor: '#D1FAE5',
          iconColor: '#10B981',
          iconPath: '/icons/read-speak.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        },
        {
          type: 'custom',
          title: 'Custom Practice',
          description: 'Create your own prompt',
          bgColor: '#FEF3C7',
          iconColor: '#F59E0B',
          isCustom: true,
          iconPath: '/icons/custom-practice.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'writing',
      title: 'Writing',
      practices: [
        {
          type: 'writing_sample',
          title: 'Writing Sample',
          description: 'Write about a topic for 5 minutes',
          bgColor: '#DBEAFE',
          iconColor: '#3B82F6',
          iconPath: '/icons/writing-sample.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        {
          type: 'interactive_writing',
          title: 'Interactive Writing',
          description: 'Write a response and follow-up',
          bgColor: '#EDE9FE',
          iconColor: '#8B5CF6',
          iconPath: '/icons/interactive-writing.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )
        },
        {
          type: 'write_about_photo',
          title: 'Write About Photo',
          description: 'Describe an image for 1 minute',
          bgColor: '#D1FAE5',
          iconColor: '#10B981',
          iconPath: '/icons/write-photo.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )
        },
        {
          type: 'custom_writing',
          title: 'Custom Prompt',
          description: 'Create your own writing prompt',
          bgColor: '#FEF3C7',
          iconColor: '#F59E0B',
          iconPath: '/icons/custom-practice.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'listening',
      title: 'Listening',
      practices: [
        {
          type: 'listen_and_type',
          title: 'Listen & Type',
          description: 'Type the statement that you hear',
          bgColor: '#DBEAFE',
          iconColor: '#3B82F6',
          iconPath: '/icons/listen-and-type.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )
        },
        {
          type: 'listen_and_respond',
          title: 'Listen & Respond',
          description: 'Respond to conversation and summarize',
          bgColor: '#EDE9FE',
          iconColor: '#8B5CF6',
          iconPath: '/icons/listen-and-respond.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          )
        },
        {
          type: 'listen_and_complete',
          title: 'Listen & Complete',
          description: 'Fill in the missing words',
          bgColor: '#D1FAE5',
          iconColor: '#10B981',
          iconPath: '/icons/listen-and-complete.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )
        },
        {
          type: 'listen_and_summarize',
          title: 'Listen & Summarize',
          description: 'Write a summary of what you heard',
          bgColor: '#FEF3C7',
          iconColor: '#F59E0B',
          iconPath: '/icons/listen-and-summarize.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'reading',
      title: 'Reading',
      practices: [
        {
          type: 'read_and_select',
          title: 'Read & Select',
          description: 'Identify real words from fake ones',
          bgColor: '#DBEAFE',
          iconColor: '#3B82F6',
          iconPath: '/icons/read-and-select.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        {
          type: 'fill_in_the_blanks',
          title: 'Fill in the Blanks',
          description: 'Complete sentences with missing words',
          bgColor: '#FEF3C7',
          iconColor: '#D97706',
          iconPath: '/icons/fill-the-blank.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          )
        },
        {
          type: 'read_and_complete',
          title: 'Read & Complete',
          description: 'Complete words in a paragraph',
          bgColor: '#D1FAE5',
          iconColor: '#10B981',
          iconPath: '/icons/read-and-complete.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        {
          type: 'interactive_reading',
          title: 'Interactive Reading',
          description: 'Academic passages with 6 question types',
          bgColor: '#EDE9FE',
          iconColor: '#7C3AED',
          iconPath: '/icons/interactive-reading.png',
          fallbackIcon: (
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        }
      ]
    }
  ];

  return (
    <>
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        remaining={freeUsage?.remaining || 0}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Scrollable practice sections */}
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {/* Premium Status Card - Mobile only */}
          <div className="lg:hidden px-4 pt-4 pb-2 space-y-3">
            {isPremium ? (
              <WordOfTheDay />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-1">Subscribe to Premium</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Unlock your full potential. Get unlimited access, daily vocabulary, and personalized AI coaching designed just for you.
                </p>
                {freeUsage && (
                  <p className="text-xs text-gray-500 mb-3">
                    You have {freeUsage.remaining} free practice{freeUsage.remaining !== 1 ? 's' : ''} left.
                  </p>
                )}
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-1/3 py-2.5 px-4 bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold rounded-full transition-colors"
                >
                  Subscribe
                </button>
              </div>
            )}
            <StreakPanel />
          </div>

          {/* All Sections Vertically Stacked */}
          <div className="px-4 lg:px-6 py-4 lg:py-6">
            {skillSections.map((section) => (
              <div
                key={section.id}
                className="mb-8 lg:mb-12"
              >
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">
                  {section.title} Practice
                </h2>
                {section.practices.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    {section.practices.map((practice) => (
                      <PracticeCard
                        key={practice.type}
                        title={practice.title}
                        description={practice.description}
                        icon={practice.fallbackIcon}
                        iconPath={practice.iconPath}
                        bgColor={practice.bgColor}
                        iconColor={practice.iconColor}
                        onClick={() => {
                          if (section.id === 'speaking') {
                            const path = ('isCustom' in practice && practice.isCustom) ? '/app/custom' : `/app/practice/${practice.type}`;
                            router.push(path);
                          } else if (section.id === 'writing') {
                            router.push(`/app/writing/practice/${practice.type}`);
                          } else if (section.id === 'listening') {
                            router.push(`/app/listening/practice/${practice.type}`);
                          } else if (section.id === 'reading') {
                            router.push(`/app/reading/practice/${practice.type}`);
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 bg-white rounded-lg border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-lg">Coming soon...</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar - Desktop only */}
        <div className="hidden lg:block w-[28rem] border-l border-gray-200 bg-white overflow-y-auto">
          <div className="sticky top-0 p-6 space-y-4">
            {/* Premium Status Card */}
            {isPremium ? (
              <WordOfTheDay />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-1">Subscribe to Premium</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Unlock your full potential. Get unlimited access, daily vocabulary, and personalized AI coaching designed just for you.
                </p>
                {freeUsage && (
                  <p className="text-xs text-gray-500 mb-3">
                    You have {freeUsage.remaining} free practice{freeUsage.remaining !== 1 ? 's' : ''} left.
                  </p>
                )}
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-1/3 py-2.5 px-4 bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold rounded-full transition-colors"
                >
                  Subscribe
                </button>
              </div>
            )}

            <StreakPanel />
          </div>
        </div>
      </div>
    </>
  );
}
