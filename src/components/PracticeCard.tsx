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
        group relative w-full
        bg-white rounded-xl
        shadow-md hover:shadow-xl
        transition-all duration-200 ease-in-out
        hover:-translate-y-1 hover:scale-[1.02]
        active:scale-[0.98] active:translate-y-0
        p-6 text-left
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
      <div className="relative z-10 flex flex-col items-center text-center space-y-3">
        {/* Icon */}
        <div className="w-20 h-20 flex items-center justify-center">
          {iconPath ? (
            <Image
              src={iconPath}
              alt={title}
              width={80}
              height={80}
              className="w-20 h-20 object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200"
            />
          ) : icon ? (
            <div 
              className="opacity-80 group-hover:opacity-100 transition-opacity duration-200"
              style={{ color: iconColor }}
            >
              {icon}
            </div>
          ) : (
            <div
              className="w-18 h-18 rounded-full opacity-20"
              style={{ backgroundColor: iconColor }}
            />
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-500 transition-colors duration-200">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-gray-600">
          {description}
        </p>
        
        {/* Arrow indicator */}
        <svg 
          className="w-5 h-5 text-gray-500 group-hover:text-amber-500 transition-all duration-200 group-hover:translate-x-1" 
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