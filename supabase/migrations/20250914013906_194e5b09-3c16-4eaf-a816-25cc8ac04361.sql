-- Storage policies for site-assets uploads (admin-only write, public read)
-- Note: Do not modify storage schema objects other than policies.

-- Allow public read access to files in 'site-assets' bucket
CREATE POLICY IF NOT EXISTS "Public can read site-assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'site-assets');

-- Allow admins to insert/update/delete files in 'site-assets'
CREATE POLICY IF NOT EXISTS "Admins can manage site-assets"
ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'site-assets' AND public.get_user_role(auth.uid()) = 'admin'::app_role
)
WITH CHECK (
  bucket_id = 'site-assets' AND public.get_user_role(auth.uid()) = 'admin'::app_role
);
