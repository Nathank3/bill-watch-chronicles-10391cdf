
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
import { validateRole } from "@/utils/roleUtils";

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
  onUserDeleted: (userId: string) => void;
  deletingUserId: string | null;
}

export const UsersTable = ({ 
  users, 
  loading, 
  updatingUserId,
  onRoleUpdated,
  onUserDeleted,
  deletingUserId
}: UsersTableProps) => {
  if (loading) {
    return <UserListSkeleton />;
  }

  // Ensure all users have valid roles
  const validatedUsers = users.map(user => ({
    ...user,
    role: validateRole(user.role)
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
              onUserDeleted={onUserDeleted}
              isDeleting={deletingUserId === user.id}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
};
