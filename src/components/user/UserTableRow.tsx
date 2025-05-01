
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
  // Define valid role values as constants with explicit string literals
  const adminRole = "admin";
  const clerkRole = "clerk";
  const publicRole = "public";
  const validRoles = [adminRole, clerkRole, publicRole];
  
  // Ensure role is always valid and never an empty string
  let safeRole: UserRole = publicRole; // Default to public
  
  if (user.role && user.role.trim() !== "" && validRoles.includes(user.role)) {
    safeRole = user.role as UserRole;
  }
  
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
