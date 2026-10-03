"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usersApi, UserItem } from "@/lib/api/users";
import { rbacApi, RoleItem } from "@/lib/api/rbac";

export default function UsersSettingsPage() {
  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [roles, setRoles] = React.useState<RoleItem[]>([]);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserItem["role"]>("staff");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(() => {
    usersApi
      .list({ perPage: 100 })
      .then((res) => setUsers(res.data || []))
      .catch((err) => {
        console.error("Failed to load users", err);
        setLoadError("Gagal memuat daftar pengguna dari server.");
      });
  }, []);

  React.useEffect(() => {
    fetchUsers();
    rbacApi.listRoles().then((res) => setRoles(res.data || [])).catch((err) => console.error("Failed to load roles", err));
  }, [fetchUsers]);

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await usersApi.assignRole(userId, roleId || null);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengubah role.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await usersApi.create({ name, email, password, role });
      fetchUsers();
      setIsInviteOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<UserItem>[] = [
    {
      key: "name",
      header: "User Profile",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-xs text-foreground">{u.name}</p>
            <span className="text-[11px] text-muted-foreground">{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role Level",
      sortable: true,
      render: (u) => (
        <span className="font-bold text-xs uppercase text-brand-primary bg-brand-tint px-2 py-0.5 rounded">
          {u.role}
        </span>
      ),
    },
    {
      key: "roleId",
      header: "Custom Role (RBAC)",
      render: (u) => (
        <select
          value={u.roleId || ""}
          onChange={(e) => handleAssignRole(u.id, e.target.value)}
          className="h-7 rounded-md border border-input bg-white px-2 text-[11px]"
        >
          <option value="">Tidak diatur (default)</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "isActive",
      header: "Account State",
      render: (u) => <StatusBadge status={u.isActive ? "active" : "inactive"} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts & Access"
        description="Manage company employee accounts and assign organizational roles."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsInviteOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Add User
        </Button>
      </PageHeader>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      <DataTable
        columns={columns}
        data={users}
        searchKey="name"
        searchPlaceholder="Search user by name or email..."
      />

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john.doe@company.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Role Level</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserItem["role"])}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
