'use client';

import { useState, useEffect } from 'react';

interface UseSignedUrlOptions {
  bucket: 'attempts' | 'question_media';
  path: string | null;
  enabled?: boolean;
  expiresIn?: number;
}

interface SignedUrlResult {
  url: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSignedUrl({
  bucket,
  path,
  enabled = true,
  expiresIn = 300
}: UseSignedUrlOptions): SignedUrlResult {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignedUrl = async () => {
    if (!path || !enabled) {
      setUrl(null);
      return;
    }

    // Check if it's already a public URL or needs signing
    if (path.startsWith('http://') || path.startsWith('https://')) {
      setUrl(path);
      return;
    }

    // Check if it's a storage path that needs signing
    const storagePath = path.startsWith('storage:') 
      ? path.replace('storage:', '') 
      : path;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket,
          path: storagePath,
          expiresIn
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get signed URL');
      }

      const { signedUrl } = await response.json();
      setUrl(signedUrl);
    } catch (err) {
      console.error('Error fetching signed URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to get signed URL');
      setUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignedUrl();
  }, [bucket, path, enabled, expiresIn, fetchSignedUrl]);

  // Set up auto-refresh before expiry
  useEffect(() => {
    if (!url || !enabled) return;

    // Refresh 30 seconds before expiry
    const refreshTime = (expiresIn - 30) * 1000;
    if (refreshTime <= 0) return;

    const timer = setTimeout(() => {
      fetchSignedUrl();
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [url, expiresIn, enabled, fetchSignedUrl]);

  return {
    url,
    loading,
    error,
    refresh: fetchSignedUrl
  };
}

// Utility function for one-time signed URL fetch
export async function getSignedUrl(
  bucket: 'attempts' | 'question_media',
  path: string,
  expiresIn: number = 300
): Promise<string | null> {
  try {
    // Check if it's already a public URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    const storagePath = path.startsWith('storage:') 
      ? path.replace('storage:', '') 
      : path;

    const response = await fetch('/api/storage/signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket,
        path: storagePath,
        expiresIn
      }),
    });

    if (!response.ok) {
      console.error('Failed to get signed URL');
      return null;
    }

    const { signedUrl } = await response.json();
    return signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}