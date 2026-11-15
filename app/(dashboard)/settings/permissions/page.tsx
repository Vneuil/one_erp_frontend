"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Save,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Send,
  DollarSign,
  Tag,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { rbacApi, RoleItem, PermissionItem } from "@/lib/api/rbac";

const CATEGORIES: Record<string, { label: string; modules: string[] }> = {
  sales: {
    label: "Penjualan",
    modules: ["sales", "pos", "loyalty", "crm", "omnichannel", "marketplace"],
  },
  procurement: {
    label: "Pembelian",
    modules: ["procurement"],
  },
  masterData: {
    label: "Master Data",
    modules: [
      "product",
      "product-categories",
      "units-of-measure",
      "customers",
      "suppliers",
      "salesmen",
      "shipping-methods",
      "payment-terms",
      "customer-types",
      "tax-rates",
      "warehouse",
    ],
  },
  operations: {
    label: "Operasional & Pabrik",
    modules: ["inventory", "manufacturing", "qc"],
  },
  finance: {
    label: "Keuangan & Akuntansi",
    modules: ["finance", "banking", "assets", "commission", "contracts"],
  },
  hrProject: {
    label: "SDM & Proyek",
    modules: ["hrm", "recruitment", "lms", "project", "goals"],
  },
  system: {
    label: "Sistem & Administrasi",
    modules: [
      "users",
      "rbac",
      "activity-logs",
      "tenant",
      "company",
      "support",
      "device",
      "collaboration",
      "docflow",
      "integration",
      "report",
    ],
  },
};

type PermissionField =
  | "canView"
  | "canCreate"
  | "canEdit"
  | "canDelete"
  | "canSubmit"
  | "canApprove"
  | "canViewPrices"
  | "canEditPrices";

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
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
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
        const initial =
          preselectedRoleId && rolesList.some((r) => r.id === preselectedRoleId)
            ? preselectedRoleId
            : rolesList[0]?.id || "";
        setSelectedRoleId(initial);
      })
      .catch((err) => {
        console.error("Failed to load roles/modules", err);
        setLoadError("Gagal memuat data role & modul dari server.");
      })
      .finally(() => setIsLoading(false));
  }, [preselectedRoleId]);

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

  const togglePermission = (mod: string, field: PermissionField) => {
    setPermissions((prev) => {
      const current = prev[mod] || {
        module: mod,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canSubmit: false,
        canApprove: false,
        canViewPrices: false,
        canEditPrices: false,
      };

      const nextVal = !current[field];
      const next: PermissionItem = { ...current, [field]: nextVal };

      // Cascading logic:
      if (nextVal) {
        // Turning ON
        if (field === "canApprove") {
          next.canEdit = true;
          next.canCreate = true;
          next.canView = true;
        } else if (field === "canDelete") {
          next.canView = true;
        } else if (field === "canSubmit") {
          next.canCreate = true;
          next.canView = true;
        } else if (field === "canEdit") {
          next.canCreate = true;
          next.canView = true;
        } else if (field === "canCreate") {
          next.canView = true;
        } else if (field === "canEditPrices") {
          next.canViewPrices = true;
        }
      } else {
        // Turning OFF
        if (field === "canView") {
          next.canCreate = false;
          next.canEdit = false;
          next.canDelete = false;
          next.canSubmit = false;
          next.canApprove = false;
        } else if (field === "canCreate") {
          next.canEdit = false;
          next.canSubmit = false;
          next.canApprove = false;
        } else if (field === "canEdit") {
          next.canApprove = false;
        } else if (field === "canViewPrices") {
          next.canEditPrices = false;
        }
      }

      next.canManage = Boolean(next.canCreate && next.canEdit);
      return { ...prev, [mod]: next };
    });
  };

  const setRowAll = (mod: string, enable: boolean) => {
    setPermissions((prev) => {
      const next: PermissionItem = {
        module: mod,
        canView: enable,
        canCreate: enable,
        canEdit: enable,
        canDelete: enable,
        canSubmit: enable,
        canApprove: enable,
        canViewPrices: enable,
        canEditPrices: enable,
        canManage: enable,
      };
      return { ...prev, [mod]: next };
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload: PermissionItem[] = modules.map((m) => {
        const p = permissions[m] || { module: m, canView: false };
        const canManage = Boolean((p.canCreate && p.canEdit) || p.canManage);
        return {
          module: m,
          canView: Boolean(p.canView),
          canCreate: Boolean(p.canCreate),
          canEdit: Boolean(p.canEdit),
          canDelete: Boolean(p.canDelete),
          canSubmit: Boolean(p.canSubmit),
          canManage,
          canApprove: Boolean(p.canApprove),
          canViewPrices: Boolean(p.canViewPrices),
          canEditPrices: Boolean(p.canEditPrices),
        };
      });

      await rbacApi.setRolePermissions(selectedRoleId, payload);
      setSaveMessage("Izin akses granular berhasil disimpan.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal menyimpan izin akses.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  const filteredModules = React.useMemo(() => {
    return modules.filter((m) => {
      if (selectedCategory !== "all") {
        const cat = CATEGORIES[selectedCategory];
        if (cat && !cat.modules.includes(m)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return m.toLowerCase().includes(q) || m.replace(/-/g, " ").includes(q);
      }
      return true;
    });
  }, [modules, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions Matrix (RBAC Granular)"
        description="Atur hak akses granular per modul: Lihat, Buat, Edit, Hapus, Submit, Setujui (Approve), dan Hak Akses Harga."
      />

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-primary" /> Matrix Otorisasi Modul
                </CardTitle>
                <CardDescription className="text-xs">
                  Pilih role target, kemudian sesuaikan permission per modul sesuai tanggung jawab pengguna.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-input rounded-md px-2 py-1 shadow-sm">
                  <span className="text-[11px] font-semibold text-muted-foreground">Role:</span>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="bg-transparent text-xs font-semibold focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isSystem ? "(Bawaan)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !selectedRoleId}
                  size="sm"
                  variant="gradient"
                  className="h-8 gap-1.5 text-xs font-bold"
                >
                  <Save className="h-3.5 w-3.5" /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </div>

            {/* Filters: Category & Search */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-200/60 mt-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    selectedCategory === "all"
                      ? "bg-brand-primary text-white"
                      : "bg-white border text-muted-foreground hover:bg-slate-100"
                  }`}
                >
                  Semua ({modules.length})
                </button>
                {Object.entries(CATEGORIES).map(([key, cat]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(key)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === key
                        ? "bg-brand-primary text-white"
                        : "bg-white border text-muted-foreground hover:bg-slate-100"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari modul..."
                  className="h-8 text-xs pl-8"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {saveMessage && (
              <div className="px-4 py-2 text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-200 font-medium">
                {saveMessage}
              </div>
            )}
            {selectedRole?.isSystem && (
              <div className="px-4 py-2 text-[11px] text-amber-700 bg-amber-50/60 border-b border-amber-200/60">
                💡 Role bawaan sistem ({selectedRole.name}) — izin dapat disesuaikan untuk kebutuhan operasional perusahaan.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/80 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-bold text-foreground min-w-[160px]">Modul</th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-16" title="Lihat list & detail (GET)">
                      <span className="flex items-center justify-center gap-1"><Eye className="h-3 w-3 text-sky-600" /> Lihat</span>
                    </th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-16" title="Buat data baru (POST)">
                      <span className="flex items-center justify-center gap-1"><Plus className="h-3 w-3 text-emerald-600" /> Buat</span>
                    </th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-16" title="Edit data (PUT/PATCH)">
                      <span className="flex items-center justify-center gap-1"><Pencil className="h-3 w-3 text-amber-600" /> Edit</span>
                    </th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-16" title="Hapus data (DELETE)">
                      <span className="flex items-center justify-center gap-1"><Trash2 className="h-3 w-3 text-rose-600" /> Hapus</span>
                    </th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-16" title="Ajukan ke persetujuan">
                      <span className="flex items-center justify-center gap-1"><Send className="h-3 w-3 text-indigo-600" /> Submit</span>
                    </th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-16" title="Approve / Tolak / Finalisasi dokumen">
                      <span className="flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3 text-purple-600" /> Setujui</span>
                    </th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-20" title="Akses harga, HPP, & nilai transaksi">
                      <span className="flex items-center justify-center gap-1"><DollarSign className="h-3 w-3 text-teal-600" /> Cek Harga</span>
                    </th>
                    <th className="text-center px-2 py-2.5 font-bold text-foreground w-20" title="Ubah harga jual atau master harga">
                      <span className="flex items-center justify-center gap-1"><Tag className="h-3 w-3 text-orange-600" /> Ubah Harga</span>
                    </th>
                    <th className="text-center px-3 py-2.5 font-bold text-foreground w-20">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredModules.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada modul yang cocok dengan pencarian atau filter.
                      </td>
                    </tr>
                  ) : (
                    filteredModules.map((m) => {
                      const perm = permissions[m] || {
                        module: m,
                        canView: false,
                        canCreate: false,
                        canEdit: false,
                        canDelete: false,
                        canSubmit: false,
                        canApprove: false,
                        canViewPrices: false,
                        canEditPrices: false,
                      };

                      const allActive =
                        Boolean(perm.canView) &&
                        Boolean(perm.canCreate) &&
                        Boolean(perm.canEdit) &&
                        Boolean(perm.canDelete) &&
                        Boolean(perm.canSubmit) &&
                        Boolean(perm.canApprove) &&
                        Boolean(perm.canViewPrices) &&
                        Boolean(perm.canEditPrices);

                      return (
                        <tr key={m} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-foreground capitalize">
                            <span className="font-semibold">{m.replace(/-/g, " ")}</span>
                            <span className="block text-[10px] text-muted-foreground font-mono">{m}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canView)}
                              onChange={() => togglePermission(m, "canView")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-[var(--brand-primary,#7c3aed)] cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canCreate || perm.canManage)}
                              onChange={() => togglePermission(m, "canCreate")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-[var(--brand-primary,#7c3aed)] cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canEdit || perm.canManage)}
                              onChange={() => togglePermission(m, "canEdit")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-[var(--brand-primary,#7c3aed)] cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canDelete)}
                              onChange={() => togglePermission(m, "canDelete")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-rose-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canSubmit)}
                              onChange={() => togglePermission(m, "canSubmit")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canApprove)}
                              onChange={() => togglePermission(m, "canApprove")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-purple-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canViewPrices)}
                              onChange={() => togglePermission(m, "canViewPrices")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-teal-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm.canEditPrices)}
                              onChange={() => togglePermission(m, "canEditPrices")}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-orange-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setRowAll(m, !allActive)}
                              className="text-[11px] font-semibold text-muted-foreground hover:text-brand-primary p-1 rounded hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                              title={allActive ? "Hapus semua hak akses" : "Berikan semua hak akses"}
                            >
                              {allActive ? (
                                <>
                                  <Square className="h-3 w-3" /> Bersihkan
                                </>
                              ) : (
                                <>
                                  <CheckSquare className="h-3 w-3" /> Semua
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
