-- Update RLS policy to allow public access to active raspadinhas
DROP POLICY IF EXISTS "Users can view basic raspadinha info" ON public.raspadinhas;

CREATE POLICY "Everyone can view active raspadinhas" 
ON public.raspadinhas 
FOR SELECT 
USING (ativo = true);