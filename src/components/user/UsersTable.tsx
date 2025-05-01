
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserTableRow } from "./UserTableRow";
import { UserListSkeleton } from "./UserListSkeleton";
import { UserRole } from "@/types/auth";

interface UserInfo {
  id: string;
  username: string | null;
  email: string;
  role: string;
}

interface UsersTableProps {
  users: UserInfo[];
  loading: boolean;
  updatingUserId: string | null;
  onRoleUpdated: (userId: string, newRole: string) => void;
}

export const UsersTable = ({ 
  users, 
  loading, 
  updatingUserId,
  onRoleUpdated 
}: UsersTableProps) => {
  // Define default role
  const defaultRole: UserRole = "public";

  if (loading) {
    return <UserListSkeleton />;
  }

  // Ensure all users have valid roles
  const validatedUsers = users.map(user => ({
    ...user,
    role: user.role && user.role.trim() !== "" ? 
      (["admin", "clerk", "public"].includes(user.role) ? user.role : defaultRole) : 
      defaultRole
  }));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {validatedUsers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center py-6">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          validatedUsers.map((user) => (
            <UserTableRow
              key={user.id} 
              user={user} 
              isUpdating={updatingUserId === user.id}
              onRoleUpdated={onRoleUpdated}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
};
