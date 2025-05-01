
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
  // Define valid role values
  const adminRole: UserRole = "admin";
  const clerkRole: UserRole = "clerk";
  const publicRole: UserRole = "public";
  
  // Ensure role is never undefined, null, or empty string
  const safeRole = user.role && user.role.trim() !== "" 
    ? (user.role === adminRole || user.role === clerkRole || user.role === publicRole 
        ? user.role as UserRole 
        : publicRole)
    : publicRole;
  
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
