'use client';

import { useState, useEffect } from 'react';

interface WordData {
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  pronunciation?: string;
  date: string;
}

export default function WordOfTheDay() {
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWord() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/word-of-the-day');

        if (!response.ok) {
          if (response.status === 403) {
            setError('Premium required');
          } else {
            setError('Failed to load');
          }
          return;
        }

        const data = await response.json();
        setWordData(data);
      } catch {
        setError('Failed to load');
      } finally {
        setIsLoading(false);
      }
    }

    fetchWord();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-amber-200 rounded w-24 mb-2"></div>
          <div className="h-6 bg-amber-200 rounded w-32 mb-3"></div>
          <div className="h-3 bg-amber-100 rounded w-full mb-2"></div>
          <div className="h-3 bg-amber-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !wordData) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-700">Unable to load word of the day</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </span>
        <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Word of the Day</span>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-bold text-gray-900">{wordData.word}</h3>
          <span className="text-sm text-gray-500 italic">{wordData.partOfSpeech}</span>
        </div>
        {wordData.pronunciation && (
          <p className="text-xs text-gray-400 mt-0.5">{wordData.pronunciation}</p>
        )}
      </div>

      <p className="text-sm text-gray-700 mb-2">{wordData.definition}</p>

      <p className="text-sm text-gray-600 italic border-l-2 border-amber-300 pl-3">
        &ldquo;{wordData.example}&rdquo;
      </p>
    </div>
  );
}
