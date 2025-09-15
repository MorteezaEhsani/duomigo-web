-- Migration: 2025-09-09__create_attempts_bucket.sql
-- Purpose: Create Supabase Storage bucket for audio recordings

-- Note: This needs to be run via Supabase Dashboard or supabase CLI
-- as storage operations require admin access

-- Create the attempts bucket for audio recordings
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'attempts',
  'attempts', 
  true, -- Public bucket so audio URLs can be accessed
  false,
  52428800, -- 50MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

-- Create RLS policies for the bucket
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'attempts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access since bucket is public
CREATE POLICY "Public can read audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'attempts');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'attempts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Note: After running this migration, you may need to manually verify
-- the bucket exists in Supabase Dashboard under Storage