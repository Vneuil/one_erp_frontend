"use client";

import * as React from "react";
import { Plus, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { tenantsApi, TenantItem } from "@/lib/api/tenants";
import { useAppStore } from "@/stores/app-store";

export default function TenantsSettingsPage() {
  const { setToken } = useAppStore();
  const [tenants, setTenants] = React.useState<TenantItem[]>([]);
  const [activeTenantId, setActiveTenantId] = React.useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchTenants = React.useCallback(() => {
    tenantsApi
      .list()
      .then((res) => setTenants(res.data || []))
      .catch((err) => console.warn("Backend tenant API unavailable", err));
  }, []);

  React.useEffect(() => {
    fetchTenants();
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("one_erp_token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setActiveTenantId(payload.tenantId || null);
        } catch {
          // ignore malformed token
        }
      }
    }
  }, [fetchTenants]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await tenantsApi.create({ name, code });
      fetchTenants();
      setIsAddOpen(false);
      setName("");
      setCode("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    setSwitchingId(tenantId);
    try {
      const res = await tenantsApi.switch(tenantId);
      setToken(res.data.accessToken);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal berpindah tenant");
      setSwitchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants / Business Units"
        description="Kelola cabang, anak usaha, atau brand yang berbagi satu perusahaan (Company) yang sama."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Add Tenant
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tenants.map((t) => {
          const isActive = t.id === activeTenantId;
          return (
            <Card key={t.id} className={isActive ? "border-brand-primary shadow-sm" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-brand-primary bg-brand-tint px-2 py-0.5 rounded">
                    {t.code}
                  </span>
                  {t.isDefault && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Default</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-bold text-foreground">{t.name}</span>
                </div>
                {isActive ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tenant Aktif
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={switchingId === t.id}
                    onClick={() => handleSwitchTenant(t.id)}
                    className="h-8 text-xs w-full"
                  >
                    {switchingId === t.id ? "Berpindah..." : "Pindah ke Tenant Ini"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {tenants.length === 0 && (
          <div className="col-span-full p-8 text-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-lg">
            Belum ada tenant.
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tenant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {formError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama Tenant *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cabang Surabaya" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Kode *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SBY" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Add Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
