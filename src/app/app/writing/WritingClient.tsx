'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase/client';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import StreakPanel from '@/components/Progress/StreakPanel';
import PracticeCard from '@/components/PracticeCard';
import Sidebar from '@/components/Sidebar';

interface WritingClientProps {
  userId: string;
}

export default function WritingClient({ userId }: WritingClientProps) {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection] = useState('writing');

  const initializeUser = async () => {
    try {
      setLoading(true);
      setError(null);

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

  const writingTypes = [
    {
      type: 'writing_sample',
      title: 'Writing Sample',
      description: 'Write about a topic (1-5 minutes)',
      bgColor: '#DBEAFE',
      iconColor: '#3B82F6',
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
      fallbackIcon: (
        <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    }
  ];

  const handleSectionClick = (sectionId: string) => {
    router.push('/app');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeSection={activeSection} onSectionClick={handleSectionClick} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Scrollable practice sections */}
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {/* Streak Panel - Mobile only */}
          <div className="lg:hidden px-4 pt-4 pb-2">
            <StreakPanel />
          </div>

          {/* Writing Practice Section */}
          <div className="px-4 lg:px-6 py-4 lg:py-6">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">
              Writing Practice
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {writingTypes.map((practice) => (
                <PracticeCard
                  key={practice.type}
                  title={practice.title}
                  description={practice.description}
                  icon={practice.fallbackIcon}
                  bgColor={practice.bgColor}
                  iconColor={practice.iconColor}
                  onClick={() => {
                    router.push(`/app/writing/practice/${practice.type}`);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar - Desktop only */}
        <div className="hidden lg:block w-[28rem] border-l border-gray-200 bg-white overflow-y-auto">
          <div className="sticky top-0 p-6">
            <StreakPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
