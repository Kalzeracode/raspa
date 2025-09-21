-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'influencer');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  saldo DECIMAL(10,2) DEFAULT 0.00,
  afiliado_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create raspadinhas table
CREATE TABLE public.raspadinhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  imagem_url TEXT,
  premio DECIMAL(10,2) NOT NULL,
  chances DECIMAL(5,4) NOT NULL CHECK (chances >= 0 AND chances <= 1),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on raspadinhas
ALTER TABLE public.raspadinhas ENABLE ROW LEVEL SECURITY;

-- Create jogadas table
CREATE TABLE public.jogadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raspadinha_id UUID NOT NULL REFERENCES public.raspadinhas(id) ON DELETE CASCADE,
  resultado BOOLEAN NOT NULL,
  premio_ganho DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on jogadas
ALTER TABLE public.jogadas ENABLE ROW LEVEL SECURITY;

-- Create afiliados table
CREATE TABLE public.afiliados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_registros INTEGER DEFAULT 0,
  ganhos DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on afiliados
ALTER TABLE public.afiliados ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for raspadinhas
CREATE POLICY "Anyone can view active raspadinhas" ON public.raspadinhas
  FOR SELECT USING (ativo = true);

CREATE POLICY "Admins can manage raspadinhas" ON public.raspadinhas
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for jogadas
CREATE POLICY "Users can view own jogadas" ON public.jogadas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jogadas" ON public.jogadas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all jogadas" ON public.jogadas
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for afiliados
CREATE POLICY "Users can view own afiliado data" ON public.afiliados
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Influencers can insert afiliado data" ON public.afiliados
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.get_user_role(auth.uid()) = 'influencer');

CREATE POLICY "Influencers can update own afiliado data" ON public.afiliados
  FOR UPDATE USING (auth.uid() = user_id AND public.get_user_role(auth.uid()) = 'influencer');

CREATE POLICY "Admins can view all afiliados" ON public.afiliados
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_raspadinhas_updated_at
  BEFORE UPDATE ON public.raspadinhas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_afiliados_updated_at
  BEFORE UPDATE ON public.afiliados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for raspadinha images
INSERT INTO storage.buckets (id, name, public) VALUES ('raspadinhas', 'raspadinhas', true);

-- Storage policies for raspadinha images
CREATE POLICY "Public can view raspadinha images" ON storage.objects
  FOR SELECT USING (bucket_id = 'raspadinhas');

CREATE POLICY "Admins can upload raspadinha images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'raspadinhas' AND public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update raspadinha images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'raspadinhas' AND public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete raspadinha images" ON storage.objects
  FOR DELETE USING (bucket_id = 'raspadinhas' AND public.get_user_role(auth.uid()) = 'admin');