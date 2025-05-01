
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { AuthUser, UserRole } from '@/types/auth';

export const useUserProfile = () => {
  const [profileLoading, setProfileLoading] = useState(false);

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
        let role: UserRole = "public";
        
        // Check if the role from DB is null, undefined or not in our allowed types
        if (data.role && 
            data.role.trim() !== '' && 
            (data.role === 'admin' || 
             data.role === 'clerk' || 
             data.role === 'public')) {
          role = data.role as UserRole;
        } else {
          console.warn("Invalid role detected, defaulting to 'public'");
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
