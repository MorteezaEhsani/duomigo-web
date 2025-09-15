import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { z } from 'zod';

// Request body schema
const CreateAttemptSchema = z.object({
  session_id: z.string().uuid('Invalid session ID format'),
  question_id: z.string().uuid('Invalid question ID format'),
  transcript: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  feedback: z.string().optional()
});

const GetAttemptsSchema = z.object({
  session_id: z.string().uuid().optional(),
  question_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  offset: z.coerce.number().min(0).optional().default(0)
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // Get current user from server-side auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'You must be logged in to create attempts'
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      );
    }

    let validatedData;
    try {
      validatedData = CreateAttemptSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation error',
            message: 'Invalid request data',
            details: error.issues 
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Verify the session belongs to the current user
    const { data: session, error: sessionError } = await supabase
      .from('practice_sessions')
      .select('user_id')
      .eq('id', validatedData.session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { 
          error: 'Not found',
          message: 'Practice session not found'
        },
        { status: 404 }
      );
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have access to this session'
        },
        { status: 403 }
      );
    }

    // Verify the question exists
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id')
      .eq('id', validatedData.question_id)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { 
          error: 'Not found',
          message: 'Question not found'
        },
        { status: 404 }
      );
    }

    // Create the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        session_id: validatedData.session_id,
        question_id: validatedData.question_id,
        user_id: user.id, // Always use server-side user ID
        transcript: validatedData.transcript || null,
        score: validatedData.score || null,
        feedback: validatedData.feedback || null,
        attempted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error creating attempt:', attemptError);
      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to create attempt'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Attempt created successfully',
      attempt 
    }, { status: 201 });

  } catch (error) {
    console.error('Error in attempts POST:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // Get current user from server-side auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'You must be logged in to view attempts'
        },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      session_id: searchParams.get('session_id'),
      question_id: searchParams.get('question_id'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    };

    let validatedParams;
    try {
      validatedParams = GetAttemptsSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation error',
            message: 'Invalid query parameters',
            details: error.issues 
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Build query
    let query = supabase
      .from('attempts')
      .select('*, questions(type, prompt, target_language)')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false });

    if (validatedParams.session_id) {
      query = query.eq('session_id', validatedParams.session_id);
    }

    if (validatedParams.question_id) {
      query = query.eq('question_id', validatedParams.question_id);
    }

    query = query
      .range(
        validatedParams.offset, 
        validatedParams.offset + validatedParams.limit - 1
      );

    const { data: attempts, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching attempts:', queryError);
      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to fetch attempts'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      attempts: attempts || [],
      pagination: {
        limit: validatedParams.limit,
        offset: validatedParams.offset
      }
    });

  } catch (error) {
    console.error('Error in attempts GET:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}