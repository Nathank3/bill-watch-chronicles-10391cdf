-- Fix critical privilege escalation vulnerability
-- Drop the overly permissive profile update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restrictive policies for profile updates
-- Users can only update non-sensitive fields (username) of their own profile
CREATE POLICY "Users can update their own username" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from modifying their role
  role = OLD.role
);

-- Only admins can update user roles (including their own)
CREATE POLICY "Admins can update user roles" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');