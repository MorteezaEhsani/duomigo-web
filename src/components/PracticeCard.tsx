'use client';

import React, { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        group relative w-full
        bg-white rounded-lg
        shadow-sm hover:shadow-lg
        transition-all duration-200 ease-in-out
        hover:-translate-y-1 hover:scale-[1.02]
        active:scale-[0.98] active:translate-y-0
        p-3 sm:p-4 text-left
        focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-sm
        ${className}
      `}
      aria-label={`${title} - ${description}`}
    >
      {/* Background color overlay */}
      <div
        className="absolute inset-0 rounded-lg opacity-30 group-hover:opacity-40 transition-opacity duration-200"
        style={{ backgroundColor: bgColor }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center justify-between min-h-[140px] sm:min-h-[160px]">
        {/* Icon */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mt-1">
          {iconPath ? (
            <Image
              src={iconPath}
              alt={title}
              width={112}
              height={112}
              quality={100}
              className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200"
            />
          ) : icon && React.isValidElement(icon) ? (
            <div
              className="opacity-80 group-hover:opacity-100 transition-opacity duration-200 w-full h-full"
              style={{ color: iconColor }}
            >
              {React.cloneElement(icon, {
                className: "w-full h-full"
              } as Record<string, unknown>)}
            </div>
          ) : (
            <div
              className="w-full h-full rounded-full opacity-20"
              style={{ backgroundColor: iconColor }}
            />
          )}
        </div>

        <div className="space-y-0.5 sm:space-y-1 flex-1 flex flex-col justify-center">
          {/* Title */}
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-amber-500 transition-colors duration-200">
            {title}
          </h3>

          {/* Description */}
          <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Arrow indicator or Loading spinner */}
        {isLoading ? (
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500 animate-spin mb-1"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-amber-500 transition-all duration-200 group-hover:translate-x-1 mb-1"
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
        )}
      </div>
    </button>
  );
}