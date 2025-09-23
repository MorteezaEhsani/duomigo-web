'use client';

import React from 'react';
import Image from 'next/image';

interface PracticeCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  iconPath?: string;
  bgColor: string;
  iconColor: string;
  onClick: () => void;
  className?: string;
}

export default function PracticeCard({
  title,
  description,
  icon,
  iconPath,
  bgColor,
  iconColor,
  onClick,
  className = '',
}: PracticeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full h-full
        bg-white rounded-xl
        shadow-md hover:shadow-xl
        transition-all duration-200 ease-in-out
        hover:-translate-y-1 hover:scale-[1.02]
        active:scale-[0.98] active:translate-y-0
        p-3 sm:p-4 md:p-6 text-left
        focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
        ${className}
      `}
      aria-label={`${title} - ${description}`}
    >
      {/* Background color overlay */}
      <div 
        className="absolute inset-0 rounded-xl opacity-30 group-hover:opacity-40 transition-opacity duration-200"
        style={{ backgroundColor: bgColor }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center h-full justify-between">
        {/* Icon */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center">
          {iconPath ? (
            <Image
              src={iconPath}
              alt={title}
              width={80}
              height={80}
              className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200"
            />
          ) : icon ? (
            <div
              className="opacity-80 group-hover:opacity-100 transition-opacity duration-200 w-full h-full"
              style={{ color: iconColor }}
            >
              {React.cloneElement(icon as React.ReactElement, {
                className: "w-full h-full"
              })}
            </div>
          ) : (
            <div
              className="w-full h-full rounded-full opacity-20"
              style={{ backgroundColor: iconColor }}
            />
          )}
        </div>

        <div className="space-y-1 sm:space-y-2">
          {/* Title */}
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 group-hover:text-amber-500 transition-colors duration-200">
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Arrow indicator */}
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-amber-500 transition-all duration-200 group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </div>
    </button>
  );
}