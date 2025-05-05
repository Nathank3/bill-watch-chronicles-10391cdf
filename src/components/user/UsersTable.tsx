
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
  // Define valid role values as constants with explicit string literals
  const ADMIN_ROLE = "admin";
  const CLERK_ROLE = "clerk";
  const PUBLIC_ROLE = "public";
  const VALID_ROLES = [ADMIN_ROLE, CLERK_ROLE, PUBLIC_ROLE];

  if (loading) {
    return <UserListSkeleton />;
  }

  // Ensure all users have valid roles that are never empty strings
  const validatedUsers = users.map(user => {
    let role: UserRole = PUBLIC_ROLE; // Always start with a valid default
    
    // Check if the role from DB is valid
    if (user.role && 
        typeof user.role === 'string' &&
        user.role.trim() !== '' && 
        VALID_ROLES.includes(user.role as UserRole)) {
      role = user.role as UserRole;
    } else {
      console.warn(`Invalid or empty role detected for user ${user.id}, defaulting to '${PUBLIC_ROLE}'`);
    }
    
    return {
      ...user,
      role
    };
  });

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
