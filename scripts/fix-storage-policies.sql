-- Fix storage bucket policies for question_media

-- First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question_media',
  'question_media',
  true,  -- Make it public so images can be viewed
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[];

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to update their images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to delete their images" ON storage.objects;

-- Create new policies for the question_media bucket

-- 1. Allow all authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question_media');

-- 2. Allow public to view images (since bucket is public)
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'question_media');

-- 3. Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'question_media')
WITH CHECK (bucket_id = 'question_media');

-- 4. Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'question_media');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Verify the policies
SELECT * FROM storage.buckets WHERE id = 'question_media';