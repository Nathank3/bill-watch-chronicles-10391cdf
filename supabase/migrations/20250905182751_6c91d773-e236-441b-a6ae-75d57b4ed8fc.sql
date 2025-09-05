-- Fix critical privilege escalation vulnerability
-- Drop the overly permissive profile update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a function to safely update user profiles without allowing role changes
CREATE OR REPLACE FUNCTION public.can_update_profile(target_user_id uuid, new_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- If the user is updating their own profile
      WHEN auth.uid() = target_user_id THEN
        -- They can only update if the role hasn't changed
        new_role = (SELECT role FROM public.profiles WHERE id = target_user_id)
      -- If the user is an admin
      WHEN get_current_user_role() = 'admin' THEN
        true
      ELSE
        false
    END;
$$;

-- Users can update their own profile but cannot change their role
CREATE POLICY "Users can update their own profile safely" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (can_update_profile(id, role));

-- Admins can update any profile including roles
CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');