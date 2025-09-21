-- Create storage policies for 'site-assets' bucket if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read site-assets'
  ) THEN
    CREATE POLICY "Public can read site-assets"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'site-assets');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can manage site-assets'
  ) THEN
    CREATE POLICY "Admins can manage site-assets"
    ON storage.objects
    FOR ALL TO authenticated
    USING (
      bucket_id = 'site-assets' AND public.get_user_role(auth.uid()) = 'admin'::app_role
    )
    WITH CHECK (
      bucket_id = 'site-assets' AND public.get_user_role(auth.uid()) = 'admin'::app_role
    );
  END IF;
END$$;