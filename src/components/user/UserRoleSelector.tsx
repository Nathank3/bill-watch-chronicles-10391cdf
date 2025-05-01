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

  // Define role constants with explicit values to prevent empty strings
  const adminRole: UserRole = "admin";
  const clerkRole: UserRole = "clerk";
  const publicRole: UserRole = "public";

  // Always ensure a valid role, defaulting to 'public' if the current role is invalid
  const safeRole: UserRole = 
    (currentRole && 
     currentRole.trim() !== "" && 
     (currentRole === adminRole || currentRole === clerkRole || currentRole === publicRole)) 
    ? currentRole as UserRole 
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
          // Extra validation to ensure value is never empty
          if (value && value.trim() !== "") {
            updateUserRole(value);
          } else {
            console.error("Empty value detected in onValueChange");
          }
        }}
        disabled={disabled || updating}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {/* Ensure each SelectItem has a non-empty string value */}
          <SelectItem value={adminRole || "admin"}>{adminRole}</SelectItem>
          <SelectItem value={clerkRole || "clerk"}>{clerkRole}</SelectItem>
          <SelectItem value={publicRole || "public"}>{publicRole}</SelectItem>
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
