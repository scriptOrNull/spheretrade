-- Fix: Restrict admin_wallets SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view wallets" ON public.admin_wallets;

CREATE POLICY "Admins can view wallets"
ON public.admin_wallets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));