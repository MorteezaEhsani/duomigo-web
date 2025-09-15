import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import NavClerk from '@/components/NavClerk';

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <>
      <NavClerk />
      <main className="flex min-h-screen flex-col items-center justify-center px-4 -mt-16 bg-gray-50">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
            Learn Languages
            <span className="block text-amber-500">The Natural Way</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Practice speaking, listening, and conversing in your target language with AI-powered lessons 
            that adapt to your level and help you build real fluency.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href={userId ? "/app" : "/sign-up"}
              className="rounded-lg bg-amber-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-colors"
            >
              {userId ? "Go to Dashboard" : "Get Started"}
            </Link>
            <Link
              href="#features"
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700 transition-colors"
            >
              Learn more <span aria-hidden="true">→</span>
            </Link>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-left">
            <div className="relative pl-9">
              <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Speak Naturally</h3>
              <p className="mt-2 text-sm text-gray-600">
                Practice pronunciation and speaking with instant AI feedback on your accent and fluency.
              </p>
            </div>
            
            <div className="relative pl-9">
              <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Track Progress</h3>
              <p className="mt-2 text-sm text-gray-600">
                Build daily streaks and monitor your improvement with detailed progress analytics.
              </p>
            </div>
            
            <div className="relative pl-9">
              <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Learn Smart</h3>
              <p className="mt-2 text-sm text-gray-600">
                Adaptive lessons that adjust to your level and focus on areas where you need practice.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}