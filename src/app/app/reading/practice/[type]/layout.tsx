import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ReadingPracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Full screen layout without sidebar
  return (
    <div className="fixed inset-0 bg-gray-50 z-50">
      {children}
    </div>
  );
}
