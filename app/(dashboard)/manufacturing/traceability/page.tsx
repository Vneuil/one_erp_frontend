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
  QrCode,
  Sparkles,
  Tag,
  Copy,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { errText } from "@/components/reports/report-ui";
import { manufacturingApi, BatchGenealogyItem } from "@/lib/api/manufacturing";
import { qcApi, QCInspectionItem } from "@/lib/api/qc";

// Lightweight authentic-looking 2D Matrix/QR SVG renderer
function QRCodeSVG({ value, size = 80 }: { value: string; size?: number }) {
  // Deterministic 21x21 matrix with standard finder patterns
  const matrix = React.useMemo(() => {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Finder pattern helper (7x7)
    const addFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[r0 + r][c0 + c] = true;
          }
        }
      }
    };

    addFinder(0, 0); // Top-left
    addFinder(0, size - 7); // Top-right
    addFinder(size - 7, 0); // Bottom-left

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Hash-based pseudo data fill for visual realism
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finders
        if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) {
          continue;
        }
        if (r === 6 || c === 6) continue;
        const bit = ((hash ^ (r * 31 + c * 17)) & 1) === 1;
        grid[r][c] = bit;
      }
    }

    return grid;
  }, [value]);

  return (
    <svg width={size} height={size} viewBox="0 0 21 21" className="bg-white p-1 rounded border border-gray-200">
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="black" /> : null
        )
      )}
    </svg>
  );
}

export default function TraceabilityPage() {
  const [activeTab, setActiveTab] = React.useState<"genealogy" | "generator">("genealogy");

  // Traceability State
  const [direction, setDirection] = React.useState<"backward" | "forward">("backward");
  const [batchQuery, setBatchQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [genealogy, setGenealogy] = React.useState<BatchGenealogyItem[]>([]);
  const [qcResults, setQcResults] = React.useState<QCInspectionItem[]>([]);
  const [searchedBatch, setSearchedBatch] = React.useState("");

  // Generator State (Manna Traceability Rules)
  const [genProduct, setGenProduct] = React.useState("Gula Kelapa Semut Organik");
  const [genYear, setGenYear] = React.useState(26); // 2026
  const [genType, setGenType] = React.useState<"N" | "O">("N"); // Natural / Organic
  const [genWeek, setGenWeek] = React.useState(48); // Week / Batch
  const [genSupplier, setGenSupplier] = React.useState("PW"); // Supplier Code (PW, KW, MJ)
  const [genStartSeq, setGenStartSeq] = React.useState(1);
  const [genNetWeight, setGenNetWeight] = React.useState(21250); // Total Net KG
  const [genPackSize, setGenPackSize] = React.useState(25); // 25 KG per Karung
  const [genLossTolerance, setGenLossTolerance] = React.useState(0.5); // 0.5% Susut
  const [genProdDate, setGenProdDate] = React.useState(new Date().toISOString().slice(0, 10));

  // Calculated batch output count: Ceiling([Net Weight * (1 - Loss%)] / Pack Size)
  const calculatedBags = React.useMemo(() => {
    if (genPackSize <= 0) return 0;
    const effectiveNet = genNetWeight * (1 - genLossTolerance / 100);
    return Math.max(1, Math.ceil(effectiveNet / genPackSize));
  }, [genNetWeight, genLossTolerance, genPackSize]);

  const batchPrefix = `${genYear}${genType}${String(genWeek).padStart(2, "0")}${genSupplier.toUpperCase()}`;

  // Generated serial numbers
  const generatedSerials = React.useMemo(() => {
    const list: string[] = [];
    const count = Math.min(calculatedBags, 1000); // cap to 1000 for DOM safety
    for (let i = 0; i < count; i++) {
      const seq = genStartSeq + i;
      list.push(`${batchPrefix}${String(seq).padStart(3, "0")}`);
    }
    return list;
  }, [batchPrefix, genStartSeq, calculatedBags]);

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
          title="Ketertelusuran Batch & Label QR"
          description="Sistem ketertelusuran end-to-end Manna (26N48PW###): audit silsilah mutu dan generator massal stiker barcode karung 25kg."
        >
          {activeTab === "genealogy" && searchedBatch && genealogy.length > 0 && (
            <Button variant="outline" onClick={handlePrint} className="gap-2 text-xs">
              <Printer className="w-4 h-4" />
              Cetak Dokumen Telusur (CoA)
            </Button>
          )}
          {activeTab === "generator" && (
            <Button onClick={handlePrint} className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Printer className="w-4 h-4" />
              Cetak Stiker Label Karung ({generatedSerials.length} Sak)
            </Button>
          )}
        </PageHeader>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-border gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("genealogy")}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "genealogy"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          Silsilah & Audit Telusur Batch
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("generator")}
          className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "generator"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode className="w-4 h-4" />
          Generator Stiker & QR Barcode Batch
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: SILSILAH BATCH TRACEABILITY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "genealogy" && (
        <div className="space-y-6">
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
                    placeholder={
                      direction === "backward"
                        ? "Masukkan No. Batch Barang Jadi (misal: 26N48PW001 atau PRD-202611-0001-01)..."
                        : "Masukkan No. Batch Bahan Baku Asal (misal: 26N48PW)..."
                    }
                    value={batchQuery}
                    onChange={(e) => setBatchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="text-xs">
                  {isLoading ? "Mencari..." : "Lacak Batch"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Traceability Flowchart & Genealogy Table */}
          {searchedBatch && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-primary" />
                        Pohon Silsilah Batch: <span className="font-mono text-primary font-bold">{searchedBatch}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Arah: {direction === "backward" ? "Lacak Balik (Backward Genealogy)" : "Lacak Maju (Forward Genealogy)"}
                      </CardDescription>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {genealogy.length} Hubungan Batch Ditemukan
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {genealogy.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      Tidak ditemukan riwayat ketertelusuran untuk batch "{searchedBatch}".
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {genealogy.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-lg border border-border bg-card/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-amber-500/10 text-amber-600">
                              <Factory className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[11px] text-muted-foreground">Bahan Asal / Batch Input</div>
                              <div className="font-mono font-bold text-foreground text-sm">{item.parentBatchNo}</div>
                              <div className="text-xs text-muted-foreground">{item.parentProductName || "Raw Material"}</div>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center px-4">
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {item.quantityUsed} {item.uom || "KG"}
                            </div>
                            <div className="flex items-center text-primary">
                              <ArrowRight className="w-5 h-5 hidden md:block" />
                              <ArrowDown className="w-5 h-5 md:hidden" />
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              SPK: {item.orderNumber || "PRD"}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded bg-emerald-500/10 text-emerald-600">
                              <Boxes className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-[11px] text-muted-foreground">Barang Jadi / Output FG</div>
                              <div className="font-mono font-bold text-emerald-700 text-sm">{item.childBatchNo}</div>
                              <div className="text-xs text-muted-foreground">{item.childProductName || "Finished Good"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* QC Results for this batch */}
              {qcResults.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Hasil Uji Mutu QC Terkait Batch Ini
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 border-b border-border text-left">
                          <tr>
                            <th className="p-3 font-semibold text-foreground">No. Inspeksi</th>
                            <th className="p-3 font-semibold text-foreground">Status Mutu</th>
                            <th className="p-3 font-semibold text-foreground">Inspektor QC</th>
                            <th className="p-3 font-semibold text-foreground">Waktu Inspeksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {qcResults.map((qc) => (
                            <tr key={qc.id}>
                              <td className="p-3 font-mono font-semibold text-foreground">{qc.inspectionNo}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                    qc.overallStatus === "passed"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {qc.overallStatus.toUpperCase()}
                                </span>
                              </td>
                              <td className="p-3 text-muted-foreground">{qc.inspectorName}</td>
                              <td className="p-3 text-muted-foreground">
                                {new Date(qc.inspectedAt).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: GENERATOR STIKER & QR BARCODE BATCH */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "generator" && (
        <div className="space-y-6">
          <Card className="print:hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Konfigurasi Kode Batch & Estimasi Output Karung
              </CardTitle>
              <CardDescription className="text-xs">
                Formula Manna: Output Sak = Ceiling([Total Netto * (1 - Susut%)] / Ukuran Kemasan).
                Format Kode: [Tahun 2 digit][Tipe N/O][Batch/Pekan][Supplier 2 huruf][Seq 3 digit].
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground">Produk Jadi</label>
                  <select
                    value={genProduct}
                    onChange={(e) => setGenProduct(e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-white text-xs"
                  >
                    <option value="Gula Kelapa Semut Organik">Gula Kelapa Semut Organik (25 KG)</option>
                    <option value="Gula Kelapa Semut Natural">Gula Kelapa Semut Natural (25 KG)</option>
                    <option value="Virgin Coconut Oil (VCO)">Virgin Coconut Oil / VCO (Liter)</option>
                    <option value="Gula Kelapa Cair (Liquid Sugar)">Gula Kelapa Cair (Jerigen)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Tipe Sertifikasi</label>
                  <select
                    value={genType}
                    onChange={(e) => setGenType(e.target.value as "N" | "O")}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-white text-xs"
                  >
                    <option value="N">Natural (Non-Organik) &rarr; 'N'</option>
                    <option value="O">Organik EU / USDA &rarr; 'O'</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Tahun & Pekan/Batch</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      value={genYear}
                      onChange={(e) => setGenYear(Number(e.target.value))}
                      className="h-9 text-xs w-20"
                      title="Tahun 2 digit (misal: 26)"
                    />
                    <Input
                      type="number"
                      value={genWeek}
                      onChange={(e) => setGenWeek(Number(e.target.value))}
                      className="h-9 text-xs flex-1"
                      placeholder="Batch # (e.g. 48)"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Kode Supplier (2 Huruf)</label>
                  <Input
                    maxLength={2}
                    value={genSupplier}
                    onChange={(e) => setGenSupplier(e.target.value.toUpperCase())}
                    className="mt-1 h-9 text-xs font-mono uppercase"
                    placeholder="PW / KW / MJ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-border">
                <div>
                  <label className="font-semibold text-foreground">Total Netto Bahan (KG)</label>
                  <Input
                    type="number"
                    value={genNetWeight}
                    onChange={(e) => setGenNetWeight(Number(e.target.value))}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Ukuran Kemasan per Sak (KG)</label>
                  <Input
                    type="number"
                    value={genPackSize}
                    onChange={(e) => setGenPackSize(Number(e.target.value))}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Toleransi Susut / Loss (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={genLossTolerance}
                    onChange={(e) => setGenLossTolerance(Number(e.target.value))}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Nomor Seri Awal</label>
                  <Input
                    type="number"
                    value={genStartSeq}
                    onChange={(e) => setGenStartSeq(Number(e.target.value))}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Calculated Summary Banner */}
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-emerald-800 font-medium">Prefix Kode Batch:</span>{" "}
                  <span className="font-mono font-bold text-emerald-950 text-sm">{batchPrefix}</span>
                  <span className="text-emerald-700 mx-2">&bull;</span>
                  <span className="text-emerald-800 font-medium">Rentang Nomor:</span>{" "}
                  <span className="font-mono font-bold text-emerald-950">
                    {String(genStartSeq).padStart(3, "0")} s/d {String(genStartSeq + calculatedBags - 1).padStart(3, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-800 font-medium">Total Label Otomatis:</span>
                  <span className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs">
                    {calculatedBags} Karung / Stiker
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Screen Preview */}
          <div className="print:hidden space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Pratinjau Stiker Fisik (Menampilkan 12 label pertama dari {generatedSerials.length} total sak):
              </span>
              <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <Printer className="w-3.5 h-3.5" />
                Cetak Lembar Stiker
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generatedSerials.slice(0, 12).map((serial, idx) => (
                <div
                  key={serial}
                  className="p-3.5 rounded-lg border-2 border-gray-800 bg-white shadow-sm text-black font-sans relative"
                >
                  <div className="flex items-start justify-between border-b border-gray-300 pb-2 mb-2">
                    <div>
                      <div className="font-bold text-[11px] uppercase tracking-wider text-gray-900">
                        CV. MANNA / PT MANNA
                      </div>
                      <div className="text-[10px] text-gray-600">Kulon Progo - D.I. Yogyakarta</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-200">
                        {genType === "O" ? "ORGANIK EU" : "NATURAL"}
                      </span>
                    </div>
                  </div>

                  <div className="text-center my-2">
                    <h3 className="font-bold text-xs text-gray-900">{genProduct}</h3>
                    <div className="text-[10px] text-gray-600">
                      Berat Bersih / Net Weight: <span className="font-bold text-black">{genPackSize} KG</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-gray-50 p-2 rounded border border-gray-200">
                    <QRCodeSVG value={serial} size={64} />
                    <div className="flex-1 text-right">
                      <div className="text-[9px] text-gray-500 uppercase">Kode Batch Telusur</div>
                      <div className="font-mono font-bold text-sm tracking-wider text-black">{serial}</div>
                      <div className="text-[9px] text-gray-500 mt-1">Prod: {genProdDate}</div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-[9px] text-gray-600">
                    <span>Halal ID: ID3411000...</span>
                    <span>Sak #{genStartSeq + idx}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Print Sheet View (Formats strictly for Print / Stiker Sheets) */}
          <div className="hidden print:block font-sans text-black p-0">
            <div className="grid grid-cols-2 gap-4">
              {generatedSerials.map((serial, idx) => (
                <div
                  key={serial}
                  className="p-4 border-2 border-black rounded bg-white text-black page-break-inside-avoid mb-4"
                  style={{ minHeight: "220px" }}
                >
                  <div className="flex items-start justify-between border-b border-black pb-1 mb-2">
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider">
                        CV. MANNA / PT MANNA JAYA MAKMUR
                      </div>
                      <div className="text-[9px] text-gray-700">Kulon Progo - D.I. Yogyakarta, Indonesia</div>
                    </div>
                    <div className="border border-black px-1.5 py-0.5 font-bold text-[9px]">
                      {genType === "O" ? "ORGANIC EU / USDA" : "NATURAL"}
                    </div>
                  </div>

                  <div className="text-center my-2">
                    <h3 className="font-bold text-sm uppercase">{genProduct}</h3>
                    <div className="text-xs font-semibold">
                      BERAT BERSIH / NET WEIGHT: <strong>{genPackSize} KG</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border border-black p-2 my-2 bg-gray-50">
                    <QRCodeSVG value={serial} size={70} />
                    <div className="flex-1 text-right">
                      <div className="text-[9px] text-gray-600">KODE BATCH (TRACEABILITY)</div>
                      <div className="font-mono font-bold text-base tracking-wider text-black">{serial}</div>
                      <div className="text-[9px] text-gray-600 mt-1">
                        Tgl Produksi: {genProdDate}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[8px] text-gray-700 pt-1">
                    <span>Sertifikasi Halal Indonesia & Organik</span>
                    <span>No. Sak: #{genStartSeq + idx}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
