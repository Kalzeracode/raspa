-- Add DELETE policy for admins on raspadinhas table
CREATE POLICY "Admins can delete raspadinhas" 
ON public.raspadinhas 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'admin'::app_role);