import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Get Clerk user
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get form data with audio file
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const attemptId = formData.get('attemptId') as string;
    
    if (!audioFile || !attemptId) {
      return NextResponse.json(
        { error: 'Missing audio file or attempt ID' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();
    
    // Get or create Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User'
      }
    );

    if (userError || !supabaseUserId) {
      console.error('Error getting/creating Supabase user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user record' },
        { status: 500 }
      );
    }

    // Create unique filename with proper path structure
    const timestamp = Date.now();
    const fileExt = audioFile.name.split('.').pop() || 'webm';
    const fileName = `${supabaseUserId}/${attemptId}/${timestamp}.${fileExt}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attempts')
      .upload(fileName, buffer, {
        contentType: audioFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading audio:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio' },
        { status: 500 }
      );
    }

    // Store the path, not a public URL (since bucket is private)
    // We'll use signed URLs for playback
    const storagePath = fileName;

    return NextResponse.json({
      success: true,
      audioUrl: `storage:${storagePath}`, // Prefix to indicate it needs signed URL
      fileName: fileName
    });

  } catch (error) {
    console.error('Error in upload-audio:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}