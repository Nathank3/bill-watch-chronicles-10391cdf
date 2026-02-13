
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Bell } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar.tsx"

export function DashboardTopbar() {
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
        <span className="font-semibold text-lg hidden md:block">{getGreeting()}, Clerk</span>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 border border-background"></span>
        </Button>
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
