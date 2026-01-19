
import { AdminUsers } from "@/components/AdminUsers.tsx";

export default function UserManagementView() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
      <AdminUsers />
    </div>
  );
}
