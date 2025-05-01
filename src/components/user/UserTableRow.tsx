
import React from "react";
import {
  TableRow,
  TableCell
} from "@/components/ui/table";
import { UserRoleSelector } from "./UserRoleSelector";
import { UserRole } from "@/types/auth";

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
  // Ensure role is never undefined, null, or empty string
  const safeRole = user.role && user.role.trim() !== "" 
    ? (user.role === "admin" || user.role === "clerk" || user.role === "public" 
        ? user.role as UserRole 
        : "public" as UserRole)
    : "public" as UserRole;
  
  return (
    <TableRow>
      <TableCell>{user.email}</TableCell>
      <TableCell>{safeRole}</TableCell>
      <TableCell>
        <UserRoleSelector
          userId={user.id}
          currentRole={safeRole}
          onRoleUpdated={onRoleUpdated}
          disabled={isUpdating}
        />
      </TableCell>
    </TableRow>
  );
};
