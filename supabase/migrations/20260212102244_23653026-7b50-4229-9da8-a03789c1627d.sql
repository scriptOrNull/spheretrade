-- Add unique user_code to profiles for easy transfers
ALTER TABLE public.profiles ADD COLUMN user_code TEXT UNIQUE;

-- Generate user codes for existing users (6-char alphanumeric)
UPDATE public.profiles SET user_code = UPPER(SUBSTR(MD5(id::text), 1, 6)) WHERE user_code IS NULL;

-- Make it NOT NULL with a default for new users
ALTER TABLE public.profiles ALTER COLUMN user_code SET DEFAULT UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 6));
ALTER TABLE public.profiles ALTER COLUMN user_code SET NOT NULL;

-- Create a trigger to auto-generate user_code on insert if not provided
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_code IS NULL OR NEW.user_code = '' THEN
    NEW.user_code := UPPER(SUBSTR(MD5(NEW.id::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_user_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_user_code();
