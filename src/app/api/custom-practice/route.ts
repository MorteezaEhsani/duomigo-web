import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { GetOrCreateUserParams } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: null,
        p_display_name: null
      } satisfies GetOrCreateUserParams
    );

    if (userError) {
      console.error('RPC error:', userError);
      return NextResponse.json({ error: `Database error: ${userError.message}` }, { status: 500 });
    }
    
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { prompt, duration } = body;

    if (!prompt || !duration) {
      return NextResponse.json({ error: 'Prompt and duration are required' }, { status: 400 });
    }

    // Calculate min and max seconds
    const minSeconds = Math.ceil(Math.max(30, duration / 3));
    const maxSeconds = duration;

    // Create a practice session first
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .insert({
        user_id: supabaseUserId,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to create practice session' 
      }, { status: 500 });
    }

    // Create the custom question using service role to bypass RLS
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert({
        type: 'custom_prompt',
        prompt: prompt.trim(),
        target_language: 'English',
        source_language: 'English',
        difficulty: 2,
        prep_seconds: 20,
        min_seconds: minSeconds,
        max_seconds: maxSeconds,
        image_url: null,
        metadata: {
          user_created: true,
          created_by: supabaseUserId,
          duration_setting: duration
        }
      })
      .select()
      .single();

    if (questionError) {
      console.error('Question creation error:', questionError);
      return NextResponse.json({ 
        error: questionError.message || 'Failed to create question' 
      }, { status: 500 });
    }

    if (!question) {
      return NextResponse.json({ 
        error: 'Failed to create question - no data returned' 
      }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: session.id,
      questionId: question.id
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}