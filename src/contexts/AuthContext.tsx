
import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { User, Session } from '@supabase/supabase-js';

// Define user roles
export type UserRole = "admin" | "clerk" | "public";

// Define user type
export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

// Define auth context type
interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClerk: boolean;
  isLoading: boolean;
}

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

  // Check for existing user session and setup auth state listener
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state change:", event, newSession?.user?.id);
        setSession(newSession);
        
        if (newSession?.user) {
          // If session exists, fetch user profile with role
          setTimeout(() => {
            fetchUserProfile(newSession.user.id);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Got initial session:", currentSession?.user?.id);
      setSession(currentSession);
      
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching profile for user:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUser(null);
      } else if (data) {
        // Ensure role is never empty string, null or undefined
        const safeRole = data.role || "public";
        console.log("User profile retrieved:", { username: data.username, role: safeRole });
        
        setUser({
          id: userId,
          username: data.username || '',
          role: safeRole as UserRole
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
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

      // Navigation happens in useEffect based on user role
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
    } finally {
      // isLoading will be set to false in fetchUserProfile
    }
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

  // Redirect based on role when user state changes
  useEffect(() => {
    if (user && !isLoading) {
      console.log("User role:", user.role);
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "clerk") {
        navigate("/clerk");
      }
    }
  }, [user, isLoading, navigate]);

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
