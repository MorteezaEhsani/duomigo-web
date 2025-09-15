'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function CustomPromptClient() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(90);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);

    try {
      // Call API route to create session and question
      const response = await fetch('/api/custom-practice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration: duration
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create practice session');
      }

      const { sessionId, questionId } = await response.json();

      // Navigate to the practice runner with the new question
      router.push(`/app/practice/custom_prompt?session=${sessionId}&question=${questionId}`);

    } catch (error) {
      console.error('Error starting custom practice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start practice session';
      toast.error(errorMessage);
      setLoading(false);
    }
  };


  return (
    <div className="h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
      <div className="max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Custom Practice</h1>
          <p className="text-gray-600 mb-8">
            Create your own speaking prompt and practice at your own pace
          </p>


          {/* Prompt Input */}
          <div className="space-y-6">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Your Speaking Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none text-gray-800"
                placeholder="Example: Describe your perfect vacation destination and explain why you would like to visit there..."
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-1">
                {prompt.length}/500 characters
              </p>
            </div>

            {/* Duration Selector */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                Speaking Duration
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  id="duration"
                  min="30"
                  max="300"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="flex-1"
                />
                <div className="text-center">
                  <span className="text-2xl font-bold text-amber-500">
                    {duration >= 60 ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : `${duration}s`}
                  </span>
                  <span className="text-sm text-gray-600 block">
                    {duration >= 60 ? 'minutes' : 'seconds'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>30s</span>
                <span>1m</span>
                <span>2m</span>
                <span>3m</span>
                <span>4m</span>
                <span>5m</span>
              </div>
              <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded">
                You&apos;ll need to speak for at least <strong>{Math.ceil(Math.max(30, duration / 3))} seconds</strong> and
                can speak up to <strong>{duration} seconds</strong>.
              </p>
            </div>


            {/* Prep Time Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> You&apos;ll have 20 seconds to prepare before recording starts.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleStart}
                disabled={loading || !prompt.trim()}
                className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Starting...' : 'Start Practice'}
              </button>
              <button
                onClick={() => router.push('/app')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}