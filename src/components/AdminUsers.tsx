
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
import { UserRole } from "@/types/auth";

type UserInfo = {
  id: string;
  username: string | null;
  email: string;
  role: UserRole;
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

        // Map the roles to ensure they are valid UserRole types
        const usersWithEmails = await Promise.all(
          data.map(async (profile) => {
            // Validate and normalize role to ensure it's a valid UserRole
            let role: UserRole = "public";
            
            if (profile.role && profile.role.trim() !== "") {
              if (["admin", "clerk", "public"].includes(profile.role)) {
                role = profile.role as UserRole;
              }
            }
            
            return {
              id: profile.id,
              username: profile.username,
              email: profile.username || "",
              role,
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

    // Never accept empty role values
    if (!newRole || newRole.trim() === "") {
      toast({
        title: "Invalid role",
        description: "Role cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    // Validate that the role is one of our allowed types
    if (newRole !== "admin" && newRole !== "clerk" && newRole !== "public") {
      toast({
        title: "Invalid role",
        description: "Role must be admin, clerk, or public.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(userId);
    // The actual API call is handled in the UserRoleSelector component
    // We just need to update our local state here
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, role: newRole as UserRole } : user
      )
    );
    setUpdating(null);
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
        <UsersTable 
          users={users} 
          loading={loading} 
          updatingUserId={updating} 
          onRoleUpdated={handleRoleUpdate} 
        />
      </CardContent>
    </Card>
  );
}
