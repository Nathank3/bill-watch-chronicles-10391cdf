
-- First, let's add a password_reset_tokens table for the forgot password functionality
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on password_reset_tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for password reset tokens (only the user can access their own tokens)
CREATE POLICY "Users can view their own reset tokens" 
  ON public.password_reset_tokens 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy for inserting reset tokens (public access for password reset)
CREATE POLICY "Anyone can create reset tokens" 
  ON public.password_reset_tokens 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy for updating reset tokens (only the user can update their own)
CREATE POLICY "Users can update their own reset tokens" 
  ON public.password_reset_tokens 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Update the handle_new_user function to ensure usernames are properly set
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'username', new.email), 
    'public'
  );
  RETURN new;
END;
$function$;

-- Create a function to clean up expired password reset tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < now() OR used = true;
$function$;
