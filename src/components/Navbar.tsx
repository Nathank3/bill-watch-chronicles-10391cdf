
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserIcon } from "./UserIcon.tsx";
import { NotificationBell } from "./NotificationBell.tsx";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils.ts";
const makueniLogoUrl = "/lovable-uploads/4e53edd2-c5d5-441a-8e85-dd6d8a88c97d.png";

interface Committee {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isClerk } = useAuth();
  const navigate = useNavigate();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    try {
      const { data, error } = await supabase
        .from('committees')
        .select('*')
        .order('name');

      if (error) throw error;
      setCommittees(data || []);
    } catch (error) {
      console.error('Error fetching committees:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b py-4 shadow-sm">
      <div className="container flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={makueniLogoUrl} alt="County Assembly of Makueni" className="h-8 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-sm font-medium text-blue-600 hover:text-green-600">
            Home
          </Link>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-sm font-medium text-blue-600 hover:text-green-600 bg-transparent hover:bg-transparent data-[state=open]:bg-transparent">
                  Committees
                </NavigationMenuTrigger>
                <NavigationMenuContent className="w-64">
                  <ScrollArea className="h-64 w-full">
                    <div className="p-2">
                      {committees.length > 0 ? (
                        committees.map((committee) => (
                          <Link
                            key={committee.id}
                            to={`/committee/${committee.id}`}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              {committee.name}
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-3 text-sm text-muted-foreground">
                          No committees available
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

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
                <NotificationBell />
                <UserIcon username={user?.username} onLogout={logout} />
              </div>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/login")}>
              Login
            </Button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-4">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
        </div>
      </div>

      {/* Mobile Menu Content */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t mt-4 p-4 space-y-4 bg-white animate-in slide-in-from-top-5">
           <Link 
             to="/" 
             className="block text-sm font-medium text-blue-600 hover:text-green-600"
             onClick={() => setIsMobileMenuOpen(false)}
           >
             Home
           </Link>
           
           <div className="space-y-2">
             <div className="text-sm font-medium text-gray-900">Committees</div>
             <ScrollArea className="h-40 w-full border rounded-md p-2">
               {committees.map((committee) => (
                 <Link
                   key={committee.id}
                   to={`/committee/${committee.id}`}
                   className="block py-2 text-sm text-gray-600 hover:text-green-600"
                   onClick={() => setIsMobileMenuOpen(false)}
                 >
                   {committee.name}
                 </Link>
               ))}
             </ScrollArea>
           </div>

           <Link 
             to="/documents" 
             className="block text-sm font-medium text-blue-600 hover:text-green-600"
             onClick={() => setIsMobileMenuOpen(false)}
           >
             Documents
           </Link>

           {isAuthenticated ? (
             <div className="pt-4 border-t space-y-4">
               {isAdmin && (
                 <Link 
                    to="/admin" 
                    className="block text-sm font-medium hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                 >
                   Admin Dashboard
                 </Link>
               )}
               {isClerk && (
                 <Link 
                    to="/clerk" 
                    className="block text-sm font-medium hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                 >
                   Clerk Dashboard
                 </Link>
               )}
               <div className="flex items-center justify-between">
                 <div className="text-sm text-gray-600">Logged in as {user?.username}</div>
                 <Button size="sm" variant="outline" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                    Logout
                 </Button>
               </div>
             </div>
           ) : (
             <Button className="w-full" onClick={() => { navigate("/login"); setIsMobileMenuOpen(false); }}>
               Login
             </Button>
           )}
        </div>
      )}
    </nav>
  );
};
