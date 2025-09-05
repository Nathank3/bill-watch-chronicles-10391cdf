-- Fix the cleanup function search path
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at < now() OR used = true;
$function$;