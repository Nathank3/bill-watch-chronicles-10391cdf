
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
  if (loading) {
    return <UserListSkeleton />;
  }

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
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center py-6">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
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
