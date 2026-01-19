
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar.tsx"
import { DashboardSidebar } from "@/components/dashboard/Sidebar.tsx"
import { DashboardTopbar } from "@/components/dashboard/Topbar.tsx"
import { Outlet } from "react-router-dom"

export default function DashboardLayout({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <SidebarProvider>
      <DashboardSidebar isAdmin={isAdmin} />
      <SidebarInset>
        <DashboardTopbar />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {/* This is where the page content will be rendered */}
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
