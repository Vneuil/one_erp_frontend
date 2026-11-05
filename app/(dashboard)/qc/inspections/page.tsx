"use client";

import * as React from "react";
import {
  Plus,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Ban,
  Filter,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import { qcApi, QCInspectionItem, QCParameterItem, CreateQCInspectionInput } from "@/lib/api/qc";
import { manufacturingApi, ProductionOrderItem } from "@/lib/api/manufacturing";

const selectCls = "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function QCInspectionsPage() {
  const [reload, setReload] = React.useState(0);

  // Load inspections and stats
  const { data: rawInspections, loading: isLoading, error } = useReport(
    `qc-inspections|${reload}`,
    () => qcApi.listInspections({ perPage: 100 }).then((res) => res.data || [])
  );
  const inspections: QCInspectionItem[] = rawInspections ?? [];
  const { data: stats } = useReport(`qc-stats|${reload}`, () => qcApi.getStats().then((res) => res.data));
  const { data: rawParameters } = useReport("qc-params-cache", () => qcApi.listParameters().then((res) => res.data || []));
  const parameters = rawParameters ?? [];
  const { data: rawActiveOrders } = useReport("active-mfg-orders", () =>
    manufacturingApi.listProductionOrders({ perPage: 50 }).then((res) => (res.data || []).filter((o) => o.status === "released" || o.status === "in_progress"))
  );
  const activeOrders = rawActiveOrders ?? [];

  const [notice, setNotice] = React.useState<string | null>(null);

  // New Inspection Modal state
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [targetType, setTargetType] = React.useState<"production_order" | "goods_receipt">("production_order");
  const [selectedOrderId, setSelectedOrderId] = React.useState("");
  const [batchNo, setBatchNo] = React.useState("");
  const [testingTool, setTestingTool] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Items values: map parameterId -> { numericValue: number | undefined, booleanValue: boolean | undefined }
  const [itemValues, setItemValues] = React.useState<
    Record<string, { numericValue?: number; booleanValue?: boolean }>
  >({});
  const [selectedParamIds, setSelectedParamIds] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Detail Modal state
  const [viewItem, setViewItem] = React.useState<QCInspectionItem | null>(null);

  // Void Modal state
  const [voidTarget, setVoidTarget] = React.useState<QCInspectionItem | null>(null);
  const [voidReason, setVoidReason] = React.useState("");
  const [isVoiding, setIsVoiding] = React.useState(false);

  // Initialize selected parameters when dialog opens
  const openNewInspection = () => {
    setTargetType("production_order");
    setSelectedOrderId(activeOrders[0]?.id || "");
    setBatchNo(activeOrders[0] ? `${activeOrders[0].orderNumber || "BATCH"}-01` : "");
    setTestingTool("");
    setNotes("");
    setFormError(null);

    // Default select all mandatory gate parameters
    const initialIds = parameters.map((p) => p.id);
    setSelectedParamIds(initialIds);

    const initVals: Record<string, { numericValue?: number; booleanValue?: boolean }> = {};
    parameters.forEach((p) => {
      if (p.paramType === "numeric") {
        initVals[p.id] = { numericValue: p.maxValue ? p.maxValue - 0.2 : p.targetValue || 0 };
      } else {
        initVals[p.id] = { booleanValue: true };
      }
    });
    setItemValues(initVals);
    setIsNewOpen(true);
  };

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    const order = activeOrders.find((o) => o.id === orderId);
    if (order) {
      setBatchNo(`${order.orderNumber || "BATCH"}-01`);
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParamIds.length === 0) {
      setFormError("Pilih minimal satu parameter untuk diuji");
      return;
    }
    if (!batchNo.trim()) {
      setFormError("Nomor batch wajib diisi");
      return;
    }

    const currentOrder = activeOrders.find((o) => o.id === selectedOrderId);
    const productId = currentOrder?.productId || parameters[0]?.productId || "00000000-0000-0000-0000-000000000000";

    const itemsPayload = selectedParamIds.map((pId) => {
      const p = parameters.find((param) => param.id === pId);
      const val = itemValues[pId] || {};
      return {
        parameterId: pId,
        numericValue: p?.paramType === "numeric" ? val.numericValue : undefined,
        booleanValue: p?.paramType === "boolean" ? val.booleanValue : undefined,
      };
    });

    const payload: CreateQCInspectionInput = {
      targetType,
      targetId: selectedOrderId || "00000000-0000-0000-0000-000000000000",
      productionOrderId: targetType === "production_order" ? selectedOrderId : undefined,
      batchNo: batchNo.trim(),
      productId,
      testingTool: testingTool.trim(),
      notes: notes.trim(),
      items: itemsPayload,
    };

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await qcApi.createInspection(payload);
      const created = res.data;

      // Auto-evaluate conditional routing in Manufacturing if moisture was tested
      const moistureParam = parameters.find((p) => p.processCode === "CEK_AIR");
      if (moistureParam && selectedParamIds.includes(moistureParam.id) && selectedOrderId) {
        const moistureVal = itemValues[moistureParam.id]?.numericValue;
        if (moistureVal !== undefined) {
          try {
            await manufacturingApi.evaluateConditions(selectedOrderId, "moisture_content", moistureVal);
          } catch {
            /* ignore background evaluation failure */
          }
        }
      }

      setIsNewOpen(false);
      setNotice(`Inspeksi mutu ${created?.inspectionNo || ""} berhasil dicatat dengan status: ${created?.overallStatus.toUpperCase()}`);
      setReload((n) => n + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal mencatat inspeksi mutu."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || !voidReason.trim()) return;

    setIsVoiding(true);
    try {
      await qcApi.voidInspection(voidTarget.id, { reason: voidReason.trim() });
      setNotice(`Inspeksi ${voidTarget.inspectionNo} berhasil dibatalkan (void).`);
      setVoidTarget(null);
      setVoidReason("");
      setReload((n) => n + 1);
    } catch (err) {
      setNotice(`Gagal membatalkan: ${errText(err, "Terjadi kesalahan")}`);
    } finally {
      setIsVoiding(false);
    }
  };

  const columns: Column<QCInspectionItem>[] = [
    {
      key: "inspectionNo",
      header: "No. Inspeksi",
      render: (item: QCInspectionItem) => (
        <div>
          <div className="font-mono text-xs font-semibold text-foreground">{item.inspectionNo}</div>
          <div className="text-[11px] text-muted-foreground">
            {new Date(item.inspectedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>
      ),
    },
    {
      key: "batchNo",
      header: "Target / Batch",
      render: (item: QCInspectionItem) => (
        <div>
          <span className="font-mono text-xs font-semibold text-foreground px-1.5 py-0.5 rounded bg-muted">
            {item.batchNo}
          </span>
          <div className="text-[11px] text-muted-foreground mt-0.5 capitalize">
            {item.targetType === "production_order" ? "Order Produksi" : "Penerimaan Bahan"}
          </div>
        </div>
      ),
    },
    {
      key: "results",
      header: "Hasil Uji Mutu",
      render: (item: QCInspectionItem) => {
        const items = item.items || [];
        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {items.map((itm) => (
              <span
                key={itm.id}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border ${
                  itm.isPassed
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {itm.isPassed ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                {itm.parameterName}: {itm.paramType === "numeric" ? `${itm.numericValue}` : itm.booleanValue ? "LULUS" : "GAGAL"}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "overallStatus",
      header: "Status Kelulusan",
      render: (item: QCInspectionItem) => {
        const status = item.overallStatus;
        if (item.isVoided) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full line-through">
              <Ban className="w-3 h-3 text-muted-foreground" />
              DIBATALKAN (VOID)
            </span>
          );
        }
        if (status === "passed") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              LULUS
            </span>
          );
        }
        if (status === "failed") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3 text-rose-600" />
              GAGAL / REJECT
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" />
            HOLD
          </span>
        );
      },
    },
    {
      key: "inspectorName",
      header: "Pemeriksa",
      render: (item: QCInspectionItem) => (
        <div className="text-xs">
          <div className="text-foreground">{item.inspectorName || "Petugas QC"}</div>
          {item.testingTool && (
            <div className="text-[11px] text-muted-foreground">{item.testingTool}</div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      render: (item: QCInspectionItem) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewItem(item)} title="Lihat Rincian">
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {!item.isVoided && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => {
                setVoidTarget(item);
                setVoidReason("");
              }}
              title="Batalkan (Void) dengan Alasan"
            >
              <Ban className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspeksi Kontrol Mutu (QC)"
        description="Pencatatan hasil uji kadar air, kadar Brix, dan metal detector dengan gate kelulusan otomatis."
      >
        <Button onClick={openNewInspection} className="gap-2 text-xs">
          <Plus className="w-4 h-4" />
          Catat Hasil Uji QC
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Total Uji Dilakukan</div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats?.totalInspections || 0}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Tingkat Kelulusan</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{stats?.passRate || 0}%</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Gagal / Reject</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">{stats?.failedInspections || 0}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700 border border-rose-200">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-medium">Dibatalkan (Void)</div>
              <div className="text-2xl font-bold text-muted-foreground mt-1">{stats?.voidedInspections || 0}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border">
              <Ban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {notice && (
        <div role="status" className="px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex justify-between items-center">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-600 font-bold ml-4">✕</button>
        </div>
      )}

      {error && (
        <div role="alert" className="px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <DataTable
          columns={columns}
          data={inspections}
          isLoading={isLoading}
          searchPlaceholder="Cari riwayat inspeksi (no. batch, inspeksi, atau penguji)..."
        />
      </div>

      {/* New Inspection Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Catat Hasil Pemeriksaan Mutu (QC)</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateInspection} className="space-y-4 pt-2">
            {formError && (
              <div role="alert" className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Target Inspeksi</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as "production_order" | "goods_receipt")}
                  className={selectCls}
                >
                  <option value="production_order">Order Produksi (Dalam Proses)</option>
                  <option value="goods_receipt">Penerimaan Bahan Baku (Pemasok)</option>
                </select>
              </div>

              {targetType === "production_order" ? (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Order Produksi Aktif</label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleOrderChange(e.target.value)}
                    className={selectCls}
                    required
                  >
                    {activeOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber || "Order"} — {o.productName} ({o.quantityToProduce} unit)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Nomor Lot / Referensi Penerimaan</label>
                  <Input value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} placeholder="e.g. GR-202611-001" required />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nomor Batch yang Diuji</label>
                <Input
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g. BTH-GS-202611-01"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Alat Uji yang Dipakai</label>
                <Input
                  value={testingTool}
                  onChange={(e) => setTestingTool(e.target.value)}
                  placeholder="e.g. Moisture Analyzer Ohaus MB90"
                />
              </div>
            </div>

            {/* Dynamic Parameter Tests */}
            <div className="border border-border rounded-xl p-3 bg-muted/20 space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Parameter Mutu yang Diuji</span>
                <span className="text-[11px] text-muted-foreground font-normal">Sistem mengevaluasi status Lulus/Gagal otomatis</span>
              </div>

              <div className="space-y-3">
                {parameters.map((p) => {
                  const isChecked = selectedParamIds.includes(p.id);
                  const currentVal = itemValues[p.id] || {};

                  // Evaluation preview
                  let isPassPreview = true;
                  if (p.paramType === "numeric") {
                    const num = currentVal.numericValue ?? 0;
                    if (p.minValue !== undefined && num < p.minValue) isPassPreview = false;
                    if (p.maxValue !== undefined && num > p.maxValue) isPassPreview = false;
                    if (p.targetValue !== undefined && p.tolerance !== undefined) {
                      if (Math.abs(num - p.targetValue) > p.tolerance) isPassPreview = false;
                    }
                  } else {
                    isPassPreview = Boolean(currentVal.booleanValue);
                  }

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border transition ${
                        isChecked ? "bg-card border-border shadow-sm" : "bg-muted/40 border-transparent opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParamIds([...selectedParamIds, p.id]);
                              } else {
                                setSelectedParamIds(selectedParamIds.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                          />
                          <span className="text-xs font-semibold text-foreground">{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-mono">
                            {p.processCode}
                          </span>
                        </label>

                        {isChecked && (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              isPassPreview
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {isPassPreview ? "LULUS" : "GAGAL"}
                          </span>
                        )}
                      </div>

                      {isChecked && (
                        <div className="space-y-2 mt-2 pt-2 border-t border-border/50">
                          {p.paramType === "numeric" ? (
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={currentVal.numericValue !== undefined ? currentVal.numericValue : ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                                    setItemValues({
                                      ...itemValues,
                                      [p.id]: { ...currentVal, numericValue: val },
                                    });
                                  }}
                                  placeholder={`Masukkan nilai (${p.unitOfMeasure})`}
                                  required
                                />
                              </div>
                              <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                Standar: {p.maxValue !== undefined ? `≤ ${p.maxValue}` : ""}
                                {p.targetValue !== undefined ? `${p.targetValue} ± ${p.tolerance}` : ""} {p.unitOfMeasure}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                <input
                                  type="radio"
                                  name={`bool_${p.id}`}
                                  checked={currentVal.booleanValue === true}
                                  onChange={() =>
                                    setItemValues({
                                      ...itemValues,
                                      [p.id]: { ...currentVal, booleanValue: true },
                                    })
                                  }
                                  className="text-primary focus:ring-primary"
                                />
                                LULUS (Bebas Kontaminan)
                              </label>

                              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-rose-700">
                                <input
                                  type="radio"
                                  name={`bool_${p.id}`}
                                  checked={currentVal.booleanValue === false}
                                  onChange={() =>
                                    setItemValues({
                                      ...itemValues,
                                      [p.id]: { ...currentVal, booleanValue: false },
                                    })
                                  }
                                  className="text-rose-600 focus:ring-rose-500"
                                />
                                GAGAL (Terdeteksi Kontaminan)
                              </label>
                            </div>
                          )}

                          {/* Business Rule Explanation Alert */}
                          {p.processCode === "CEK_AIR" && (
                            <div className={`p-2 rounded text-[11px] font-medium border ${
                              (currentVal.numericValue ?? 0) <= 2.0
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {(currentVal.numericValue ?? 0) <= 2.0
                                ? "⚡ Aturan BRL-01: Kadar air ≤ 2.0% -> Tahap Ayak 1, Oven, dan Pendinginan akan otomatis DILEWATI (Skipped)."
                                : "⚠️ Aturan BRL-01: Kadar air > 2.0% -> Tahap Ayak 1, Oven, dan Pendinginan WAJIB dikerjakan."}
                            </div>
                          )}

                          {p.processCode === "METAL_DETECTOR" && !currentVal.booleanValue && (
                            <div className="p-2 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                              🔒 Aturan BRL-03: Hasil Metal Detector GAGAL akan memblokir produk masuk ke Gudang Barang Jadi (FG).
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Catatan Tambahan Pemeriksaan</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan visual, sampling, atau instruksi tindak lanjut"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan Hasil Uji..." : "Simpan & Verifikasi QC"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Inspection Modal */}
      <Dialog open={Boolean(viewItem)} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Rincian Pemeriksaan {viewItem?.inspectionNo}</DialogTitle>
          </DialogHeader>

          {viewItem && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/40 p-3 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground">Nomor Batch:</span>
                  <div className="font-mono font-bold text-foreground mt-0.5">{viewItem.batchNo}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Waktu Pemeriksaan:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {new Date(viewItem.inspectedAt).toLocaleString("id-ID")}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Petugas Penguji:</span>
                  <div className="font-medium text-foreground mt-0.5">{viewItem.inspectorName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Alat Uji:</span>
                  <div className="font-medium text-foreground mt-0.5">{viewItem.testingTool || "-"}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground mb-2">Daftar Parameter yang Diuji</div>
                <div className="space-y-2">
                  {viewItem.items?.map((itm) => (
                    <div
                      key={itm.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                    >
                      <div>
                        <div className="font-medium text-foreground">{itm.parameterName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Nilai Aktual:{" "}
                          <span className="font-mono font-semibold text-foreground">
                            {itm.paramType === "numeric" ? `${itm.numericValue}` : itm.booleanValue ? "LULUS (True)" : "GAGAL (False)"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          itm.isPassed
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {itm.isPassed ? "LULUS" : "GAGAL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {viewItem.isVoided && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5" />
                    Catatan Pemeriksaan Ini Telah Dibatalkan (Void)
                  </div>
                  <div>Alasan Pembatalan: {viewItem.voidReason}</div>
                  {viewItem.voidedAt && (
                    <div className="text-[11px] text-rose-600">
                      Waktu Pembatalan: {new Date(viewItem.voidedAt).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewItem(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Dialog (BRL-07: Mandatory Reason) */}
      <Dialog open={Boolean(voidTarget)} onOpenChange={() => setVoidTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Batalkan (Void) Hasil Pemeriksaan QC</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleVoidSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              Sesuai aturan <strong>BRL-07</strong>, data hasil QC tidak dapat dihapus permanen. Pembatalan hanya dapat dilakukan dengan menyertakan alasan tertulis untuk jejak audit kepatuhan mutu pangan.
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Alasan Pembatalan <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Contoh: Kesalahan kalibrasi alat moisture analyzer; uji ulang lot yang sama"
                rows={3}
                className="w-full p-2.5 text-xs rounded-lg border border-border bg-card text-foreground focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVoidTarget(null)}>
                Batal
              </Button>
              <Button type="submit" variant="destructive" disabled={isVoiding || !voidReason.trim()}>
                {isVoiding ? "Membatalkan..." : "Konfirmasi Pembatalan (Void)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
