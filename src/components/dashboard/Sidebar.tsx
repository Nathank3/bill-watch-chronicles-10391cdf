import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar.tsx"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible.tsx"
import {
  LayoutDashboard,
  CheckSquare,
  Database,
  Users,
  Briefcase,
  BarChart,
  ChevronRight,
  LogOut,
  ShieldAlert
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext.tsx"

import logo from "@/assets/makueni-county.png";

export function DashboardSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const navigate = useNavigate()
  const { logout, isAdmin: authIsAdmin, isClerk } = useAuth()
  
  // Prefer auth context role logic over prop if available, or fallback
  const effectiveIsAdmin = authIsAdmin || isAdmin;

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }


  const portalTitle = effectiveIsAdmin ? "Admin Portal" : (isClerk ? "Clerk Portal" : "Staff Portal");

  return (
    <Sidebar collapsible="icon" className="bg-black text-white border-r border-white/10">
      <SidebarHeader className="p-4 bg-black">
        <div className="flex items-center gap-2 font-bold text-xl text-white">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <span className="group-data-[collapsible=icon]:hidden">
             {portalTitle}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-black text-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Overview */}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Overview" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/10 hover:text-white">
                  <LayoutDashboard />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* View Business */}
              <Collapsible asChild defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="View Business" className="text-white hover:bg-white/10 hover:text-white">
                      <Briefcase />
                      <span>View Business</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {["Bills", "Motions", "Statements", "Reports", "Regulations", "Policies", "Petitions"].map((item) => (
                        <SidebarMenuSubItem key={item}>
                          <SidebarMenuSubButton onClick={() => navigate(`/dashboard/view/${item.toLowerCase()}`)} className="text-gray-300 hover:text-white hover:bg-white/5">
                            <span>{item}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Add Business - REMOVED as per user request to reduce redundancy */}
              
               {/* Admin Only Menus */}
              {effectiveIsAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Review Business" onClick={() => navigate("/dashboard/review")} className="text-white hover:bg-white/10 hover:text-white">
                      <CheckSquare />
                      <span>Review Business</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Data Control" onClick={() => navigate("/dashboard/data-control")} className="text-white hover:bg-white/10 hover:text-white">
                      <Database />
                      <span>Data Control</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="User Management" onClick={() => navigate("/dashboard/users")} className="text-white hover:bg-white/10 hover:text-white">
                      <Users />
                      <span>User Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                   <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Committees" onClick={() => navigate("/dashboard/committees")} className="text-white hover:bg-white/10 hover:text-white">
                      <Users className="text-gray-400" /> 
                      <span>Committees</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Analytics" onClick={() => navigate("/dashboard/analytics")} className="text-white hover:bg-white/10 hover:text-white">
                      <BarChart />
                      <span>Analytics</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="System Audit" onClick={() => navigate("/dashboard/audit")} className="text-white hover:bg-white/10 hover:text-white">
                      <ShieldAlert />
                      <span>System Audit</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-black">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-red-400 hover:text-red-500 hover:bg-red-900/10">
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
