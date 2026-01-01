// src/app/(sidebar)/admin/users/page.tsx
import { getAllUsers, getAllRoles, getAllBranches } from '@/lib/actions/auth';
import { UsersTable } from '@/components/users-table';
import { AddUserDialog } from '@/components/add-user-dialog';

export default async function UsersPage() {
  const [users, roles, branches] = await Promise.all([
    getAllUsers(),
    getAllRoles(),
    getAllBranches(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage system users and their roles</p>
        </div>
        <AddUserDialog roles={roles} branches={branches} />
      </div>

      <UsersTable users={users} roles={roles} branches={branches} />
    </div>
  );
}
