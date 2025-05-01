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

  // Ensure currentRole is never empty
  const safeRole = currentRole || "public";

  // Update user role
  const updateUserRole = async (newRole: string) => {
    // Skip if the role is empty or unchanged
    if (!newRole || newRole === "") {
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

      if (data.error) {
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
        onValueChange={updateUserRole}
        disabled={disabled || updating}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="clerk">Clerk</SelectItem>
          <SelectItem value="public">Public</SelectItem>
        </SelectContent>
      </Select>

      {updating && <Loader2 className="h-4 w-4 animate-spin" />}
      
      {safeRole !== "admin" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateUserRole("admin")}
          disabled={disabled || updating}
        >
          Make Admin
        </Button>
      )}
      
      {safeRole !== "clerk" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateUserRole("clerk")}
          disabled={disabled || updating}
        >
          Make Clerk
        </Button>
      )}
    </div>
  );
};
