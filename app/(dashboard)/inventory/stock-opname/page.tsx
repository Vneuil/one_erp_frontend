"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, CheckCircle2, Save, Upload, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { inventoryApi, OpnameImportResult, OpnameItem, WarehouseItem } from "@/lib/api/inventory";
import { downloadCsv } from "@/lib/utils/csv";
import { parseCountSheet, RowError } from "@/lib/utils/opname-count-sheet";

interface StockOpname {
  id: string;
  opnameNumber: string;
  warehouse: string;
  scheduleDate: string;
  totalSKUs: number;
  varianceCount: number;
  status: string;
}

export default function StockOpnamePage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("inventory");
  const [audits, setAudits] = React.useState<StockOpname[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [isStarting, setIsStarting] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);
  const [isNewAuditOpen, setIsNewAuditOpen] = React.useState(false);
  const [newAuditWarehouseId, setNewAuditWarehouseId] = React.useState("");

  const [activeOpname, setActiveOpname] = React.useState<OpnameItem | null>(null);
  const [countDrafts, setCountDrafts] = React.useState<Record<string, string>>({});
  const [savingLineId, setSavingLineId] = React.useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importReport, setImportReport] = React.useState<{ applied: number; errors: RowError[] } | null>(null);

  const mapOpname = (o: OpnameItem): StockOpname => ({
    id: o.id,
    opnameNumber: `SO-AUD-${o.auditDate}-${o.id.slice(0, 4).toUpperCase()}`,
    warehouse: o.warehouseName,
    scheduleDate: o.auditDate,
    totalSKUs: o.lines.length,
    varianceCount: o.lines.filter((l) => l.variance !== 0).length,
    status: o.status,
  });

  const fetchAudits = React.useCallback(() => {
    inventoryApi
      .listOpnames({ perPage: 50 })
      .then((res) => setAudits((res.data || []).map(mapOpname)))
      .catch((err) => console.warn("Backend inventory API unavailable", err));
  }, []);

  React.useEffect(() => {
    fetchAudits();
    inventoryApi
      .listWarehouses({ perPage: 50 })
      .then((res) => setWarehouses(res.data || []))
      .catch((err) => console.warn("Failed to load warehouses", err));
  }, [fetchAudits]);

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditWarehouseId) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const res = await inventoryApi.createOpname({ warehouseId: newAuditWarehouseId });
      setAudits([mapOpname(res.data), ...audits]);
      setIsNewAuditOpen(false);
      setNewAuditWarehouseId("");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Gagal membuat sesi stock opname");
    } finally {
      setIsStarting(false);
    }
  };

  const openDetail = async (opnameId: string) => {
    setDetailError(null);
    setImportReport(null);
    try {
      const res = await inventoryApi.getOpname(opnameId);
      setActiveOpname(res.data);
      const drafts: Record<string, string> = {};
      res.data.lines.forEach((l) => {
        drafts[l.id] = l.counted ? String(l.countedQty) : "";
      });
      setCountDrafts(drafts);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memuat detail stock opname");
    }
  };

  const handleSaveLine = async (lineId: string, productId: string) => {
    if (!activeOpname) return;
    const raw = countDrafts[lineId];
    const countedQty = Number(raw);
    if (raw === "" || Number.isNaN(countedQty) || countedQty < 0) return;

    setSavingLineId(lineId);
    setDetailError(null);
    try {
      const res = await inventoryApi.countOpnameLine(activeOpname.id, { productId, countedQty });
      setActiveOpname(res.data);
      fetchAudits();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Gagal menyimpan hasil hitung");
    } finally {
      setSavingLineId(null);
    }
  };

  const downloadTemplate = () => {
    if (!activeOpname) return;
    downloadCsv(`template-opname-${activeOpname.warehouseName}-${activeOpname.auditDate}.csv`, ["SKU", "Produk", "Stok Sistem", "Hasil Hitung"],
      activeOpname.lines.map((l) => [l.productSku, l.productName, l.systemQty, l.counted ? l.countedQty : ""]));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeOpname) return;
    setImporting(true);
    setDetailError(null);
    setImportReport(null);
    try {
      const { rows, errors: parseErrors } = parseCountSheet(await file.text());
      if (rows.length === 0) {
        setImportReport({ applied: 0, errors: parseErrors.length ? parseErrors : [{ row: 0, sku: "", message: "Tidak ada baris dengan hasil hitung yang terisi." }] });
        return;
      }
      const res = await inventoryApi.importOpnameCounts(activeOpname.id, rows);
      const result: OpnameImportResult = res.data;
      setImportReport({ applied: result.applied, errors: [...parseErrors, ...result.errors].sort((a, b) => a.row - b.row) });
      setActiveOpname(result.opname);
      const drafts: Record<string, string> = {};
      result.opname.lines.forEach((l) => {
        drafts[l.id] = l.counted ? String(l.countedQty) : "";
      });
      setCountDrafts(drafts);
      fetchAudits();
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Gagal mengimpor hasil hitung");
    } finally {
      setImporting(false);
    }
  };

  const handleFinalize = async () => {
    if (!activeOpname) return;
    const uncounted = activeOpname.lines.filter((l) => !l.counted).length;
    if (uncounted > 0 && !confirm(`${uncounted} SKU belum dihitung. Tetap finalisasi audit ini?`)) {
      return;
    }
    setIsFinalizing(true);
    setDetailError(null);
    try {
      const res = await inventoryApi.finalizeOpname(activeOpname.id);
      setActiveOpname(res.data);
      fetchAudits();
      alert("Stock opname difinalisasi. Selisih stok telah direkonsiliasi otomatis ke sistem.");
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Gagal finalisasi stock opname");
    } finally {
      setIsFinalizing(false);
    }
  };

  const columns: Column<StockOpname>[] = [
    {
      key: "opnameNumber",
      header: "Audit Batch No.",
      sortable: true,
      render: (op) => <span className="font-mono text-xs font-bold text-brand-primary">{op.opnameNumber}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      render: (op) => <span className="text-xs font-semibold text-foreground">{op.warehouse}</span>,
    },
    {
      key: "scheduleDate",
      header: "Audit Date",
      render: (op) => <span className="text-xs text-muted-foreground">{op.scheduleDate}</span>,
    },
    {
      key: "totalSKUs",
      header: "Audited SKUs",
      align: "center",
      render: (op) => <span className="text-xs font-medium">{op.totalSKUs} Items</span>,
    },
    {
      key: "varianceCount",
      header: "Variances Found",
      align: "center",
      render: (op) => (
        <span className={`text-xs font-bold ${op.varianceCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
          {op.varianceCount} Discrepancies
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (op) => <StatusBadge status={op.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Opname & Physical Inventory Count"
        description="Schedule physical inventory audits, record physical count sheets, and reconcile variances."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewAuditOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Start New Audit
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={audits}
        searchKey="opnameNumber"
        searchPlaceholder="Search audit batch..."
        onRowClick={(op) => openDetail(op.id)}
      />

      {/* New Audit Dialog */}
      <Dialog open={isNewAuditOpen} onOpenChange={setIsNewAuditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-brand-primary" />
              <span>Mulai Audit Stock Opname Baru</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartAudit} className="space-y-3.5 text-xs">
            {startError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {startError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Gudang *</label>
              <select
                value={newAuditWarehouseId}
                onChange={(e) => setNewAuditWarehouseId(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih gudang...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sesi audit akan dibuat untuk semua SKU dengan stok aktif di gudang ini.
            </p>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewAuditOpen(false)} className="h-9 text-xs">
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isStarting} className="h-9 text-xs font-bold">
                {isStarting ? "Membuat..." : "Mulai Audit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audit Detail / Count Sheet Dialog */}
      <Dialog open={Boolean(activeOpname)} onOpenChange={(open) => !open && setActiveOpname(null)}>
        <DialogContent className="max-w-2xl">
          {activeOpname && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center justify-between gap-2 pr-6">
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-brand-primary" />
                    <span>Count Sheet — {activeOpname.warehouseName}</span>
                  </span>
                  <StatusBadge status={activeOpname.status} />
                </DialogTitle>
              </DialogHeader>

              {detailError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs">
                  {detailError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/inventory/stock-opname/${activeOpname.id}/print`} target="_blank" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[11px] font-semibold hover:bg-slate-50">
                  <Printer className="h-3.5 w-3.5" /> Cetak Form
                </Link>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={downloadTemplate}><Download className="h-3.5 w-3.5" /> Template CSV</Button>
                {activeOpname.status !== "completed" && mayApprove && (
                  <label className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-[11px] font-semibold cursor-pointer hover:bg-slate-50 ${importing ? "opacity-50 pointer-events-none" : ""}`}>
                    <Upload className="h-3.5 w-3.5" /> {importing ? "Mengimpor..." : "Impor Hasil Hitung (CSV)"}
                    <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={handleImportFile} aria-label="Impor hasil hitung" />
                  </label>
                )}
              </div>
              {importReport && (
                <div role="status" className={`p-2.5 rounded-lg border text-xs ${importReport.errors.length ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                  <div className="font-semibold">{importReport.applied} SKU berhasil diimpor{importReport.errors.length ? `, ${importReport.errors.length} baris bermasalah:` : "."}</div>
                  {importReport.errors.length > 0 && (
                    <ul className="mt-1 max-h-24 overflow-y-auto list-disc pl-4">
                      {importReport.errors.map((er, i) => <li key={i}>{er.row ? `Baris ${er.row}` : "File"}{er.sku ? ` (${er.sku})` : ""}: {er.message}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="max-h-[420px] overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2.5 font-semibold">SKU</th>
                      <th className="p-2.5 font-semibold">Produk</th>
                      <th className="p-2.5 font-semibold text-right">Stok Sistem</th>
                      <th className="p-2.5 font-semibold text-right">Hasil Hitung</th>
                      <th className="p-2.5 font-semibold text-right">Selisih</th>
                      <th className="p-2.5 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOpname.lines.map((line) => (
                      <tr key={line.id} className="border-t border-border/70">
                        <td className="p-2.5 font-mono font-bold text-brand-primary">{line.productSku}</td>
                        <td className="p-2.5 font-semibold text-foreground">{line.productName}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{line.systemQty}</td>
                        <td className="p-2.5 text-right">
                          <Input
                            type="number"
                            min={0}
                            value={countDrafts[line.id] ?? ""}
                            onChange={(e) =>
                              setCountDrafts((prev) => ({ ...prev, [line.id]: e.target.value }))
                            }
                            disabled={activeOpname.status === "completed"}
                            className="h-8 w-24 text-xs text-right ml-auto"
                          />
                        </td>
                        <td
                          className={`p-2.5 text-right font-bold ${
                            !line.counted
                              ? "text-muted-foreground"
                              : line.variance === 0
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {line.counted ? (line.variance >= 0 ? `+${line.variance}` : line.variance) : "-"}
                        </td>
                        <td className="p-2.5">
                          {activeOpname.status !== "completed" && mayApprove && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={savingLineId === line.id}
                              onClick={() => handleSaveLine(line.id, line.productId)}
                              className="h-7 gap-1 text-[11px] px-2"
                            >
                              {line.counted ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Save className="h-3 w-3" />}
                              {savingLineId === line.id ? "..." : line.counted ? "Tersimpan" : "Simpan"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {activeOpname.lines.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          Tidak ada SKU untuk gudang ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveOpname(null)} className="h-9 text-xs">
                  Tutup
                </Button>
                {activeOpname.status !== "completed" && (
                  <Button
                    type="button"
                    variant="gradient"
                    size="sm"
                    disabled={isFinalizing}
                    onClick={handleFinalize}
                    className="h-9 text-xs font-bold"
                  >
                    {isFinalizing ? "Memproses..." : "Finalisasi & Rekonsiliasi Stok"}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
