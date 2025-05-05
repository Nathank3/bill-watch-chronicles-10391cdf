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

  // Define role constants with explicit string literals
  const ADMIN_ROLE = "admin";
  const CLERK_ROLE = "clerk";
  const PUBLIC_ROLE = "public";
  const VALID_ROLES = [ADMIN_ROLE, CLERK_ROLE, PUBLIC_ROLE];

  // Ensure we have a valid role before proceeding
  let safeRole: UserRole;
  if (typeof currentRole === 'string' && currentRole.trim() !== "" && VALID_ROLES.includes(currentRole)) {
    safeRole = currentRole as UserRole;
  } else {
    // Default to public role if invalid
    safeRole = PUBLIC_ROLE;
    console.warn(`Invalid role detected: "${currentRole}", defaulting to '${PUBLIC_ROLE}'`);
  }

  // Update user role
  const updateUserRole = async (newRole: string) => {
    // Additional validation to prevent empty role values
    if (!newRole || typeof newRole !== 'string' || newRole.trim() === "") {
      console.error("Invalid role value detected, ignoring update");
      toast({
        title: "Error updating role",
        description: "Role cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    // Skip if role is unchanged
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
        value={safeRole}
        onValueChange={(value) => {
          // Additional validation before updating
          if (value && value.trim() !== "" && VALID_ROLES.includes(value as UserRole)) {
            updateUserRole(value);
          } else {
            console.error(`Invalid value detected in onValueChange: "${value}"`);
            toast({
              title: "Error",
              description: "Invalid role value selected",
              variant: "destructive",
            });
          }
        }}
        disabled={disabled || updating}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ADMIN_ROLE}>{ADMIN_ROLE}</SelectItem>
          <SelectItem value={CLERK_ROLE}>{CLERK_ROLE}</SelectItem>
          <SelectItem value={PUBLIC_ROLE}>{PUBLIC_ROLE}</SelectItem>
        </SelectContent>
      </Select>

      {updating && <Loader2 className="h-4 w-4 animate-spin" />}
      
      {safeRole !== ADMIN_ROLE && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateUserRole(ADMIN_ROLE)}
          disabled={disabled || updating}
        >
          Make Admin
        </Button>
      )}
      
      {safeRole !== CLERK_ROLE && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateUserRole(CLERK_ROLE)}
          disabled={disabled || updating}
        >
          Make Clerk
        </Button>
      )}
    </div>
  );
};
