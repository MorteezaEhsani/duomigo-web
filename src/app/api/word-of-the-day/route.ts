/**
 * API Route: Word of the Day
 *
 * GET /api/word-of-the-day
 *
 * Returns a word of the day based on the user's English level.
 * Premium users only.
 */

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import OpenAI from 'openai';
import type { GetOrCreateUserParams } from '@/types/api';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface WordOfTheDay {
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  pronunciation?: string;
}

export async function GET() {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    const user = await currentUser();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: clerkUserId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User',
      } satisfies GetOrCreateUserParams
    );

    if (userError || !supabaseUserId) {
      console.error('Error getting user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has premium access
    const { data: hasPremium, error: premiumError } = await supabase.rpc(
      'has_premium_access',
      { p_user_id: supabaseUserId }
    );

    if (premiumError) {
      console.error('Error checking premium:', premiumError);
    }

    if (!hasPremium) {
      return NextResponse.json(
        { error: 'Premium subscription required' },
        { status: 403 }
      );
    }

    // Get today's date (UTC) for caching
    const today = new Date().toISOString().split('T')[0];

    // Check if we already have a word for today for this user
    const { data: existingWord } = await supabase
      .from('word_of_the_day')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('date', today)
      .single();

    if (existingWord) {
      return NextResponse.json({
        word: existingWord.word,
        partOfSpeech: existingWord.part_of_speech,
        definition: existingWord.definition,
        example: existingWord.example,
        pronunciation: existingWord.pronunciation,
        date: existingWord.date,
      });
    }

    // Get user's average level across all skills
    const { data: levels } = await supabase
      .from('user_levels')
      .select('cefr_level')
      .eq('user_id', supabaseUserId);

    // Calculate average level or default to B1
    let userLevel = 'B1';
    if (levels && levels.length > 0) {
      const levelMap: Record<string, number> = {
        'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6
      };
      const reverseLevelMap: Record<number, string> = {
        1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2'
      };

      const avgLevel = Math.round(
        levels.reduce((sum, l) => sum + (levelMap[l.cefr_level] || 3), 0) / levels.length
      );
      userLevel = reverseLevelMap[avgLevel] || 'B1';
    }

    // Get previously shown words to avoid repetition
    const { data: previousWords } = await supabase
      .from('word_of_the_day')
      .select('word')
      .eq('user_id', supabaseUserId)
      .order('date', { ascending: false })
      .limit(30);

    const excludeWords = previousWords?.map(w => w.word).join(', ') || '';

    // Generate word using OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an English vocabulary teacher. Generate a single vocabulary word appropriate for a ${userLevel} level English learner. The word should be useful, interesting, and help expand their vocabulary. Return JSON only.`
        },
        {
          role: 'user',
          content: `Generate a vocabulary word for a ${userLevel} level English learner.

${excludeWords ? `Do NOT use any of these words (already shown recently): ${excludeWords}` : ''}

Return a JSON object with these fields:
- word: the vocabulary word
- partOfSpeech: noun, verb, adjective, adverb, etc.
- definition: a clear, simple definition appropriate for ${userLevel} level
- example: a natural example sentence using the word
- pronunciation: phonetic pronunciation (optional)

Return ONLY the JSON object, no other text.`
        }
      ],
      temperature: 0.9,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the response
    let wordData: WordOfTheDay;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      wordData = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Failed to parse word data');
    }

    // Store the word in the database
    const { error: insertError } = await supabase
      .from('word_of_the_day')
      .insert({
        user_id: supabaseUserId,
        date: today,
        word: wordData.word,
        part_of_speech: wordData.partOfSpeech,
        definition: wordData.definition,
        example: wordData.example,
        pronunciation: wordData.pronunciation || null,
        cefr_level: userLevel,
      });

    if (insertError) {
      console.error('Error storing word:', insertError);
      // Still return the word even if we couldn't store it
    }

    return NextResponse.json({
      word: wordData.word,
      partOfSpeech: wordData.partOfSpeech,
      definition: wordData.definition,
      example: wordData.example,
      pronunciation: wordData.pronunciation,
      date: today,
    });
  } catch (error) {
    console.error('Word of the day error:', error);
    return NextResponse.json(
      { error: 'Failed to get word of the day' },
      { status: 500 }
    );
  }
}
