import React, { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ADMIN_ROLE, CLERK_ROLE, PUBLIC_ROLE, SUPER_ADMIN_ROLE, validateRole } from "@/utils/roleUtils";

interface UserRoleSelectorProps {
  userId: string;
  currentRole: string;
  onRoleUpdated: (userId: string, newRole: string) => void;
  disabled?: boolean;
  currentUserIsSuperAdmin?: boolean;
}

export const UserRoleSelector = ({
  userId,
  currentRole,
  onRoleUpdated,
  disabled = false,
  currentUserIsSuperAdmin = false
}: UserRoleSelectorProps) => {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const safeRole = validateRole(currentRole);

  const updateUserRole = async (newRole: string) => {
    if (newRole === safeRole) return;
    
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user-roles", {
        body: { userId, role: newRole }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onRoleUpdated(userId, newRole);
      
      toast({
        title: "Role updated",
        description: "User role has been successfully updated.",
      });
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update user role.",
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
        {currentUserIsSuperAdmin && (
             <div className="flex items-center space-x-2">
              <RadioGroupItem value={SUPER_ADMIN_ROLE} id={`${userId}-super_admin`} className="border-red-400 text-red-600" />
              <Label htmlFor={`${userId}-super_admin`} className="text-red-600 font-bold">Super Admin</Label>
            </div>
        )}
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
