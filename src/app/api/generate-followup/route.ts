import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RequestSchema = z.object({
  originalPrompt: z.string(),
  userResponse: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { originalPrompt, userResponse } = RequestSchema.parse(body);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating relevant follow-up questions for interactive writing exercises.
Based on the original prompt and the user's response, generate a thoughtful follow-up question that:
1. Relates directly to what the user wrote
2. Encourages deeper thinking or elaboration
3. Is specific and personalized to their response
4. Can be answered in 3 minutes of writing

Return ONLY the follow-up question text, nothing else.`
        },
        {
          role: 'user',
          content: `Original Prompt: ${originalPrompt}

User's Response: ${userResponse}

Generate a follow-up question:`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const followUpQuestion = completion.choices[0]?.message?.content?.trim();

    if (!followUpQuestion) {
      throw new Error('Failed to generate follow-up question');
    }

    return NextResponse.json({ followUpQuestion });
  } catch (error) {
    console.error('Error generating follow-up:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate follow-up question' },
      { status: 500 }
    );
  }
}
