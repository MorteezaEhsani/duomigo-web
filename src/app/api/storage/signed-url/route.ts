import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { z } from 'zod';

// Input validation schema
const RequestSchema = z.object({
  bucket: z.enum(['attempts', 'question_media']),
  path: z.string().min(1, 'Path is required'),
  expiresIn: z.number().min(60).max(3600).optional().default(300), // 5 minutes default
});

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

    // Validate input
    const body = await request.json();
    const validationResult = RequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { bucket, path, expiresIn } = validationResult.data;
    const supabase = getAdminSupabaseClient();

    // Get Supabase user ID
    const { data: supabaseUserId, error: userError } = await supabase.rpc(
      'get_or_create_user_by_clerk_id',
      {
        p_clerk_user_id: userId,
        p_email: user?.emailAddresses[0]?.emailAddress,
        p_display_name: user?.firstName || user?.username || 'User'
      } as any
    );

    if (userError || !supabaseUserId) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500 }
      );
    }

    // For attempts bucket, verify user owns the file
    if (bucket === 'attempts') {
      const pathParts = path.split('/');
      const fileUserId = pathParts[0];
      
      if (fileUserId !== supabaseUserId) {
        return NextResponse.json(
          { error: 'Access denied to this file' },
          { status: 403 }
        );
      }
    }

    // For question_media, check if user is admin for write operations
    // (Read is public, so signed URLs aren't typically needed)
    if (bucket === 'question_media') {
      // Check if admin for certain operations if needed
      // For now, we'll allow signed URL generation for all authenticated users
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (signedUrlError || !signedUrlData) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to create signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

  } catch (error) {
    console.error('Error in signed-url:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method to retrieve signed URL via query params (useful for direct links)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket');
    const path = searchParams.get('path');
    
    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate bucket name
    if (!['attempts', 'question_media'].includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket name' },
        { status: 400 }
      );
    }

    // Forward to POST handler with same logic
    return POST(new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({
        bucket,
        path,
        expiresIn: 300
      }),
      headers: request.headers
    }));
    
  } catch (error) {
    console.error('Error in signed-url GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}