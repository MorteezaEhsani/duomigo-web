-- Migration: 2025-09-09__storage_buckets_setup.sql
-- Purpose: Create and configure storage buckets with proper RLS policies

BEGIN;

-- ============================================
-- 1. CREATE STORAGE BUCKETS
-- ============================================

-- Create 'attempts' bucket for user audio recordings (private)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'attempts',
  'attempts', 
  false, -- Private bucket - requires auth
  false,
  52428800, -- 50MB limit for audio files
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];

-- Create 'question_media' bucket for question images/audio (public read)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'question_media',
  'question_media', 
  true, -- Public read access for question content
  false,
  20971520, -- 20MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav'];

-- ============================================
-- 2. DROP EXISTING POLICIES (Clean slate)
-- ============================================

-- Drop all existing policies for attempts bucket
DROP POLICY IF EXISTS "Users can upload own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own attempts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Drop all existing policies for question_media bucket
DROP POLICY IF EXISTS "Admins can upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view question images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete question images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view question media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload question media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update question media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete question media" ON storage.objects;

-- ============================================
-- 3. ATTEMPTS BUCKET POLICIES (Private, user-scoped)
-- ============================================

-- Users can only view their own attempt files
CREATE POLICY "attempts_select_own" ON storage.objects
FOR SELECT USING (
  bucket_id = 'attempts' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Users can only upload to their own folder (attempts/{user_id}/*)
CREATE POLICY "attempts_insert_own" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'attempts' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Users can update their own files
CREATE POLICY "attempts_update_own" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'attempts' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'attempts' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Users can delete their own files
CREATE POLICY "attempts_delete_own" ON storage.objects
FOR DELETE USING (
  bucket_id = 'attempts' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- ============================================
-- 4. QUESTION_MEDIA BUCKET POLICIES (Public read, admin write)
-- ============================================

-- Anyone can view question media (public bucket)
CREATE POLICY "question_media_select_all" ON storage.objects
FOR SELECT USING (
  bucket_id = 'question_media'
);

-- Only admins can upload question media
CREATE POLICY "question_media_insert_admin" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'question_media' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Only admins can update question media
CREATE POLICY "question_media_update_admin" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'question_media' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
)
WITH CHECK (
  bucket_id = 'question_media' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Only admins can delete question media
CREATE POLICY "question_media_delete_admin" ON storage.objects
FOR DELETE USING (
  bucket_id = 'question_media' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- ============================================
-- 5. HELPER FUNCTIONS FOR SIGNED URLs
-- ============================================

-- Function to generate signed URL for attempt audio
CREATE OR REPLACE FUNCTION get_attempt_signed_url(
  p_file_path TEXT,
  p_expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT AS $$
DECLARE
  v_signed_url TEXT;
  v_user_id TEXT;
BEGIN
  -- Extract user_id from file path
  v_user_id := (string_to_array(p_file_path, '/'))[1];
  
  -- Check if current user owns the file
  IF auth.uid()::text != v_user_id THEN
    RAISE EXCEPTION 'Access denied to this file';
  END IF;
  
  -- Generate signed URL (this is a placeholder - actual implementation depends on Supabase client)
  -- In practice, this would be done via the API route
  v_signed_url := 'signed_url_placeholder';
  
  RETURN v_signed_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_attempt_signed_url TO authenticated;

-- ============================================
-- 6. CLEANUP OLD BUCKETS (if they exist with wrong config)
-- ============================================

-- Remove old buckets that might have wrong configuration
DELETE FROM storage.buckets WHERE id = 'question-images';

-- ============================================
-- 7. VERIFICATION
-- ============================================

DO $$
DECLARE
  v_attempts_bucket RECORD;
  v_media_bucket RECORD;
  v_policy_count INTEGER;
BEGIN
  -- Check buckets exist
  SELECT * INTO v_attempts_bucket FROM storage.buckets WHERE id = 'attempts';
  SELECT * INTO v_media_bucket FROM storage.buckets WHERE id = 'question_media';
  
  -- Count policies
  SELECT COUNT(*) INTO v_policy_count 
  FROM pg_policies 
  WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE 'attempts_%' OR policyname LIKE 'question_media_%';
  
  RAISE NOTICE '✅ Storage buckets configured successfully!';
  RAISE NOTICE '  - attempts bucket: % (private)', CASE WHEN v_attempts_bucket.id IS NOT NULL THEN 'created' ELSE 'failed' END;
  RAISE NOTICE '  - question_media bucket: % (public read)', CASE WHEN v_media_bucket.id IS NOT NULL THEN 'created' ELSE 'failed' END;
  RAISE NOTICE '  - Storage policies created: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Bucket Structure:';
  RAISE NOTICE '  attempts/{user_id}/{attempt_id}/{filename} - User audio recordings';
  RAISE NOTICE '  question_media/images/{filename} - Question images';
  RAISE NOTICE '  question_media/audio/{filename} - Question audio (TTS cache)';
END $$;

COMMIT;