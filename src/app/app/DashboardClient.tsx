'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase/client';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import WeeklyStreak from '@/components/WeeklyStreak';
import PracticeCard from '@/components/PracticeCard';

interface StreakData {
  current_streak: number;
  best_streak: number;
}

interface DashboardClientProps {
  userId: string;
  initialStreakData?: StreakData | null;
}

export default function DashboardClient({ userId, initialStreakData }: DashboardClientProps) {
  const { user } = useUser();
  const router = useRouter();
  const [streakData, setStreakData] = useState<StreakData | null>(initialStreakData || null);
  const [loading, setLoading] = useState(!initialStreakData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && userId) {
      initializeUser();
    }
  }, [user, userId]);

  const initializeUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, ensure the user exists in Supabase
      const { data: mappedUserId, error: mappingError } = await supabase.rpc(
        'get_or_create_user_by_clerk_id',
        {
          p_clerk_user_id: userId,
          p_email: user?.emailAddresses[0]?.emailAddress || null,
          p_display_name: user?.firstName || user?.username || 'User'
        }
      );

      if (mappingError) {
        console.error('Error mapping user:', mappingError);
        throw new Error('Failed to initialize user profile');
      }


      // Fetch streak data and check if it needs to be reset
      const { data, error: streakError } = await supabase
        .from('streaks')
        .select('current_streak, best_streak, last_activity_date')
        .eq('user_id', mappedUserId)
        .single();

      if (streakError) {
        if (streakError.code === 'PGRST116') {
          // No streak data yet, show zeros
          setStreakData({ current_streak: 0, best_streak: 0 });
        } else {
          throw streakError;
        }
      } else {
        // Check if streak should be reset (last activity was more than 1 day ago)
        let currentStreak = data.current_streak;
        if (data.last_activity_date) {
          const lastActivity = new Date(data.last_activity_date);
          lastActivity.setHours(0, 0, 0, 0); // Reset time to start of day

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          // Calculate days difference
          const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

          // If last activity was more than 1 day ago (not today or yesterday), reset streak
          if (daysDiff > 1) {
            console.log('Streak broken - last activity was', data.last_activity_date, '- days diff:', daysDiff);
            currentStreak = 0;

            // Update the database to reset the streak
            await supabase
              .from('streaks')
              .update({ current_streak: 0 })
              .eq('user_id', mappedUserId);
          } else {
            console.log('Streak maintained - last activity was', data.last_activity_date, '- days diff:', daysDiff);
          }
        }
        
        setStreakData({
          current_streak: currentStreak,
          best_streak: data.best_streak
        });
      }
    } catch (err) {
      console.error('Error initializing user:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load your progress. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

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

  const practiceTypes = [
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
  ];

  const currentStreak = streakData?.current_streak ?? 0;
  
  // Calculate current day of week (0 = Sunday, 6 = Saturday)
  const today = new Date();
  const currentDayIndex = today.getDay();
  
  // Calculate weekly progress (assuming goal of 7 days practice)
  // This could be fetched from database for actual weekly practice data
  const weeklyProgress = Math.min(currentStreak / 7, 1);

  return (
    <div className="h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Progress</h1>
        
        {/* Weekly Streak Component */}
        <WeeklyStreak
          weekStart="sun"
          currentDayIndex={currentDayIndex}
          progress={weeklyProgress}
          streakDays={currentStreak}
          goalLabel="Complete 2 practices daily"
          className="mb-6"
        />

        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Practice Modes</h2>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {practiceTypes.map((practice) => (
              <PracticeCard
                key={practice.type}
                title={practice.title}
                description={practice.description}
                icon={practice.fallbackIcon}
                iconPath={practice.iconPath}
                bgColor={practice.bgColor}
                iconColor={practice.iconColor}
                onClick={() => {
                  const path = practice.isCustom ? '/app/custom' : `/app/practice/${practice.type}`;
                  router.push(path);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}