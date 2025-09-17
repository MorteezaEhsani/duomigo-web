import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import type { GetOrCreateUserParams, QuestionCreateRequest, QuestionUpdateRequest } from '@/types/api';
import type { Question, Profile } from '@/types/database';

// Validation schemas
const QuestionCreateSchema = z.object({
  type: z.string(),
  level: z.string(),
  prompt: z.string(),
  target_lang: z.string(),
  media_url: z.string().optional(),
  explanation: z.string().optional(),
  is_published: z.boolean().optional().default(true)
});

const QuestionUpdateSchema = z.object({
  type: z.string().optional(),
  level: z.string().optional(),
  prompt: z.string().optional(),
  target_lang: z.string().optional(),
  media_url: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  is_published: z.boolean().optional()
});

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID and check admin status
    const rpcParams: GetOrCreateUserParams = {
      p_clerk_user_id: userId,
      p_email: undefined,
      p_display_name: undefined
    };
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      rpcParams as unknown as undefined
    );

    if (userError) {
      console.error('RPC error:', userError);
      return NextResponse.json({ error: `Database error: ${userError.message}` }, { status: 500 });
    }
    
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from<'profiles', Profile>('profiles')
      .select('is_admin')
      .eq('user_id', supabaseUserId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get question ID from URL
    const url = new URL(request.url);
    const questionId = url.searchParams.get('id');

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    // Delete the question using service role
    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID and check admin status
    const rpcParams: GetOrCreateUserParams = {
      p_clerk_user_id: userId,
      p_email: undefined,
      p_display_name: undefined
    };
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      rpcParams as unknown as undefined
    );

    if (userError) {
      console.error('RPC error:', userError);
      return NextResponse.json({ error: `Database error: ${userError.message}` }, { status: 500 });
    }
    
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from<'profiles', Profile>('profiles')
      .select('is_admin')
      .eq('user_id', supabaseUserId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json() as unknown;
    const questionData = QuestionCreateSchema.parse(body);
    console.log('Creating question with body:', questionData);

    // Insert the question using service role
    const { data, error: insertError } = await supabase
      .from<'questions', Question>('questions')
      .insert(questionData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      console.error('Failed body:', body);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    
    console.log('Question created successfully:', data?.id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID and check admin status
    const rpcParams: GetOrCreateUserParams = {
      p_clerk_user_id: userId,
      p_email: undefined,
      p_display_name: undefined
    };
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      rpcParams as unknown as undefined
    );

    if (userError) {
      console.error('RPC error:', userError);
      return NextResponse.json({ error: `Database error: ${userError.message}` }, { status: 500 });
    }
    
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from<'profiles', Profile>('profiles')
      .select('is_admin')
      .eq('user_id', supabaseUserId)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const questionId = url.searchParams.get('id');

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    const body = await request.json() as unknown;
    const updateData = QuestionUpdateSchema.parse(body);
    console.log('Updating question', questionId, 'with body:', updateData);

    // Update the question using service role
    const { data, error: updateError } = await supabase
      .from<'questions', Question>('questions')
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      console.error('Failed body:', body);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    console.log('Question updated successfully:', data?.id);

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}