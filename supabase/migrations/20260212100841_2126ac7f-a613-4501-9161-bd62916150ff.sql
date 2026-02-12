
-- Table to track scheduled account deletions
CREATE TABLE public.account_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  delete_after timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion request"
ON public.account_deletions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deletion request"
ON public.account_deletions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deletion request"
ON public.account_deletions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all deletion requests"
ON public.account_deletions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage deletion requests"
ON public.account_deletions FOR ALL
USING (has_role(auth.uid(), 'admin'));
