import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  : [
      'morteezaehsani@gmail.com',
      'admin@duomigo.com',
    ];

async function checkAdminAccess() {
  const { userId } = await auth();
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { currentUser } = await import('@clerk/nextjs/server');
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  const isAdmin = userEmail && ADMIN_EMAILS.some(
    adminEmail => adminEmail.toLowerCase() === userEmail.toLowerCase()
  );

  if (!isAdmin) {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { success: true };
}

// GET - Fetch all questions
export async function GET() {
  const accessCheck = await checkAdminAccess();
  if ('error' in accessCheck) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
  }

  try {
    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// POST - Add new question
export async function POST(request: NextRequest) {
  const accessCheck = await checkAdminAccess();
  if ('error' in accessCheck) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
  }

  try {
    const body = await request.json();
    const supabase = getAdminSupabaseClient();

    const { data, error } = await supabase
      .from('questions')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error adding question:', error);
    return NextResponse.json(
      { error: 'Failed to add question' },
      { status: 500 }
    );
  }
}

// PUT - Update question
export async function PUT(request: NextRequest) {
  const accessCheck = await checkAdminAccess();
  if ('error' in accessCheck) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
  }

  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();

    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE - Delete question
export async function DELETE(request: NextRequest) {
  const accessCheck = await checkAdminAccess();
  if ('error' in accessCheck) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}