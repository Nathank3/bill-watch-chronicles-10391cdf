
import { useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
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
        const role = (data.role || "public") as UserRole;
        
        if (!role || role === '') {
          console.warn("Empty role detected, defaulting to 'public'");
          data.role = "public";
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
