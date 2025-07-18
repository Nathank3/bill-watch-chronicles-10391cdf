
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UsersTable } from "./user/UsersTable";
import { AdminUserManagement } from "./AdminUserManagement";
import { validateRole } from "@/utils/roleUtils";

type UserInfo = {
  id: string;
  username: string | null;
  email: string;
  role: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const { session, user } = useAuth();

  // Fetch all users and their profiles
  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, role");

        if (error) throw error;

        // Map the roles to ensure they are valid
        const usersWithEmails = await Promise.all(
          data.map(async (profile) => {
            return {
              id: profile.id,
              username: profile.username,
              email: profile.username || "",
              role: validateRole(profile.role),
            };
          })
        );

        setUsers(usersWithEmails);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error fetching users",
          description: "Failed to load users. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [toast]);

  // Handle role updates
  const handleRoleUpdate = (userId: string, newRole: string) => {
    if (!session) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }

    // Validate the role
    const validatedRole = validateRole(newRole);
    if (validatedRole !== newRole) {
      toast({
        title: "Invalid role",
        description: `Role "${newRole}" is not valid. Using "${validatedRole}" instead.`,
        variant: "destructive",
      });
      return;
    }

    setUpdating(userId);
    // The actual API call is handled in the UserRoleSelector component
    // We just need to update our local state here
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, role: validatedRole } : user
      )
    );
    setUpdating(null);
  };

  // Handle user deletion
  const handleUserDelete = async (userId: string) => {
    if (!session) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }

    // Prevent user from deleting themselves
    if (user && userId === user.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(userId);

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Remove user from local state
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));

      toast({
        title: "User deleted",
        description: "User has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: (error as Error).message || "Failed to delete user.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminUserManagement />
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>
            Assign admin or clerk roles to users, or delete user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable 
            users={users} 
            loading={loading} 
            updatingUserId={updating} 
            onRoleUpdated={handleRoleUpdate}
            onUserDeleted={handleUserDelete}
            deletingUserId={deleting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
