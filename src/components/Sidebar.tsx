'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

interface SidebarProps {
  isPremium?: boolean;
  activeSection?: string;
  onSectionClick?: (_sectionId: string) => void;
}

function getInitials(firstName?: string | null, lastName?: string | null, username?: string | null): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export default function Sidebar({ isPremium, activeSection: _activeSection, onSectionClick: _onSectionClick }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const initials = getInitials(user?.firstName, user?.lastName, user?.username);

  const isActive = (href: string) => {
    if (href === '/app') {
      return pathname === '/app';
    }
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      id: 'home',
      label: 'Learn',
      href: '/app',
      icon: (
        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
          <Image
            src="/icons/learn.png"
            alt="Learn"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
      ),
    },
    {
      id: 'practice',
      label: 'Practice',
      href: '/app/practice',
      icon: (
        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
          <Image
            src="/icons/practice.png"
            alt="Practice"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
      ),
    },
    {
      id: 'leaderboards',
      label: 'Leaderboards',
      href: '/app/leaderboards',
      icon: (
        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
          <Image
            src="/icons/leaderboards.png"
            alt="Leaderboards"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/app/profile',
      icon: (
        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-amber-700 font-semibold text-sm">
              {initials}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 p-6 flex-col">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Duomigo</h1>
            {isPremium && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">
                Premium
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-amber-100 text-amber-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <ul className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'text-amber-600'
                    : 'text-gray-600'
                }`}
              >
                {item.icon}
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
