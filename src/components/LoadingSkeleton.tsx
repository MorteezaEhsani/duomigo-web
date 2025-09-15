export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="padding: 1.5rem; border-radius: 12px; background-color: #f4f4f5; border: 2px solid #e4e4e7;">
        <div style={{ padding: '1.5rem' }}>
          <div className="h-5 w-32 bg-zinc-300 rounded mb-3"></div>
          <div className="h-12 w-20 bg-zinc-300 rounded mb-2"></div>
          <div className="h-3 w-12 bg-zinc-300 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-zinc-300 rounded mb-8 animate-pulse"></div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        
        <div className="mt-8">
          <div className="h-6 w-36 bg-zinc-300 rounded mb-4 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-24 bg-zinc-200 rounded-lg animate-pulse"></div>
            <div className="h-24 bg-zinc-200 rounded-lg animate-pulse"></div>
            <div className="h-24 bg-zinc-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PracticeSkeleton() {
  return (
    <div className="padding: 2rem; max-width: 800px; margin: 0 auto;">
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="h-8 w-48 bg-zinc-300 rounded mb-6 animate-pulse"></div>
        
        <div className="p-8 bg-zinc-100 rounded-lg mb-6 animate-pulse">
          <div className="h-6 w-24 bg-zinc-300 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-zinc-300 rounded w-full"></div>
            <div className="h-4 bg-zinc-300 rounded w-5/6"></div>
            <div className="h-4 bg-zinc-300 rounded w-4/6"></div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="h-3 bg-zinc-200 rounded w-32"></div>
            <div className="h-3 bg-zinc-200 rounded w-40"></div>
            <div className="h-3 bg-zinc-200 rounded w-36"></div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <div className="h-12 w-40 bg-zinc-300 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}