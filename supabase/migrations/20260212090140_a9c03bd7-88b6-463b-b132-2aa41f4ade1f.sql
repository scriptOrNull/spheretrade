
-- Table for admin-managed crypto wallet addresses
CREATE TABLE public.admin_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_type text NOT NULL UNIQUE,
  wallet_address text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view wallets (needed for deposit page)
CREATE POLICY "Authenticated users can view wallets"
ON public.admin_wallets FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage wallets
CREATE POLICY "Admins can insert wallets"
ON public.admin_wallets FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update wallets"
ON public.admin_wallets FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete wallets"
ON public.admin_wallets FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default crypto types
INSERT INTO public.admin_wallets (crypto_type, wallet_address) VALUES
  ('BTC', ''),
  ('ETH', ''),
  ('USDT', ''),
  ('DOGE', ''),
  ('XRP', '');
