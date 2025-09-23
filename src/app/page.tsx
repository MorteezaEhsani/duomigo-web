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
            Your AI Coach for
            <span className="block text-amber-500">English Fluency</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Build fluency faster with speaking practice that feels natural, personal, and fun
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href={userId ? "/app" : "/sign-up"}
              className="rounded-lg bg-amber-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 transition-colors"
            >
              {userId ? "Go to Dashboard" : "Get Started"}
            </Link>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3 text-left">
            <div>
              <h3 className="font-semibold text-gray-900">🎙️ Speak Naturally</h3>
              <p className="mt-2 text-sm text-gray-600">
                Practice real conversations and pronunciation with instant AI feedback—so you sound confident, not robotic.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">📈 Track Your Progress</h3>
              <p className="mt-2 text-sm text-gray-600">
                See your improvement every day with streaks, scores, and insights that keep you motivated.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900">🧠 Learn Smarter</h3>
              <p className="mt-2 text-sm text-gray-600">
                Adaptive lessons that focus on your weak spots, helping you get fluent faster and more naturally.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}