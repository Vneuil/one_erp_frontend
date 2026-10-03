"use client";

import * as React from "react";
import { Plus, Trash2, Workflow as WorkflowIcon, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { approvalApi, Workflow, WorkflowLevel } from "@/lib/api/approval";

const DOCUMENT_TYPES = [
  { value: "purchase_order", label: "Pesanan Pembelian (Purchase Order)" },
  { value: "sales_order", label: "Pesanan Penjualan (Sales Order)" },
];

export default function ApprovalWorkflowsPage() {
  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [documentType, setDocumentType] = React.useState(DOCUMENT_TYPES[0].value);
  const [name, setName] = React.useState("");
  const [minAmount, setMinAmount] = React.useState(0);
  const [levels, setLevels] = React.useState<WorkflowLevel[]>([{ levelOrder: 1, approverRole: "manager" }]);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadWorkflows = React.useCallback(() => {
    setIsLoading(true);
    approvalApi
      .listWorkflows()
      .then((res) => setWorkflows(res.data || []))
      .catch((err) => {
        console.error("Failed to load approval workflows", err);
        setLoadError("Gagal memuat data approval workflow dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const addLevel = () => {
    setLevels((prev) => [...prev, { levelOrder: prev.length + 1, approverRole: "manager" }]);
  };

  const removeLevel = (idx: number) => {
    setLevels((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, levelOrder: i + 1 })));
  };

  const updateLevelRole = (idx: number, role: string) => {
    setLevels((prev) => prev.map((l, i) => (i === idx ? { ...l, approverRole: role } : l)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || levels.length === 0) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await approvalApi.createWorkflow({ documentType, name: name.trim(), minAmount, levels });
      setIsCreateOpen(false);
      setName("");
      setMinAmount(0);
      setLevels([{ levelOrder: 1, approverRole: "manager" }]);
      loadWorkflows();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat approval workflow.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (w: Workflow) => {
    if (!confirm(`Hapus workflow "${w.name}"?`)) return;
    try {
      await approvalApi.deleteWorkflow(w.id);
      loadWorkflows();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus workflow.");
    }
  };

  const documentTypeLabel = (dt: string) => DOCUMENT_TYPES.find((d) => d.value === dt)?.label || dt;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Workflow (Persetujuan Berjenjang)"
        description="Atur aturan approval dinamis: dokumen jenis apa, di atas nilai berapa, perlu disetujui role apa saja secara berurutan."
      >
        <Button variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Buat Workflow Baru
        </Button>
      </PageHeader>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : workflows.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
          <WorkflowIcon className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p>Belum ada workflow. Tanpa workflow, dokumen langsung bisa di-approve satu langkah seperti biasa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {workflows.map((w) => (
            <Card key={w.id} className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{w.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{documentTypeLabel(w.documentType)}</p>
                  </div>
                  <button onClick={() => handleDelete(w)} className="text-muted-foreground hover:text-rose-600 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-border">
                  <span className="text-muted-foreground">Berlaku mulai nilai</span>
                  <MoneyDisplay amount={w.minAmount} className="font-bold" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <GitBranch className="h-3 w-3" /> Urutan Approval
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {w.levels.map((l, idx) => (
                      <React.Fragment key={l.levelOrder}>
                        <span className="px-2 py-1 rounded-md bg-brand-tint text-brand-primary text-[11px] font-bold capitalize">
                          {l.levelOrder}. {l.approverRole}
                        </span>
                        {idx < w.levels.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Approval Workflow Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Jenis Dokumen</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
              >
                {DOCUMENT_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama Workflow</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="PO di atas Rp 50 Juta" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Berlaku Mulai Nilai (Rp)</label>
              <Input type="number" value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} min={0} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Urutan Level Approval</label>
                <Button type="button" size="sm" variant="outline" onClick={addLevel} className="h-7 gap-1 text-[11px]">
                  <Plus className="h-3 w-3" /> Tambah Level
                </Button>
              </div>
              {levels.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-14 shrink-0">Level {l.levelOrder}</span>
                  <select
                    value={l.approverRole}
                    onChange={(e) => updateLevelRole(idx, e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                  {levels.length > 1 && (
                    <button type="button" onClick={() => removeLevel(idx)} className="text-muted-foreground hover:text-rose-600 cursor-pointer shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Buat Workflow"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
