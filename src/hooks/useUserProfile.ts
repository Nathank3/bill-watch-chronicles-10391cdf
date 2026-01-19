
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, UserRole } from '@/types/auth';

export const useUserProfile = () => {
  const [profileLoading, setProfileLoading] = useState(false);

  // Define valid role values as constants
  const adminRole: UserRole = "admin";
  const clerkRole: UserRole = "clerk";
  const publicRole: UserRole = "public";

  const fetchUserProfile = useCallback(async (userId: string): Promise<AuthUser | null> => {
    try {
      setProfileLoading(true);
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (data) {
        // Ensure role is never empty string, null or undefined
        let role: UserRole = publicRole;
        
        // Normalize role for comparison
        const dbRole = data.role ? data.role.toLowerCase().trim() : '';

        // Check if the role from DB match allowed types
        if (dbRole === adminRole || 
            dbRole === clerkRole || 
            dbRole === publicRole) {
          role = dbRole as UserRole;
        } else {
          console.warn(`Invalid role detected [${data.role}], defaulting to 'public'`);
        }
        
        console.log("User profile retrieved:", { username: data.username, role });
        
        return {
          id: userId,
          username: data.username || '',
          role
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  return { fetchUserProfile, profileLoading };
};
