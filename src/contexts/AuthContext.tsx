
import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { User, Session } from '@supabase/supabase-js';
import { AuthContextType, AuthUser } from '@/types/auth';
import { useUserProfile } from '@/hooks/useUserProfile';

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  isAdmin: false,
  isClerk: false,
  isLoading: true
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { fetchUserProfile } = useUserProfile();

  // Check for existing user session and setup auth state listener
  useEffect(() => {
    // Migration: Clear ALL legacy persistent sessions to ensure move to sessionStorage is clean
    Object.keys(localStorage).forEach(key => {
      if (key.includes("-auth-token") || key.includes("supabase.auth.token")) {
        console.log(`[AuthMigration] Found legacy persistent session [${key}], clearing...`);
        localStorage.removeItem(key);
      }
    });

    // Diagnostic Log
    console.log("[Auth] Current Storage Type:", supabase.auth.getSession().then(({ data }) => {
      const storageType = window.sessionStorage.getItem(Object.keys(window.sessionStorage).find(k => k.includes("-auth-token")) || "") ? "sessionStorage" : "unknown/none";
      console.log(`[Auth] Session active in: ${storageType}`);
    }));

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state change:", event, newSession?.user?.id);
        
        if (newSession?.user) {
          setSession(newSession);
          // If session exists, fetch user profile with role
          setTimeout(() => {
            handleProfileFetch(newSession.user.id);
          }, 0);
        } else {
          setUser(null);
          setSession(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Got initial session:", currentSession?.user?.id);
        
        if (currentSession?.user) {
          setSession(currentSession);
          await handleProfileFetch(currentSession.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for storage events to sync auth between tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'supabase.auth.token') {
        console.log("Auth storage changed, refreshing session");
        supabase.auth.getSession().then(({ data: { session: newSession } }) => {
          if (newSession?.user) {
            setSession(newSession);
            handleProfileFetch(newSession.user.id);
          } else if (session) {
            // If we had a session before but now we don't, user logged out in another tab
            setUser(null);
            setSession(null);
            navigate('/');
          }
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleProfileFetch = async (userId: string) => {
    try {
      const profile = await fetchUserProfile(userId);
      setUser(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login handler
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      // Navigate to home page immediately after successful login
      navigate("/");

      toast({
        title: "Login successful",
        description: `Welcome back!`,
      });

    } catch (err) {
      toast({
        title: "Login failed",
        description: (err as Error).message || "Invalid email or password",
        variant: "destructive"
      });
      throw err;
    }
    // isLoading will be set to false in fetchUserProfile
  };

  // Logout handler
  const logout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      setSession(null);
      navigate("/");
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (err) {
      toast({
        title: "Logout failed",
        description: (err as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isClerk: user?.role === "clerk",
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = () => useContext(AuthContext);
