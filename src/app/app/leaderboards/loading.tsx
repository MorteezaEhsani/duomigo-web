export default function Loading() {
  return (
    <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* User Rank Card Skeleton */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl p-4 mb-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/30" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-white/30 rounded mb-2" />
              <div className="h-4 w-24 bg-white/30 rounded" />
            </div>
            <div className="text-right">
              <div className="h-8 w-12 bg-white/30 rounded mb-1" />
              <div className="h-3 w-16 bg-white/30 rounded" />
            </div>
          </div>
        </div>

        {/* Leaderboard List Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0">
              <div className="w-8 h-6 bg-gray-200 rounded animate-pulse" />
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
