
import React from "react";
import {
  TableRow,
  TableCell
} from "@/components/ui/table";
import { UserRoleSelector } from "./UserRoleSelector";

interface UserTableRowProps {
  user: {
    id: string;
    email: string;
    role: string;
  };
  isUpdating: boolean;
  onRoleUpdated: (userId: string, newRole: string) => void;
}

export const UserTableRow = ({ user, isUpdating, onRoleUpdated }: UserTableRowProps) => {
  return (
    <TableRow key={user.id}>
      <TableCell>{user.email}</TableCell>
      <TableCell>{user.role || "public"}</TableCell>
      <TableCell>
        <UserRoleSelector
          userId={user.id}
          currentRole={user.role || "public"}
          onRoleUpdated={onRoleUpdated}
          disabled={isUpdating}
        />
      </TableCell>
    </TableRow>
  );
};
