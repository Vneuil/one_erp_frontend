"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, Workflow as WorkflowIcon, GitBranch, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
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
import { rbacApi } from "@/lib/api/rbac";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";

const DOCUMENT_TYPES = [
  { value: "purchase_request", short: "PR", label: "Permintaan Pembelian (Purchase Request / PR)", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "purchase_order", short: "PO", label: "Pesanan Pembelian (Purchase Order / PO)", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "sales_order", short: "SO", label: "Pesanan Penjualan (Sales Order / SO)", badgeClass: "bg-amber-50 text-amber-800 border-amber-200" },
];

const DEFAULT_APPROVER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

function rangesOverlap(
  aMin: number,
  aMax: number | null | undefined,
  bMin: number,
  bMax: number | null | undefined
): boolean {
  const aHasMax = aMax !== null && aMax !== undefined;
  const bHasMax = bMax !== null && bMax !== undefined;
  return (!aHasMax || aMax >= bMin) && (!bHasMax || bMax >= aMin);
}

function formatRangeText(minAmount: number, maxAmount?: number | null): string {
  const minText = `Rp ${Number(minAmount).toLocaleString("id-ID")}`;
  if (maxAmount === null || maxAmount === undefined) {
    return `${minText} – Tidak Terbatas`;
  }
  return `${minText} – Rp ${Number(maxAmount).toLocaleString("id-ID")}`;
}

export default function ApprovalWorkflowsPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [approverRoles, setApproverRoles] = React.useState(DEFAULT_APPROVER_ROLES);
  const [activeFilter, setActiveFilter] = React.useState<string>("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingWorkflow, setEditingWorkflow] = React.useState<Workflow | null>(null);
  const [documentType, setDocumentType] = React.useState("");
  const [name, setName] = React.useState("");
  const [minAmount, setMinAmount] = React.useState("0");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [noMaxLimit, setNoMaxLimit] = React.useState(false);
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
    rbacApi
      .listRoles()
      .then((res) => {
        const list = res.data || [];
        if (list.length === 0) return;
        const merged = [...DEFAULT_APPROVER_ROLES];
        const seen = new Set(merged.map((r) => r.value.toLowerCase()));
        for (const r of list) {
          const val = r.name.trim();
          if (val && !seen.has(val.toLowerCase())) {
            seen.add(val.toLowerCase());
            merged.push({ value: val.toLowerCase(), label: val });
          }
        }
        setApproverRoles(merged);
      })
      .catch(() => {
        // Fallback to default roles if RBAC list is unavailable
      });
  }, [loadWorkflows]);

  const openCreate = () => {
    setEditingWorkflow(null);
    setDocumentType(activeFilter === "all" ? "" : activeFilter);
    setName("");
    setMinAmount("0");
    setMaxAmount("");
    setNoMaxLimit(false);
    setIsActive(true);
    setLevels([{ levelOrder: 1, approverRole: "manager" }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (w: Workflow) => {
    setEditingWorkflow(w);
    setDocumentType(w.documentType);
    setName(w.name);
    setMinAmount(String(w.minAmount ?? 0));
    if (w.maxAmount === null || w.maxAmount === undefined) {
      setNoMaxLimit(true);
      setMaxAmount("");
    } else {
      setNoMaxLimit(false);
      setMaxAmount(String(w.maxAmount));
    }
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

  const parsedMinAmount = minAmount.trim() === "" ? NaN : Number(minAmount);
  const parsedMaxAmount: number | null = noMaxLimit
    ? null
    : maxAmount.trim() === ""
      ? NaN
      : Number(maxAmount);

  const rangeValidationError = React.useMemo(() => {
    if (!Number.isFinite(parsedMinAmount) || parsedMinAmount < 0) {
      return "Batas bawah nominal harus berupa angka minimal 0.";
    }
    if (!noMaxLimit) {
      if (parsedMaxAmount === null || !Number.isFinite(parsedMaxAmount) || parsedMaxAmount < 0) {
        return "Masukkan batas atas nominal atau centang 'Tanpa batas atas'.";
      }
      if (parsedMaxAmount < parsedMinAmount) {
        return "Batas atas nominal harus lebih besar atau sama dengan batas bawah.";
      }
    }
    const willBeActive = editingWorkflow ? isActive : true;
    if (documentType && willBeActive) {
      const conflict = workflows.find(
        (other) =>
          other.id !== editingWorkflow?.id &&
          other.isActive !== false &&
          other.documentType === documentType &&
          rangesOverlap(parsedMinAmount, parsedMaxAmount, other.minAmount, other.maxAmount)
      );
      if (conflict) {
        return `Rentang nominal bersinggungan dengan workflow "${conflict.name}" (${formatRangeText(
          conflict.minAmount,
          conflict.maxAmount
        )}). Ubah batas bawah/atas agar tidak tumpang tindih.`;
      }
    }
    return null;
  }, [parsedMinAmount, parsedMaxAmount, noMaxLimit, documentType, editingWorkflow, isActive, workflows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentType) {
      setFormError("Silakan pilih Jenis Dokumen (PR, PO, atau SO) terlebih dahulu.");
      return;
    }
    if (!name.trim() || levels.length === 0) return;
    if (rangeValidationError) {
      setFormError(rangeValidationError);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingWorkflow) {
        await approvalApi.updateWorkflow(editingWorkflow.id, {
          documentType,
          name: name.trim(),
          minAmount: parsedMinAmount,
          maxAmount: parsedMaxAmount,
          isActive,
          levels,
        });
      } else {
        await approvalApi.createWorkflow({
          documentType,
          name: name.trim(),
          minAmount: parsedMinAmount,
          maxAmount: parsedMaxAmount,
          levels,
        });
      }
      setIsModalOpen(false);
      setEditingWorkflow(null);
      setName("");
      setMinAmount("0");
      setMaxAmount("");
      setNoMaxLimit(false);
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

  const documentTypeMeta = (dt: string) => DOCUMENT_TYPES.find((d) => d.value === dt);
  const documentTypeLabel = (dt: string) => documentTypeMeta(dt)?.label || dt;

  const filteredWorkflows = React.useMemo(() => {
    if (activeFilter === "all") return workflows;
    return workflows.filter((w) => w.documentType === activeFilter);
  }, [workflows, activeFilter]);

  const overlappingIds = React.useMemo(() => {
    const active = workflows.filter((w) => w.isActive !== false);
    const overlaps = new Set<string>();
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        if (a.documentType === b.documentType && rangesOverlap(a.minAmount, a.maxAmount, b.minAmount, b.maxAmount)) {
          overlaps.add(a.id);
          overlaps.add(b.id);
        }
      }
    }
    return overlaps;
  }, [workflows]);

  const sameTypeActiveWorkflows = React.useMemo(() => {
    if (!documentType) return [];
    return workflows.filter(
      (w) => w.documentType === documentType && w.isActive !== false && w.id !== editingWorkflow?.id
    );
  }, [workflows, documentType, editingWorkflow?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Workflow (Persetujuan Berjenjang)"
        description="Atur aturan approval dinamis berdasarkan jenis dokumen, rentang batas bawah – batas atas nominal, serta urutan role penyetuju."
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

      {/* Filter tabs per document type */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeFilter === "all"
              ? "bg-brand-primary text-white"
              : "bg-slate-100 text-muted-foreground hover:text-foreground"
          }`}
        >
          Semua ({workflows.length})
        </button>
        {DOCUMENT_TYPES.map((dt) => {
          const count = workflows.filter((w) => w.documentType === dt.value).length;
          return (
            <button
              key={dt.value}
              type="button"
              onClick={() => setActiveFilter(dt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeFilter === dt.value
                  ? "bg-brand-primary text-white"
                  : "bg-slate-100 text-muted-foreground hover:text-foreground"
              }`}
            >
              {dt.short} ({count})
            </button>
          );
        })}
      </div>

      {overlappingIds.size > 0 && (
        <div className="px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Ditemukan workflow aktif dengan rentang batas bawah/atas yang bersinggungan pada jenis dokumen yang sama. Silakan edit rentang atau jenis dokumennya agar tidak tumpang tindih.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
          <WorkflowIcon className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p>Belum ada workflow untuk kategori ini. Tanpa workflow, dokumen tidak melewati approval berjenjang.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredWorkflows.map((w) => {
            const dtMeta = documentTypeMeta(w.documentType);
            const hasOverlap = overlappingIds.has(w.id);
            return (
              <Card key={w.id} className={`border-border shadow-2xs hover:shadow-xs transition-shadow ${hasOverlap ? "border-amber-300" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {dtMeta && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${dtMeta.badgeClass}`}>
                            {dtMeta.short}
                          </span>
                        )}
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
                <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-border gap-2">
                  <span className="text-muted-foreground shrink-0">Rentang Nominal</span>
                  <span className="font-bold text-foreground flex items-center gap-1 flex-wrap justify-end">
                    <MoneyDisplay amount={w.minAmount} className="font-bold" />
                    <span>–</span>
                    {w.maxAmount !== null && w.maxAmount !== undefined ? (
                      <MoneyDisplay amount={w.maxAmount} className="font-bold" />
                    ) : (
                      <span className="text-brand-primary font-bold">Tidak Terbatas</span>
                    )}
                  </span>
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
            );
          })}
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
                required
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
              >
                <option value="">-- Pilih Jenis Dokumen --</option>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Batas Bawah (Rp)</label>
                <Input
                  type="number"
                  value={minAmount}
                  onChange={(e) => {
                    setMinAmount(e.target.value);
                    setFormError(null);
                  }}
                  min={0}
                  step="any"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Batas Atas (Rp)</label>
                <Input
                  type="number"
                  value={noMaxLimit ? "" : maxAmount}
                  onChange={(e) => {
                    setMaxAmount(e.target.value);
                    setFormError(null);
                  }}
                  min={0}
                  step="any"
                  disabled={noMaxLimit}
                  placeholder={noMaxLimit ? "Tidak Terbatas" : "Contoh: 500000"}
                  required={!noMaxLimit}
                />
              </div>
            </div>
            <label htmlFor="no-max-limit-toggle" className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                id="no-max-limit-toggle"
                type="checkbox"
                checked={noMaxLimit}
                onChange={(e) => {
                  setNoMaxLimit(e.target.checked);
                  setFormError(null);
                }}
                className="h-3.5 w-3.5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
              />
              <span>Tanpa batas atas (berlaku dari batas bawah ke atas / tak terbatas)</span>
            </label>

            {sameTypeActiveWorkflows.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-border text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Rentang aktif lain pada jenis dokumen ini:</p>
                <div className="flex flex-wrap gap-1.5">
                  {sameTypeActiveWorkflows.map((other) => (
                    <span key={other.id} className="px-2 py-0.5 rounded bg-white border border-border text-[10px] font-medium text-foreground">
                      {other.name}: {formatRangeText(other.minAmount, other.maxAmount)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const showLiveRangeError =
                rangeValidationError &&
                (noMaxLimit || maxAmount.trim() !== "" || !Number.isFinite(parsedMinAmount) || parsedMinAmount < 0);
              return showLiveRangeError ? (
                <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{rangeValidationError}</span>
                </div>
              ) : null;
            })()}

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
                    value={l.approverRole.toLowerCase()}
                    onChange={(e) => updateLevelRole(idx, e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                  >
                    {approverRoles.map((roleOpt) => (
                      <option key={roleOpt.value} value={roleOpt.value}>
                        {roleOpt.label}
                      </option>
                    ))}
                    {!approverRoles.some((r) => r.value.toLowerCase() === l.approverRole.toLowerCase()) && (
                      <option value={l.approverRole.toLowerCase()}>{l.approverRole}</option>
                    )}
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

            {formError &&
              (!rangeValidationError ||
                formError !== rangeValidationError ||
                !(noMaxLimit || maxAmount.trim() !== "" || !Number.isFinite(parsedMinAmount) || parsedMinAmount < 0)) && (
                <p className="text-xs text-rose-600 font-semibold">{formError}</p>
              )}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="gradient"
                size="sm"
                disabled={
                  isSubmitting ||
                  Boolean(rangeValidationError && (noMaxLimit || maxAmount.trim() !== ""))
                }
              >
                {isSubmitting ? "Menyimpan..." : editingWorkflow ? "Simpan Perubahan" : "Buat Workflow"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
