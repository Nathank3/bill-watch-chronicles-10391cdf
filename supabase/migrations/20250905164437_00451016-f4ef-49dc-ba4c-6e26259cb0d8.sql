-- Fix the overly permissive password reset tokens policy
-- Drop the current insecure policy
DROP POLICY IF EXISTS "Anyone can create reset tokens" ON public.password_reset_tokens;

-- Since the app uses Supabase's built-in password reset functionality,
-- we should restrict the custom password_reset_tokens table to prevent abuse
-- Only allow system/service operations to create tokens (effectively disabling public access)
CREATE POLICY "Restrict token creation to service accounts only" 
ON public.password_reset_tokens 
FOR INSERT 
WITH CHECK (false);

-- If this table is not being used by the application, consider dropping it entirely
-- For now, we'll keep it but make it secure