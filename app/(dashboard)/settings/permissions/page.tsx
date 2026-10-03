"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Save, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { rbacApi, RoleItem, PermissionItem } from "@/lib/api/rbac";

export default function PermissionsMatrixPage() {
  return (
    <React.Suspense fallback={<div className="py-10 text-center text-xs text-muted-foreground">Memuat...</div>}>
      <PermissionsMatrixContent />
    </React.Suspense>
  );
}

function PermissionsMatrixContent() {
  const searchParams = useSearchParams();
  const preselectedRoleId = searchParams.get("role");

  const [roles, setRoles] = React.useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [modules, setModules] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<Record<string, PermissionItem>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    Promise.all([rbacApi.listRoles(), rbacApi.listModules()])
      .then(([rolesRes, modulesRes]) => {
        const rolesList = rolesRes.data || [];
        setRoles(rolesList);
        setModules(modulesRes.data || []);
        const initial = preselectedRoleId && rolesList.some((r) => r.id === preselectedRoleId)
          ? preselectedRoleId
          : rolesList[0]?.id || "";
        setSelectedRoleId(initial);
      })
      .catch((err) => {
        console.error("Failed to load roles/modules", err);
        setLoadError("Gagal memuat data role & modul dari server.");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPermissions = React.useCallback((roleId: string) => {
    if (!roleId) return;
    rbacApi
      .getRolePermissions(roleId)
      .then((res) => {
        const map: Record<string, PermissionItem> = {};
        (res.data?.permissions || []).forEach((p) => {
          map[p.module] = p;
        });
        setPermissions(map);
      })
      .catch((err) => {
        console.error("Failed to load role permissions", err);
        setLoadError("Gagal memuat izin akses role ini.");
      });
  }, []);

  React.useEffect(() => {
    if (selectedRoleId) loadPermissions(selectedRoleId);
  }, [selectedRoleId, loadPermissions]);

  const togglePermission = (mod: string, field: "canView" | "canManage" | "canApprove") => {
    setPermissions((prev) => {
      const current = prev[mod] || { module: mod, canView: false, canManage: false, canApprove: false };
      const next = { ...current, [field]: !current[field] };
      // Grants build on each other: approve => manage => view. Removing a lower
      // grant removes the ones that depend on it.
      if (next.canApprove) next.canManage = true;
      if (next.canManage) next.canView = true;
      if (field === "canView" && !next.canView) {
        next.canManage = false;
        next.canApprove = false;
      }
      if (field === "canManage" && !next.canManage) next.canApprove = false;
      return { ...prev, [mod]: next };
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload = modules.map((m) => permissions[m] || { module: m, canView: false, canManage: false, canApprove: false });
      await rbacApi.setRolePermissions(selectedRoleId, payload);
      setSaveMessage("Izin akses tersimpan.");
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal menyimpan izin akses.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions Matrix"
        description="Atur akses lihat, kelola, dan setujui (approve/tolak/bayar/posting) per modul untuk setiap role."
      />

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-primary" /> Module Access Rights Matrix
                </CardTitle>
                <CardDescription>Pilih role, lalu centang izin per modul.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <Button onClick={handleSave} disabled={isSaving || !selectedRoleId} size="sm" variant="gradient" className="h-9 gap-1.5 text-xs font-bold">
                  <Save className="h-3.5 w-3.5" /> {isSaving ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {saveMessage && (
              <div className="px-4 py-2 text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-200">{saveMessage}</div>
            )}
            {selectedRole?.isSystem && (
              <div className="px-4 py-2 text-[11px] text-muted-foreground bg-slate-50 border-b border-border">
                Role bawaan ({selectedRole.name}) - izin tetap bisa diubah, tapi role ini tidak bisa dihapus.
              </div>
            )}
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-bold text-foreground">Modul</th>
                    <th className="text-center px-4 py-2.5 font-bold text-foreground w-28">
                      <span className="flex items-center justify-center gap-1"><Eye className="h-3.5 w-3.5" /> Lihat</span>
                    </th>
                    <th className="text-center px-4 py-2.5 font-bold text-foreground w-28">
                      <span className="flex items-center justify-center gap-1"><Pencil className="h-3.5 w-3.5" /> Kelola</span>
                    </th>
                    <th className="text-center px-4 py-2.5 font-bold text-foreground w-28">
                      <span className="flex items-center justify-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Setujui</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m) => {
                    const perm = permissions[m] || { module: m, canView: false, canManage: false, canApprove: false };
                    return (
                      <tr key={m} className="border-b border-border/60 hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-medium text-foreground capitalize">{m.replace(/-/g, " ")}</td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.canView}
                            onChange={() => togglePermission(m, "canView")}
                            className="h-3.5 w-3.5 accent-[var(--brand-primary,#7c3aed)] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.canManage}
                            onChange={() => togglePermission(m, "canManage")}
                            className="h-3.5 w-3.5 accent-[var(--brand-primary,#7c3aed)] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(perm.canApprove)}
                            onChange={() => togglePermission(m, "canApprove")}
                            className="h-3.5 w-3.5 accent-[var(--brand-primary,#7c3aed)] cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
