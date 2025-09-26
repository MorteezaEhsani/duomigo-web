import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';

const ADMIN_EMAILS = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  : [
      'morteezaehsani@gmail.com',
      'admin@duomigo.com',
    ];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { currentUser } = await import('@clerk/nextjs/server');
    const user = await currentUser();
    const userEmail = user?.emailAddresses[0]?.emailAddress;

    const isAdmin = userEmail && ADMIN_EMAILS.some(
      adminEmail => adminEmail.toLowerCase() === userEmail.toLowerCase()
    );

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const fileName = `question-images/${timestamp}-${randomString}.${fileExt}`;

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getAdminSupabaseClient();

    // First, check if the bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'question_media');

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('question_media', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        // Bucket might already exist, continue anyway
      }
    }

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('question_media')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      // If bucket doesn't exist error, provide helpful message
      if (error.message?.includes('not found')) {
        throw new Error('Storage bucket "question_media" not found. Please create it in Supabase Dashboard.');
      }
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('question_media')
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}