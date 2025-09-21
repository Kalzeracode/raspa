-- Create credit_purchases table for deposit/withdrawal tracking
CREATE TABLE public.credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL DEFAULT 'PIX',
  status TEXT NOT NULL DEFAULT 'pending',
  external_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own credit purchases" 
ON public.credit_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit purchases" 
ON public.credit_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credit purchases" 
ON public.credit_purchases 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin'::app_role);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_credit_purchases_updated_at
BEFORE UPDATE ON public.credit_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();