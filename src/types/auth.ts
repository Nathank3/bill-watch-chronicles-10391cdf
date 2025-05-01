
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
export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClerk: boolean;
  isLoading: boolean;
}
