
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserIconProps {
  username?: string;
  onLogout: () => void;
}

export const UserIcon = ({ username, onLogout }: UserIconProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return `Good morning, ${username || "User"}`;
    } else if (hour < 18) {
      return `Good afternoon, ${username || "User"}`;
    } else {
      return `Good evening, ${username || "User"}`;
    }
  };

  const greeting = getGreeting();

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{greeting}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onLogout}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};

interface LoginIconProps {
  onClick: () => void;
}

export const LoginIcon = ({ onClick }: LoginIconProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onClick}>
            <User className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Log in</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

