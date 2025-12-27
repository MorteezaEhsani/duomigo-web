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

interface ListeningClientProps {
  userId: string;
}

export default function ListeningClient({ userId }: ListeningClientProps) {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection] = useState('listening');

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

  const listeningTypes = [
    {
      type: 'listen_and_type',
      title: 'Listen and Type',
      description: 'Type the statement that you hear',
      bgColor: '#DBEAFE',
      iconColor: '#3B82F6',
      iconPath: '/icons/listen-and-type.png'
    },
    {
      type: 'listen_and_respond',
      title: 'Listen and Respond',
      description: 'Respond to conversation and summarize',
      bgColor: '#EDE9FE',
      iconColor: '#8B5CF6',
      iconPath: '/icons/listen-and-respond.png'
    },
    {
      type: 'listen_and_complete',
      title: 'Listen and Complete',
      description: 'Fill in the missing words',
      bgColor: '#D1FAE5',
      iconColor: '#10B981',
      iconPath: '/icons/listen-and-complete.png'
    },
    {
      type: 'listen_and_summarize',
      title: 'Listen and Summarize',
      description: 'Write a summary of what you heard',
      bgColor: '#FEF3C7',
      iconColor: '#F59E0B',
      iconPath: '/icons/listen-and-summarize.png'
    }
  ];

  const handleSectionClick = (_sectionId: string) => {
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

          {/* Listening Practice Section */}
          <div className="px-4 lg:px-6 py-4 lg:py-6">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-4">
              Listening Practice
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {listeningTypes.map((practice) => (
                <PracticeCard
                  key={practice.type}
                  title={practice.title}
                  description={practice.description}
                  iconPath={practice.iconPath}
                  bgColor={practice.bgColor}
                  iconColor={practice.iconColor}
                  onClick={() => {
                    router.push(`/app/listening/practice/${practice.type}`);
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
