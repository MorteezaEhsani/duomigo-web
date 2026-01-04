'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  xp_earned: number;
  rank: number;
}

interface UserRank {
  xp_earned: number;
  rank: number;
  total_participants: number;
}

interface CurrentUserProfile {
  display_name: string | null;
  avatar_url: string | null;
}

interface LeaderboardClientProps {
  leaderboard: LeaderboardEntry[];
  userRank: UserRank | null;
  currentUserId: string | null;
  currentUserProfile: CurrentUserProfile | null;
  weekRange: { start: string; end: string };
}

function getTimeUntilReset(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);

  const diff = nextMonday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRankDisplay(rank: number): { emoji: string; bgColor: string } {
  switch (rank) {
    case 1:
      return { emoji: '🥇', bgColor: 'bg-yellow-100' };
    case 2:
      return { emoji: '🥈', bgColor: 'bg-gray-100' };
    case 3:
      return { emoji: '🥉', bgColor: 'bg-orange-100' };
    default:
      return { emoji: '', bgColor: 'bg-white' };
  }
}

export default function LeaderboardClient({
  leaderboard,
  userRank,
  currentUserId,
  currentUserProfile,
  weekRange
}: LeaderboardClientProps) {
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilReset());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilReset());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Leaderboards</h1>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Week of {weekRange.start} - {weekRange.end}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Resets in {timeUntilReset}</span>
            </div>
          </div>
        </div>

        {/* User's Rank Card */}
        {userRank && userRank.xp_earned > 0 && currentUserProfile && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 mb-6 shadow-md">
            <div className="flex items-center gap-4 text-white">
              {/* Avatar - show image if available, otherwise initials */}
              <div className="flex-shrink-0">
                {currentUserProfile.avatar_url ? (
                  <img
                    src={currentUserProfile.avatar_url}
                    alt={currentUserProfile.display_name || 'User'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {getInitials(currentUserProfile.display_name || 'User')}
                    </span>
                  </div>
                )}
              </div>
              {/* Name and rank info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-lg truncate">
                  {currentUserProfile.display_name || 'Anonymous'}
                </p>
                <p className="text-amber-100 text-sm">
                  Rank #{userRank.rank || 1} • {userRank.total_participants} participants
                </p>
              </div>
              {/* XP */}
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold">{userRank.xp_earned}</p>
                <p className="text-amber-100 text-sm">XP this week</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State - only show if user has no XP */}
        {leaderboard.length === 0 && (!userRank || userRank.xp_earned === 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No rankings yet
            </h3>
            <p className="text-gray-600 mb-4">
              Complete practice sessions to earn XP and appear on the leaderboard!
            </p>
            <a
              href="/app/practice"
              className="inline-block px-6 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Start Practicing
            </a>
          </div>
        )}

        {/* Leaderboard List */}
        {(leaderboard.length > 0 || (userRank && userRank.xp_earned > 0)) && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {(() => {
              // Build the display list - include current user if they have XP but aren't in leaderboard
              const userInLeaderboard = leaderboard.some(e => e.user_id === currentUserId);
              const displayList: LeaderboardEntry[] = [...leaderboard];

              if (!userInLeaderboard && userRank && userRank.xp_earned > 0 && currentUserId && currentUserProfile) {
                displayList.push({
                  user_id: currentUserId,
                  display_name: currentUserProfile.display_name || 'You',
                  avatar_url: currentUserProfile.avatar_url,
                  xp_earned: userRank.xp_earned,
                  rank: userRank.rank || 1
                });
              }

              return displayList.map((entry, index) => {
                const { emoji, bgColor } = getRankDisplay(entry.rank);
                const isCurrentUser = entry.user_id === currentUserId;

                // For current user, use the Clerk profile data instead of database data
                const displayName = isCurrentUser && currentUserProfile?.display_name
                  ? currentUserProfile.display_name
                  : entry.display_name;
                const avatarUrl = isCurrentUser && currentUserProfile?.avatar_url
                  ? currentUserProfile.avatar_url
                  : entry.avatar_url;

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 px-4 py-3 ${bgColor} ${
                      index !== displayList.length - 1 ? 'border-b border-gray-100' : ''
                    } ${isCurrentUser ? 'ring-2 ring-amber-500 ring-inset' : ''}`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      {emoji ? (
                        <span className="text-xl">{emoji}</span>
                      ) : (
                        <span className="text-gray-500 font-medium">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <span className="text-amber-700 font-semibold text-sm">
                            {getInitials(displayName || 'User')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCurrentUser ? 'text-amber-700' : 'text-gray-900'}`}>
                        {displayName || 'Anonymous'}
                        {isCurrentUser && <span className="text-amber-500 ml-1">(You)</span>}
                      </p>
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{entry.xp_earned}</span>
                      <span className="text-gray-500 text-sm ml-1">XP</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">How XP works</h4>
              <p className="text-sm text-blue-700">
                Earn XP by completing practice sessions. Your score is calculated from fluency, pronunciation, grammar, vocabulary, coherence, and task achievement. The leaderboard resets every Monday!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
