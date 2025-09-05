
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LucideGavel } from "@/components/icons/LucideGavel";

export const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isClerk } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b py-4 shadow-sm">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <LucideGavel className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Bill Tracker</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {/* Navigation links */}
          <Link to="/" className="text-sm font-medium hover:text-primary">
            Home
          </Link>
          
          <Link to="/documents" className="text-sm font-medium hover:text-primary">
            Documents
          </Link>
          
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="text-sm font-medium hover:text-primary">
                  Admin Dashboard
                </Link>
              )}
              
              {isClerk && (
                <Link to="/clerk" className="text-sm font-medium hover:text-primary">
                  Clerk Dashboard
                </Link>
              )}
              
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.username}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/login")}>
              Login
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
