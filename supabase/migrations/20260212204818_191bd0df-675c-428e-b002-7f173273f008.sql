
-- Create update_updated_at function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Support chats table
CREATE TABLE public.support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats" ON public.support_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.support_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON public.support_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all chats" ON public.support_chats FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all chats" ON public.support_chats FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own chats" ON public.support_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.support_chats WHERE id = chat_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert messages in own chats" ON public.support_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.support_chats WHERE id = chat_id AND user_id = auth.uid()));
CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert messages" ON public.support_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = sender_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;

-- Trigger for updated_at
CREATE TRIGGER update_support_chats_updated_at
  BEFORE UPDATE ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
