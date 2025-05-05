
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
  const ADMIN_ROLE = "admin";
  const CLERK_ROLE = "clerk";
  const PUBLIC_ROLE = "public";
  const VALID_ROLES = [ADMIN_ROLE, CLERK_ROLE, PUBLIC_ROLE];
  
  // Ensure role is always valid and never an empty string
  let safeRole: UserRole = PUBLIC_ROLE; // Default to public
  
  if (user.role && 
      typeof user.role === 'string' && 
      user.role.trim() !== "" && 
      VALID_ROLES.includes(user.role)) {
    safeRole = user.role as UserRole;
  } else {
    console.warn(`Invalid role "${user.role}" for user ${user.id}, defaulting to '${PUBLIC_ROLE}'`);
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
