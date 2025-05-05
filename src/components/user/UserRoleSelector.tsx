import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ADMIN_ROLE, CLERK_ROLE, PUBLIC_ROLE, validateRole } from "@/utils/roleUtils";

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
  
  // Validate current role to ensure it's never empty or invalid
  const safeRole = validateRole(currentRole);
  
  // Handle role changes
  const updateUserRole = async (newRole: string) => {
    // Validate the new role
    const validatedRole = validateRole(newRole);
    
    // Skip if role is unchanged
    if (validatedRole === safeRole) return;
    
    setUpdating(true);
    try {
      // Call the Edge Function to update the role
      const { data, error } = await supabase.functions.invoke("manage-user-roles", {
        body: { userId, role: validatedRole },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      onRoleUpdated(userId, validatedRole);

      toast({
        title: "Role updated",
        description: `User role has been updated to ${validatedRole}.`,
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
    <div className="space-y-4">
      <RadioGroup 
        value={safeRole} 
        onValueChange={updateUserRole}
        className="flex flex-col space-y-2"
        disabled={disabled || updating}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value={ADMIN_ROLE} id={`${userId}-admin`} />
          <Label htmlFor={`${userId}-admin`}>Admin</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value={CLERK_ROLE} id={`${userId}-clerk`} />
          <Label htmlFor={`${userId}-clerk`}>Clerk</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value={PUBLIC_ROLE} id={`${userId}-public`} />
          <Label htmlFor={`${userId}-public`}>Public</Label>
        </div>
      </RadioGroup>

      {updating && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
    </div>
  );
};
