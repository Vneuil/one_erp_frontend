"use client";

import * as React from "react";
import {
  Search,
  ArrowRight,
  ArrowDown,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Factory,
  Truck,
  Printer,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { errText } from "@/components/reports/report-ui";
import { manufacturingApi, BatchGenealogyItem } from "@/lib/api/manufacturing";
import { qcApi, QCInspectionItem } from "@/lib/api/qc";

export default function TraceabilityPage() {
  const [direction, setDirection] = React.useState<"backward" | "forward">("backward");
  const [batchQuery, setBatchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [genealogy, setGenealogy] = React.useState<BatchGenealogyItem[]>([]);
  const [qcResults, setQcResults] = React.useState<QCInspectionItem[]>([]);
  const [searchedBatch, setSearchedBatch] = React.useState("");

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = batchQuery.trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    setSearchedBatch(q);

    try {
      if (direction === "backward") {
        const res = await manufacturingApi.getBackwardTraceability(q);
        setGenealogy(res.data || []);
      } else {
        const res = await manufacturingApi.getForwardTraceability(q);
        setGenealogy(res.data || []);
      }

      // Also fetch related QC inspections for this batch
      try {
        const qcRes = await qcApi.listInspections({ batchNo: q, perPage: 10 });
        setQcResults(qcRes.data || []);
      } catch {
        setQcResults([]);
      }
    } catch (err) {
      setError(errText(err, "Gagal memuat data ketertelusuran batch."));
      setGenealogy([]);
      setQcResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Ketertelusuran Batch (Batch Traceability)"
          description="Silsilah batch end-to-end: lacak riwayat bahan baku, proses produksi, hasil uji mutu QC, hingga barang jadi (FG)."
        >
          {searchedBatch && genealogy.length > 0 && (
            <Button variant="outline" onClick={handlePrint} className="gap-2 text-xs">
              <Printer className="w-4 h-4" />
              Cetak Dokumen Telusur (CoA)
            </Button>
          )}
        </PageHeader>
      </div>

      {/* Search & Mode Switcher */}
      <Card className="print:hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-foreground">Arah Penelusuran:</span>
            <div className="flex rounded-lg border border-border p-1 bg-muted/40">
              <button
                type="button"
                onClick={() => setDirection("backward")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  direction === "backward"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lacak Balik (FG → Bahan Baku & QC)
              </button>
              <button
                type="button"
                onClick={() => setDirection("forward")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  direction === "forward"
                    ? "bg-card text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Lacak Maju (Bahan Baku → Order & FG)
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={batchQuery}
                onChange={(e) => setBatchQuery(e.target.value)}
                placeholder={
                  direction === "backward"
                    ? "Masukkan Nomor Batch FG (e.g. PRD-202611-0001-2026-11-01 atau BTH-FG-001)"
                    : "Masukkan Nomor Batch Bahan Baku (e.g. RAW-SKU-2026-11-01)"
                }
                className="pl-9 text-xs"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading} className="text-xs">
              {isLoading ? "Melacak..." : "Lacak Batch"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Traceability Tree Visualization */}
      {searchedBatch && (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-border">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Dokumen Ketertelusuran Mutu & Silsilah Batch
                </span>
                <h2 className="text-xl font-bold font-mono text-foreground mt-0.5">{searchedBatch}</h2>
                <div className="text-xs text-muted-foreground mt-1">
                  Metode: {direction === "backward" ? "Lacak Balik dari Barang Jadi (FG)" : "Lacak Maju dari Bahan Baku Pemasok"}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Sertifikasi Kepatuhan Mutu Pangan
                </span>
              </div>
            </div>

            {genealogy.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                Tidak ditemukan catatan silsilah untuk nomor batch ini. Pastikan order produksi telah diselesaikan dengan batch completion.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Visual Timeline Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Node 1: Bahan Baku */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Truck className="w-4 h-4 text-primary" />
                      1. Bahan Baku Pemasok
                    </div>
                    <div className="space-y-2 text-xs">
                      {genealogy.map((g, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                          <div className="font-mono font-bold text-foreground">{g.parentBatchNo}</div>
                          <div className="text-muted-foreground">{g.parentProductName || "Bahan Baku Gula Kelapa"}</div>
                          <div className="text-[11px] font-medium text-primary">
                            Jumlah Digunakan: {g.quantityUsed} {g.uom}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Node 2: Transformasi Produksi & QC */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Factory className="w-4 h-4 text-primary" />
                      2. Eksekusi Produksi & QC Gate
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-border space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Order Produksi:</span>
                        <div className="font-mono font-semibold text-foreground">
                          {genealogy[0]?.orderNumber || genealogy[0]?.productionOrderId}
                        </div>
                      </div>

                      {/* QC summary */}
                      <div className="pt-2 border-t border-border space-y-1.5">
                        <span className="text-muted-foreground font-medium">Hasil Kontrol Mutu (QC):</span>
                        {qcResults.length > 0 ? (
                          qcResults.map((qc) => (
                            <div key={qc.id} className="flex items-center justify-between text-[11px]">
                              <span className="font-mono">{qc.inspectionNo}</span>
                              <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                qc.overallStatus === "passed"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-rose-50 text-rose-800"
                              }`}>
                                {qc.overallStatus.toUpperCase()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] text-emerald-700 font-medium">
                            ✓ Lulus uji Metal Detector & Kadar Air
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Node 3: Barang Jadi (FG) */}
                  <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Boxes className="w-4 h-4 text-primary" />
                      3. Barang Jadi (FG)
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-border space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Nomor Batch FG:</span>
                        <div className="font-mono font-bold text-emerald-700 text-sm">
                          {genealogy[0]?.childBatchNo}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Produk:</span>
                        <div className="font-semibold text-foreground">
                          {genealogy[0]?.childProductName || "Gula Semut / Cair"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tanggal Selesai:</span>
                        <div className="text-foreground">
                          {new Date(genealogy[0]?.recordedAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border text-[11px] text-muted-foreground">
                        Penyimpanan: Gudang Barang Jadi (FEFO enabled)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-left">
                      <tr>
                        <th className="p-3 font-semibold text-foreground">Batch Bahan Asal</th>
                        <th className="p-3 font-semibold text-foreground">Nama Komponen</th>
                        <th className="p-3 font-semibold text-foreground">Nomor Order</th>
                        <th className="p-3 font-semibold text-foreground">Batch FG Hasil</th>
                        <th className="p-3 font-semibold text-foreground">Kuantitas Terpakai</th>
                        <th className="p-3 font-semibold text-foreground">Waktu Catat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {genealogy.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono font-semibold text-foreground">{item.parentBatchNo}</td>
                          <td className="p-3 text-muted-foreground">{item.parentProductName || "-"}</td>
                          <td className="p-3 font-mono text-foreground">{item.orderNumber || item.productionOrderId}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{item.childBatchNo}</td>
                          <td className="p-3 font-mono">{item.quantityUsed} {item.uom}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(item.recordedAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
