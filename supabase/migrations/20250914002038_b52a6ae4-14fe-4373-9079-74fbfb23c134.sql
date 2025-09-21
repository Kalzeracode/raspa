-- Create site_assets table for managing customizable site assets
CREATE TABLE public.site_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for site_assets
CREATE POLICY "Admins can manage all site assets"
ON public.site_assets
FOR ALL
USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Anyone can view site assets"
ON public.site_assets
FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_site_assets_updated_at
BEFORE UPDATE ON public.site_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default asset placeholders
INSERT INTO public.site_assets (asset_name, file_name, file_url) VALUES
('carousel_1', 'default-hero-1.jpg', '/placeholder.svg'),
('carousel_2', 'default-hero-2.jpg', '/placeholder.svg'),
('carousel_3', 'default-hero-3.jpg', '/placeholder.svg'),
('scratch_overlay', 'default-scratch.jpg', '/placeholder.svg'),
('logo', 'default-logo.png', '/placeholder.svg');

-- Create storage bucket for site assets if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for site assets
CREATE POLICY "Admins can upload site assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Anyone can view site assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can update site assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'site-assets' AND get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Admins can delete site assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'site-assets' AND get_user_role(auth.uid()) = 'admin'::app_role);