
-- Allow admins to delete support messages
CREATE POLICY "Admins can delete messages"
ON public.support_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete support chats
CREATE POLICY "Admins can delete chats"
ON public.support_chats
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
