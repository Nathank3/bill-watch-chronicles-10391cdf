
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx"
import { SidebarTrigger } from "@/components/ui/sidebar.tsx"
import { NotificationBell } from "@/components/NotificationBell.tsx"
import { Wifi } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext.tsx"

export function DashboardTopbar() {
  const { user } = useAuth()
  
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 justify-between">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <span className="font-semibold text-lg hidden md:block">
          {getGreeting()}, {user?.username || "Clerk"}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* System Health Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200">
            <Wifi className="h-3 w-3" />
            <span className="font-medium">System Normal</span>
        </div>

        <NotificationBell />
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
