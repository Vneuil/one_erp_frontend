"use client";

import * as React from "react";
import { Plus, Trash2, Edit2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import { qcApi, QCParameterItem, CreateQCParameterInput } from "@/lib/api/qc";
import { useConfirm } from "@/components/shared/confirm-modal";

const selectCls = "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function QCParametersPage() {
  const confirm = useConfirm();
  const [reload, setReload] = React.useState(0);
  const { data: rawParameters, loading: isLoading, error } = useReport(
    `qc-parameters|${reload}`,
    () => qcApi.listParameters().then((res) => res.data || [])
  );
  const parameters: QCParameterItem[] = rawParameters ?? [];

  const [isOpen, setIsOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<QCParameterItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // Form states
  const [processCode, setProcessCode] = React.useState("CEK_AIR");
  const [name, setName] = React.useState("");
  const [paramType, setParamType] = React.useState<"numeric" | "boolean">("numeric");
  const [unitOfMeasure, setUnitOfMeasure] = React.useState("%");
  const [minValue, setMinValue] = React.useState("");
  const [maxValue, setMaxValue] = React.useState("2.0");
  const [targetValue, setTargetValue] = React.useState("");
  const [tolerance, setTolerance] = React.useState("");
  const [isGate, setIsGate] = React.useState(true);
  const [isMandatory, setIsMandatory] = React.useState(true);
  const [description, setDescription] = React.useState("");

  const resetForm = () => {
    setEditingItem(null);
    setProcessCode("CEK_AIR");
    setName("");
    setParamType("numeric");
    setUnitOfMeasure("%");
    setMinValue("");
    setMaxValue("2.0");
    setTargetValue("");
    setTolerance("");
    setIsGate(true);
    setIsMandatory(true);
    setDescription("");
    setFormError(null);
  };

  const openNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEdit = (item: QCParameterItem) => {
    setEditingItem(item);
    setProcessCode(item.processCode);
    setName(item.name);
    setParamType(item.paramType);
    setUnitOfMeasure(item.unitOfMeasure || "");
    setMinValue(item.minValue !== undefined ? String(item.minValue) : "");
    setMaxValue(item.maxValue !== undefined ? String(item.maxValue) : "");
    setTargetValue(item.targetValue !== undefined ? String(item.targetValue) : "");
    setTolerance(item.tolerance !== undefined ? String(item.tolerance) : "");
    setIsGate(item.isGate);
    setIsMandatory(item.isMandatory);
    setDescription(item.description || "");
    setFormError(null);
    setIsOpen(true);
  };

  const handleProcessCodePreset = (code: string) => {
    setProcessCode(code);
    if (code === "CEK_AIR") {
      setName("Kadar Air (Moisture)");
      setParamType("numeric");
      setUnitOfMeasure("%");
      setMaxValue("2.0");
      setMinValue("");
      setTargetValue("");
      setTolerance("");
      setIsGate(true);
      setDescription("BRL-01: Kadar air maksimal 2.0% (<=2% skip oven; >2% wajib oven)");
    } else if (code === "BRIX") {
      setName("Kadar Brix Gula Cair");
      setParamType("numeric");
      setUnitOfMeasure("°Bx");
      setMaxValue("");
      setMinValue("");
      setTargetValue("70.0");
      setTolerance("2.0");
      setIsGate(true);
      setDescription("BRL-04: Target Brix 70 ± 2°Bx sebelum filling gula cair");
    } else if (code === "METAL_DETECTOR") {
      setName("Uji Metal Detector");
      setParamType("boolean");
      setUnitOfMeasure("boolean");
      setMaxValue("");
      setMinValue("");
      setTargetValue("");
      setTolerance("");
      setIsGate(true);
      setDescription("BRL-03: Gate wajib bebas kontaminan logam sebelum masuk Pack/FG");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Nama parameter wajib diisi");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);

    const payload: CreateQCParameterInput = {
      processCode: processCode.toUpperCase().trim(),
      name: name.trim(),
      paramType,
      unitOfMeasure: unitOfMeasure.trim(),
      minValue: minValue !== "" ? Number(minValue) : undefined,
      maxValue: maxValue !== "" ? Number(maxValue) : undefined,
      targetValue: targetValue !== "" ? Number(targetValue) : undefined,
      tolerance: tolerance !== "" ? Number(tolerance) : undefined,
      isGate,
      isMandatory,
      description: description.trim(),
    };

    try {
      if (editingItem) {
        await qcApi.updateParameter(editingItem.id, payload);
        setNotice(`Parameter '${payload.name}' berhasil diperbarui.`);
      } else {
        await qcApi.createParameter(payload);
        setNotice(`Parameter '${payload.name}' berhasil ditambahkan.`);
      }
      setIsOpen(false);
      resetForm();
      setReload((n) => n + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal menyimpan parameter QC."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: QCParameterItem) => {
    const ok = await confirm({
      title: "Hapus Parameter Mutu",
      message: `Hapus parameter mutu '${item.name}'?`,
      variant: "destructive",
      confirmText: "Hapus",
    });
    if (!ok) return;
    try {
      await qcApi.deleteParameter(item.id);
      setNotice(`Parameter '${item.name}' berhasil dihapus.`);
      setReload((n) => n + 1);
    } catch (err) {
      setNotice(`Gagal menghapus: ${errText(err, "Terjadi kesalahan")}`);
    }
  };

  const columns: Column<QCParameterItem>[] = [
    {
      key: "processCode",
      header: "Kode Proses",
      render: (p: QCParameterItem) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          {p.processCode}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nama Parameter",
      render: (p: QCParameterItem) => (
        <div>
          <div className="font-medium text-xs text-foreground">{p.name}</div>
          {p.description && (
            <div className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "paramType",
      header: "Tipe Data",
      render: (p: QCParameterItem) => (
        <span className="capitalize text-xs text-muted-foreground font-mono">
          {p.paramType === "numeric" ? `Numerik (${p.unitOfMeasure || "-"})` : "Boolean (Lulus/Gagal)"}
        </span>
      ),
    },
    {
      key: "criteria",
      header: "Standar Kelulusan (Kriteria)",
      render: (p: QCParameterItem) => {
        if (p.paramType === "boolean") {
          return <span className="text-xs text-emerald-700 font-medium">Wajib Lulus (True)</span>;
        }
        if (p.targetValue !== undefined && p.tolerance !== undefined) {
          return (
            <span className="text-xs font-mono font-medium text-foreground">
              Target: {p.targetValue} ± {p.tolerance} {p.unitOfMeasure}
            </span>
          );
        }
        if (p.maxValue !== undefined && p.minValue !== undefined) {
          return (
            <span className="text-xs font-mono font-medium text-foreground">
              {p.minValue} - {p.maxValue} {p.unitOfMeasure}
            </span>
          );
        }
        if (p.maxValue !== undefined) {
          return (
            <span className="text-xs font-mono font-medium text-foreground">
              Maks: ≤ {p.maxValue} {p.unitOfMeasure}
            </span>
          );
        }
        if (p.minValue !== undefined) {
          return (
            <span className="text-xs font-mono font-medium text-foreground">
              Min: ≥ {p.minValue} {p.unitOfMeasure}
            </span>
          );
        }
        return <span className="text-xs text-muted-foreground">-</span>;
      },
    },
    {
      key: "isGate",
      header: "QC Gate",
      render: (p: QCParameterItem) =>
        p.isGate ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Gate Wajib
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
            Informatif
          </span>
        ),
    },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      render: (p: QCParameterItem) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Edit Parameter">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(p)} title="Hapus Parameter">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Parameter Mutu (QC)"
        description="Konfigurasi kriteria kelulusan, batasan toleransi, dan status Gate Wajib untuk kontrol mutu gula semut dan gula cair."
      >
        <Button onClick={openNew} className="gap-2 text-xs">
          <Plus className="w-4 h-4" />
          Tambah Parameter
        </Button>
      </PageHeader>

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
          data={parameters}
          isLoading={isLoading}
          searchPlaceholder="Cari parameter mutu (nama atau kode)..."
        />
      </div>

      {/* Modal Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Ubah Parameter Mutu" : "Tambah Parameter Mutu Baru"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div role="alert" className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Preset Pengujian</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { code: "CEK_AIR", label: "Kadar Air (≤2%)" },
                  { code: "METAL_DETECTOR", label: "Metal Detector" },
                  { code: "BRIX", label: "Brix (70±2)" },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleProcessCodePreset(item.code)}
                    className={`px-2 py-1.5 rounded text-xs border transition ${
                      processCode === item.code
                        ? "bg-primary text-white border-primary font-semibold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 border-border"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Kode Proses</label>
                <Input
                  value={processCode}
                  onChange={(e) => setProcessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CEK_AIR"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Tipe Parameter</label>
                <select
                  value={paramType}
                  onChange={(e) => setParamType(e.target.value as "numeric" | "boolean")}
                  className={selectCls}
                >
                  <option value="numeric">Numerik (Angka / Nilai)</option>
                  <option value="boolean">Boolean (Lulus / Gagal)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1">Nama Parameter</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kadar Air Gula Semut"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Satuan (UoM)</label>
                <Input
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  placeholder="%, °Bx, g"
                />
              </div>
            </div>

            {paramType === "numeric" && (
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-3">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Batasan Kelulusan (Pilih salah satu model)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nilai Min (Batas Bawah)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                      placeholder="Kosongkan jika tdk ada"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nilai Maks (Batas Atas)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                      placeholder="e.g. 2.0 untuk kadar air"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Target Ideal</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      placeholder="e.g. 70.0 untuk Brix"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Toleransi (±)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tolerance}
                      onChange={(e) => setTolerance(e.target.value)}
                      placeholder="e.g. 2.0"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 py-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isGate}
                  onChange={(e) => setIsGate(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                QC Gate (Blokir proses berikutnya bila gagal)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                Wajib Diuji
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Keterangan / Aturan Bisnis</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan regulasi atau instruksi uji"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Buat Parameter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
