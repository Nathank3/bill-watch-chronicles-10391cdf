
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast.ts";
import { supabase } from "@/integrations/supabase/client.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { UsersTable } from "./user/UsersTable.tsx";
import { AdminUserManagement } from "./AdminUserManagement.tsx";
import { validateRole } from "@/utils/roleUtils.ts";
import { isSuperAdmin as checkIsSuperAdmin } from "@/utils/security.ts";

type UserInfo = {
  id: string;
  username: string | null;
  email: string;
  role: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const { session, user, isSuperAdmin } = useAuth();

  console.log("AdminUsers Render:", { user, isSuperAdmin });

  // Fetch all users and their profiles
  useEffect(() => {
    async function fetchUsers() {
      try {
        console.log("Fetching users...");
        const { data, error } = await supabase.functions.invoke("fetch-users");

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        console.log("Users fetched:", data.users);

        const processedUsers = data.users.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: validateRole(u.role),
        }));

        setUsers(processedUsers);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        setError(error.message);
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

    // Prevent deletion of Secret Admin
    const targetUser = users.find(u => u.id === userId);
    if (checkIsSuperAdmin(targetUser?.email)) {
        toast({
            title: "Action Denied",
            description: "You cannot delete the system administrator.",
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

  // Handle password reset
  const handlePasswordReset = async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { userId, newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Password updated",
        description: "User password has been successfully updated.",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error updating password",
        description: (error as Error).message || "Failed to update password.",
        variant: "destructive",
      });
    }
  };

  // Handle username update
  const handleUsernameUpdate = async (userId: string, newUsername: string) => {
    try {
        const { error } = await supabase.functions.invoke("update-user-profile", {
            body: { userId, username: newUsername }
        });
        if (error) throw error;
        
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, username: newUsername } : u));
        toast({ title: "Updated", description: "Username updated successfully." });
    } catch (e: any) {
        console.error("Error updating username:", e);
        toast({ variant: "destructive", title: "Error", description: e.message || "Failed to update username" });
    }
  };

  if (error) {
      return <div className="p-4 text-red-500">Error: {error}</div>;
  }

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
            onPasswordReset={handlePasswordReset}
            onUsernameUpdated={handleUsernameUpdate}
            isAdmin={!!user && (user.role === 'admin' || !!isSuperAdmin)}
            isSuperAdmin={!!isSuperAdmin}
            currentUserId={user?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
