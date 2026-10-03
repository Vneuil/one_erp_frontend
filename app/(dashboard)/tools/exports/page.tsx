"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Building,
  CheckCircle2,
  FileText,
  Loader2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCsv } from "@/lib/utils/csv";
import { collaborationApi } from "@/lib/api/collaboration";
import { useAppStore } from "@/stores/app-store";

interface ExportDataset {
  id: string;
  datasetName: string;
  module: string;
  title: string;
  description: string;
  defaultFormat: "Excel (.xlsx)" | "PDF Document" | "CSV Data";
}

const datasets: ExportDataset[] = [
  {
    id: "EXP-01",
    datasetName: "sales_orders",
    module: "Sales & CRM",
    title: "Rekapitulasi Pesanan Penjualan Omnichannel & POS",
    description: "Semua data transaksi dari TikTok Shop, Shopee Mall, POS Kasir, dan B2B Quotations.",
    defaultFormat: "Excel (.xlsx)",
  },
  {
    id: "EXP-02",
    datasetName: "journal_entries",
    module: "Finance & Accounting",
    title: "Buku Jurnal Umum & Neraca Saldo (Trial Balance)",
    description: "Seluruh entri debit-kredit akuntansi, COA, dan rekonsiliasi kas bank.",
    defaultFormat: "Excel (.xlsx)",
  },
  {
    id: "EXP-03",
    datasetName: "inventory_stock",
    module: "Inventory & WMS",
    title: "Laporan Saldo Stok Fisik & Kartu Mutasi Multi-Gudang",
    description: "Data kuantitas on-hand, safety stock, nilai persediaan, dan pergerakan barang.",
    defaultFormat: "Excel (.xlsx)",
  },
  {
    id: "EXP-04",
    datasetName: "employees",
    module: "Human Resources (HRM)",
    title: "Rekapitulasi Absensi, Lembur & File Transfer Payroll BCA",
    description: "Presensi GPS, lembur terverifikasi, potongan PPh 21, dan take-home pay.",
    defaultFormat: "Excel (.xlsx)",
  },
  {
    id: "EXP-05",
    datasetName: "purchase_orders",
    module: "Procurement",
    title: "Daftar Purchase Order & Faktur Tagihan Vendor (AP)",
    description: "Riwayat pengadaan bahan baku, penerimaan barang (GR), dan jadwal jatuh tempo hutang.",
    defaultFormat: "Excel (.xlsx)",
  },
  {
    id: "EXP-06",
    datasetName: "fixed_assets",
    module: "Manufacturing & Assets",
    title: "Laporan Pemakaian Bahan Baku (BOM) & Buku Depresiasi Aset",
    description: "Konsumsi material produksi SPK dan nilai buku aktiva tetap.",
    defaultFormat: "Excel (.xlsx)",
  },
];

export default function ExportCenterPage() {
  const { currentUser } = useAppStore();
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleDownload = async (dataset: ExportDataset) => {
    setDownloadingId(dataset.id);
    setNotice(null);
    try {
      const format = dataset.defaultFormat === "Excel (.xlsx)" ? "excel" : "csv";
      const jobRes = await collaborationApi.createExportJob({
        datasetName: dataset.datasetName,
        format,
        requestedBy: currentUser.name,
      });
      await collaborationApi.runExportJob(jobRes.data.id);
      const downloadRes = await collaborationApi.downloadExportJob(jobRes.data.id);

      const blob = new Blob([downloadRes.data.content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${dataset.id}-${dataset.module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // No placeholder file: an export either contains the real data or does not exist.
      setNotice(err instanceof Error ? err.message : "Ekspor gagal. Coba lagi.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-brand-primary" />
            <span>Pusat Ekspor Data Perusahaan (Central Export Center)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Unduh rekapitulasi data lintas seluruh 10 modul sistem ke format Excel (.xlsx), CSV, atau PDF terstandar audit.
          </p>
        </div>
      </div>

      {notice && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {notice}
        </div>
      )}

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((dataset) => (
          <Card key={dataset.id} className="border-border shadow-xs hover:border-brand-primary/40 transition-all flex flex-col justify-between text-left">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-tint text-brand-primary border border-brand-indigo/20">
                  {dataset.module}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-bold text-foreground leading-snug">{dataset.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {dataset.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">{dataset.defaultFormat}</span>
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => handleDownload(dataset)}
                  disabled={downloadingId === dataset.id}
                  className="h-7 text-xs font-bold gap-1.5 shadow-2xs"
                >
                  {downloadingId === dataset.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3" />
                      <span>Ekspor</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
