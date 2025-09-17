import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import crypto from 'crypto';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache with TTL
interface CacheEntry {
  audioBuffer: Buffer;
  timestamp: number;
}

const audioCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of audioCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      audioCache.delete(key);
    }
  }
}, 60 * 1000); // Run cleanup every minute

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: text is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-mock') {
      console.warn('OPENAI_API_KEY is not configured, returning mock audio');
      // Return a tiny valid MP3 file (silence) for testing
      const silentMp3 = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      
      return new NextResponse(silentMp3, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache',
          'X-Mock': 'true',
        },
      });
    }

    // Create cache key by hashing the text
    const cacheKey = crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');

    // Check cache first
    const cachedEntry = audioCache.get(cacheKey);
    if (cachedEntry) {
      const age = Date.now() - cachedEntry.timestamp;
      if (age < CACHE_TTL) {
        console.log(`TTS cache hit for text hash: ${cacheKey.substring(0, 8)}...`);
        return new NextResponse(new Uint8Array(cachedEntry.audioBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'private, max-age=600', // Browser can cache for 10 minutes
            'X-Cache': 'HIT',
          },
        });
      } else {
        // Remove expired entry
        audioCache.delete(cacheKey);
      }
    }

    console.log(`TTS cache miss, generating audio for text hash: ${cacheKey.substring(0, 8)}...`);

    // Generate audio using OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1', // Use tts-1 or tts-1-hd for higher quality
      voice: 'nova', // Available voices: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      response_format: 'mp3',
      speed: 1.0, // Speed range: 0.25 to 4.0
    });

    // Convert response to buffer
    const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());

    // Store in cache
    audioCache.set(cacheKey, {
      audioBuffer,
      timestamp: Date.now(),
    });

    // Return audio response
    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=600',
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('TTS API error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 400 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 400 }
        );
      }
      if (error.status === 400) {
        return NextResponse.json(
          { error: 'Invalid request to TTS service' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 400 }
    );
  }
}