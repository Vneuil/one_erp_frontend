"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Shield, Trash2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { rbacApi, RoleItem } from "@/lib/api/rbac";

export default function RolesSettingsPage() {
  const [roles, setRoles] = React.useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleDescription, setNewRoleDescription] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const loadRoles = React.useCallback(() => {
    setIsLoading(true);
    rbacApi
      .listRoles()
      .then((res) => setRoles(res.data || []))
      .catch((err) => {
        console.error("Failed to load roles", err);
        setLoadError("Gagal memuat data role dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setFormError(null);
    try {
      await rbacApi.createRole(newRoleName.trim(), newRoleDescription.trim());
      setIsCreateOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      loadRoles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat role.");
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    if (role.isSystem) return;
    if (!confirm(`Hapus role "${role.name}"?`)) return;
    try {
      await rbacApi.deleteRole(role.id);
      loadRoles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus role.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role-Based Access Control (RBAC)"
        description="Kelola role/grup otorisasi. Atur hak akses granular per modul di halaman Permissions."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Buat Role Baru
        </Button>
      </PageHeader>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((r) => (
            <Card key={r.id} className="hover:border-brand-primary/40 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-brand-primary" />
                    <CardTitle className="text-base font-bold">{r.name}</CardTitle>
                  </div>
                  {r.isSystem && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-tint text-brand-primary">Bawaan</span>
                  )}
                </div>
                <CardDescription className="pt-1 text-xs">{r.description || "Tidak ada deskripsi."}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Link href={`/settings/permissions?role=${r.id}`}>
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Atur Izin Akses
                    </Link>
                  </Button>
                  {!r.isSystem && (
                    <button
                      onClick={() => handleDeleteRole(r)}
                      className="p-2 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Hapus role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Role Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama Role</label>
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Procurement Analyst" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Deskripsi</label>
              <Input value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} placeholder="Deskripsikan tanggung jawab role ini" />
            </div>
            {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Buat Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
