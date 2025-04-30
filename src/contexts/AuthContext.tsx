
import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

// Define user roles
export type UserRole = "admin" | "clerk" | "public";

// Define user type
export interface User {
  id: string;
  username: string;
  role: UserRole;
}

// Define auth context type
interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isClerk: boolean;
}

// Mock user data (in a real app, this would come from a database)
const mockUsers = [
  {
    id: "1",
    username: "admin",
    password: "admin123",
    role: "admin" as UserRole
  },
  {
    id: "2",
    username: "clerk",
    password: "clerk123",
    role: "clerk" as UserRole
  }
];

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  isAdmin: false,
  isClerk: false
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Check for existing user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Login handler
  const login = async (username: string, password: string) => {
    // In a real app, we'd make an API call to verify credentials
    const foundUser = mockUsers.find(
      u => u.username === username && u.password === password
    );

    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("user", JSON.stringify(userWithoutPassword));
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${username}!`,
      });
      
      // Redirect based on role
      if (foundUser.role === "admin") {
        navigate("/admin");
      } else if (foundUser.role === "clerk") {
        navigate("/clerk");
      }
    } else {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive"
      });
      throw new Error("Invalid username or password");
    }
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    navigate("/");
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isClerk: user?.role === "clerk"
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = () => useContext(AuthContext);
