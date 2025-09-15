-- Migration: 2025-09-09__add_admin_field.sql
-- Purpose: Add is_admin field to profiles table for admin access control

BEGIN;

-- Add is_admin column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_admin IS 'Admin flag for accessing admin features';

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_current_user_admin TO authenticated;

-- Create RLS policy for questions table that allows admins to modify
CREATE POLICY "Admins can insert questions" 
  ON questions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update questions" 
  ON questions FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete questions" 
  ON questions FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Create storage bucket for question images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'question-images',
  'question-images', 
  true, -- Public bucket so images can be displayed
  false,
  10485760, -- 10MB limit for images
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- RLS policies for the storage bucket
CREATE POLICY "Admins can upload question images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'question-images' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

CREATE POLICY "Public can view question images" ON storage.objects
FOR SELECT USING (bucket_id = 'question-images');

CREATE POLICY "Admins can delete question images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'question-images' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE '✅ Added is_admin field to profiles table';
  RAISE NOTICE '  - Created admin check function';
  RAISE NOTICE '  - Added RLS policies for admin question management';
  RAISE NOTICE '  - Created question-images storage bucket';
END $$;

COMMIT;