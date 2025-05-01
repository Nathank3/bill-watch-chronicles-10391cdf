
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
  // Define valid role values as constants
  const adminRole: UserRole = "admin";
  const clerkRole: UserRole = "clerk";
  const publicRole: UserRole = "public";
  
  // Ensure role is never undefined, null, or empty string
  // Strict validation to guarantee we have a valid role
  let safeRole: UserRole;
  if (user.role && user.role.trim() !== "") {
    if (user.role === adminRole) {
      safeRole = adminRole;
    } else if (user.role === clerkRole) {
      safeRole = clerkRole;
    } else {
      safeRole = publicRole;
    }
  } else {
    safeRole = publicRole;
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
