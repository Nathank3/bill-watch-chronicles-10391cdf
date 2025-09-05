-- Recreate the function with proper search path without dropping
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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