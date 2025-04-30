
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  const { toast } = useToast();
  const { session } = useAuth();

  // Fetch all users and their profiles
  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, role");

        if (error) throw error;

        // Get the user emails from auth (requires admin privileges)
        const usersWithEmails = await Promise.all(
          data.map(async (profile) => {
            // We'll assume username is email for now
            return {
              id: profile.id,
              username: profile.username,
              email: profile.username || "",
              role: profile.role,
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

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    if (!session) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to perform this action.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(userId);
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

      // Update the local state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

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
      setUpdating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Users</CardTitle>
        <CardDescription>
          Assign admin or clerk roles to users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateUserRole(user.id, value)}
                          disabled={updating === user.id}
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
                        
                        {updating === user.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        
                        {user.role !== "admin" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserRole(user.id, "admin")}
                            disabled={updating === user.id}
                          >
                            Make Admin
                          </Button>
                        )}
                        
                        {user.role !== "clerk" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserRole(user.id, "clerk")}
                            disabled={updating === user.id}
                          >
                            Make Clerk
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
