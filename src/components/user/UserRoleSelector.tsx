
import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { UserRole } from "@/types/auth";

interface UserRoleSelectorProps {
  userId: string;
  currentRole: string;
  onRoleUpdated: (userId: string, newRole: string) => void;
  disabled?: boolean;
}

export const UserRoleSelector = ({
  userId,
  currentRole,
  onRoleUpdated,
  disabled = false
}: UserRoleSelectorProps) => {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Define role constants to ensure non-empty values
  const adminRole = "admin" as UserRole;
  const clerkRole = "clerk" as UserRole;
  const publicRole = "public" as UserRole;

  // Ensure currentRole is never empty - default to "public" if empty or invalid
  const safeRole: UserRole = currentRole && currentRole.trim() !== "" 
    ? (currentRole === adminRole || currentRole === clerkRole || currentRole === publicRole 
        ? (currentRole as UserRole) 
        : publicRole)
    : publicRole;

  // Update user role
  const updateUserRole = async (newRole: string) => {
    // Skip if the role is empty or unchanged
    if (!newRole || newRole.trim() === "") {
      console.error("Empty role value detected, ignoring update");
      toast({
        title: "Error updating role",
        description: "Role cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    if (newRole === safeRole) return;
    
    setUpdating(true);
    try {
      // Call the Edge Function to update the role
      const { data, error } = await supabase.functions.invoke("manage-user-roles", {
        body: { userId, role: newRole },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      onRoleUpdated(userId, newRole);

      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}.`,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error updating role",
        description: (error as Error).message || "Failed to update user role.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Select
        defaultValue={safeRole} 
        value={safeRole}
        onValueChange={(value) => {
          if (value && value.trim() !== "") {
            updateUserRole(value);
          }
        }}
        disabled={disabled || updating}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={adminRole}>{adminRole}</SelectItem>
          <SelectItem value={clerkRole}>{clerkRole}</SelectItem>
          <SelectItem value={publicRole}>{publicRole}</SelectItem>
        </SelectContent>
      </Select>

      {updating && <Loader2 className="h-4 w-4 animate-spin" />}
      
      {safeRole !== adminRole && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateUserRole(adminRole)}
          disabled={disabled || updating}
        >
          Make Admin
        </Button>
      )}
      
      {safeRole !== clerkRole && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateUserRole(clerkRole)}
          disabled={disabled || updating}
        >
          Make Clerk
        </Button>
      )}
    </div>
  );
};
