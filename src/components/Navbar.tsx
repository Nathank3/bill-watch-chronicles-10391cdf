
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
const makueniLogoUrl = "/lovable-uploads/4e53edd2-c5d5-441a-8e85-dd6d8a88c97d.png";

export const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isClerk } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b py-4 shadow-sm">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={makueniLogoUrl} alt="County Assembly of Makueni" className="h-8 w-auto" />
        </Link>
        
        <div className="flex items-center gap-4">
          {/* Navigation links */}
          <Link to="/" className="text-sm font-medium text-blue-600 hover:text-green-600">
            Home
          </Link>
          
          <Link to="/documents" className="text-sm font-medium text-blue-600 hover:text-green-600">
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
