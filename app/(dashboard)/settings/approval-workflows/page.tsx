"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, Workflow as WorkflowIcon, GitBranch, CheckCircle2, XCircle } from "lucide-react";
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
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";

const DOCUMENT_TYPES = [
  { value: "purchase_request", label: "Permintaan Pembelian (Purchase Request / PR)" },
  { value: "purchase_order", label: "Pesanan Pembelian (Purchase Order / PO)" },
  { value: "sales_order", label: "Pesanan Penjualan (Sales Order / SO)" },
];

export default function ApprovalWorkflowsPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingWorkflow, setEditingWorkflow] = React.useState<Workflow | null>(null);
  const [documentType, setDocumentType] = React.useState(DOCUMENT_TYPES[0].value);
  const [name, setName] = React.useState("");
  const [minAmount, setMinAmount] = React.useState(0);
  const [isActive, setIsActive] = React.useState(true);
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

  const openCreate = () => {
    setEditingWorkflow(null);
    setDocumentType(DOCUMENT_TYPES[0].value);
    setName("");
    setMinAmount(0);
    setIsActive(true);
    setLevels([{ levelOrder: 1, approverRole: "manager" }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (w: Workflow) => {
    setEditingWorkflow(w);
    setDocumentType(w.documentType);
    setName(w.name);
    setMinAmount(w.minAmount);
    setIsActive(w.isActive ?? true);
    setLevels(
      w.levels && w.levels.length > 0
        ? w.levels.map((l, i) => ({ levelOrder: i + 1, approverRole: l.approverRole }))
        : [{ levelOrder: 1, approverRole: "manager" }]
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const addLevel = () => {
    setLevels((prev) => [...prev, { levelOrder: prev.length + 1, approverRole: "manager" }]);
  };

  const removeLevel = (idx: number) => {
    setLevels((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, levelOrder: i + 1 })));
  };

  const updateLevelRole = (idx: number, role: string) => {
    setLevels((prev) => prev.map((l, i) => (i === idx ? { ...l, approverRole: role } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || levels.length === 0) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingWorkflow) {
        await approvalApi.updateWorkflow(editingWorkflow.id, {
          documentType,
          name: name.trim(),
          minAmount,
          isActive,
          levels,
        });
      } else {
        await approvalApi.createWorkflow({
          documentType,
          name: name.trim(),
          minAmount,
          levels,
        });
      }
      setIsModalOpen(false);
      setEditingWorkflow(null);
      setName("");
      setMinAmount(0);
      setIsActive(true);
      setLevels([{ levelOrder: 1, approverRole: "manager" }]);
      loadWorkflows();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan approval workflow.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (w: Workflow) => {
    const ok = await confirm({
      title: "Hapus Workflow",
      message: `Hapus workflow "${w.name}"?`,
      variant: "destructive",
      confirmText: "Hapus",
    });
    if (!ok) return;
    try {
      await approvalApi.deleteWorkflow(w.id);
      loadWorkflows();
    } catch (err) {
      await alert({
        title: "Gagal Menghapus Workflow",
        message: err instanceof Error ? err.message : "Gagal menghapus workflow.",
        variant: "destructive",
      });
    }
  };

  const documentTypeLabel = (dt: string) => DOCUMENT_TYPES.find((d) => d.value === dt)?.label || dt;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Workflow (Persetujuan Berjenjang)"
        description="Atur aturan approval dinamis: dokumen jenis apa, di atas nilai berapa, perlu disetujui role apa saja secara berurutan."
      >
        <Button variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold" onClick={openCreate}>
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
            <Card key={w.id} className="border-border shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{w.name}</h3>
                      {w.isActive === false ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="h-2.5 w-2.5 text-slate-500" /> Nonaktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{documentTypeLabel(w.documentType)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(w)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-brand-primary hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Workflow"
                      aria-label="Edit Workflow"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(w)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus Workflow"
                      aria-label="Hapus Workflow"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWorkflow ? "Edit Approval Workflow" : "Buat Approval Workflow Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="PO di atas Rp 50 Juta"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Berlaku Mulai Nilai (Rp)</label>
              <Input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(Number(e.target.value))}
                min={0}
              />
            </div>

            {editingWorkflow && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-slate-50/50">
                <div>
                  <label htmlFor="is-active-toggle" className="text-xs font-medium text-foreground block cursor-pointer">
                    Status Aktif
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Workflow nonaktif tidak akan digunakan untuk mencocokkan dokumen baru.
                  </p>
                </div>
                <input
                  id="is-active-toggle"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                />
              </div>
            )}

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
                    <button
                      type="button"
                      onClick={() => removeLevel(idx)}
                      className="text-muted-foreground hover:text-rose-600 cursor-pointer shrink-0"
                      aria-label={`Hapus Level ${l.levelOrder}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingWorkflow ? "Simpan Perubahan" : "Buat Workflow"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
