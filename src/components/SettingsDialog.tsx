import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { useSystemSettings } from "@/hooks/useSystemSettings.ts";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { ShieldAlert, construction } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar.tsx";
import { Settings } from "lucide-react";

export function SettingsDialog() {
  const { isMaintenanceMode, toggleMaintenanceMode } = useSystemSettings();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <SidebarMenuButton tooltip="System Settings" className="text-white hover:bg-white/10 hover:text-white">
          <Settings />
          <span>System Settings</span>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>System Settings</DialogTitle>
          <DialogDescription>
            Manage global configuration for the application.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-secondary/20">
            <div className="space-y-1">
              <Label htmlFor="maintenance-mode" className="text-base font-semibold flex items-center gap-2">
                Maintenance Mode
                {isMaintenanceMode && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">Active</span>}
              </Label>
              <p className="text-sm text-muted-foreground">
                Restrict public access to the application. Admins can still access the dashboard.
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={isMaintenanceMode}
              onCheckedChange={toggleMaintenanceMode}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
