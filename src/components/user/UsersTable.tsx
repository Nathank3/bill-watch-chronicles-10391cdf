

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { UserTableRow } from "./UserTableRow.tsx";
import { UserListSkeleton } from "./UserListSkeleton.tsx";
import { validateRole } from "@/utils/roleUtils.ts";

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
  onPasswordReset: (userId: string, newPassword: string) => Promise<void>;
  onUsernameUpdated?: (userId: string, newUsername: string) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  currentUserId?: string;
}

export const UsersTable = ({
  users,
  loading,
  updatingUserId,
  onRoleUpdated,
  onUserDeleted,
  deletingUserId,
  onPasswordReset,
  onUsernameUpdated,
  isAdmin,
  isSuperAdmin = false,
  currentUserId
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {validatedUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
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
                onPasswordReset={onPasswordReset}
                onUsernameUpdated={onUsernameUpdated}

                isAdmin={isAdmin}
                isCurrentUserSuperAdmin={isSuperAdmin}
                currentUserId={currentUserId}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
