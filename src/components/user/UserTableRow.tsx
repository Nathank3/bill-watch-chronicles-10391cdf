
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserRoleSelector } from "./UserRoleSelector";
import { validateRole } from "@/utils/roleUtils";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserTableRowProps {
  user: {
    id: string;
    email: string;
    role: string;
  };
  isUpdating: boolean;
  onRoleUpdated: (userId: string, newRole: string) => void;
  onUserDeleted: (userId: string) => void;
  isDeleting: boolean;
}

export const UserTableRow = ({ 
  user, 
  isUpdating, 
  onRoleUpdated, 
  onUserDeleted, 
  isDeleting 
}: UserTableRowProps) => {
  // Ensure role is always valid using our utility function
  const safeRole = validateRole(user.role);
  
  return (
    <TableRow>
      <TableCell>{user.email}</TableCell>
      <TableCell>{safeRole}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <UserRoleSelector
            userId={user.id}
            currentRole={safeRole}
            onRoleUpdated={onRoleUpdated}
            disabled={isUpdating || isDeleting}
          />
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isUpdating || isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the user "{user.email}"? 
                  This action cannot be undone and will permanently remove their account and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onUserDeleted(user.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete User
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
};
