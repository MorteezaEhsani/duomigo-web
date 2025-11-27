'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function ReadingClient() {
  const router = useRouter();
  const [activeSection] = useState('reading');

  const handleSectionClick = (sectionId: string) => {
    router.push('/app');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeSection={activeSection} onSectionClick={handleSectionClick} />
      <div className="flex-1 flex items-center justify-center p-6 pb-24 lg:pb-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Reading Practice</h1>
          <p className="text-gray-600 text-lg">Coming soon...</p>
        </div>
      </div>
    </div>
  );
}
