"use client";

import * as React from "react";
import { Download, PackagePlus, PackageMinus, AlertTriangle, Printer, Layers, FileSpreadsheet, CheckCircle2, ShieldCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { downloadCsv } from "@/lib/utils/csv";
import { inventoryApi, WarehouseItem, MovementItem } from "@/lib/api/inventory";
import { productsApi, ProductItem } from "@/lib/api/products";
import { useAppStore } from "@/stores/app-store";

interface StockMovementRow {
  id: string;
  timestamp: string;
  dateOnly: string;
  sku: string;
  productName: string;
  productId: string;
  movementType: string;
  rawType: string;
  refDocument: string;
  batchNo: string;
  warehouse: string;
  warehouseId: string;
  qtyIn: number;
  qtyOut: number;
  qtyReject: number;
  balanceAfter: number;
  operator: string;
}

const movementTypeLabels: Record<string, string> = {
  in: "Masuk (Inbound)",
  out: "Keluar (Outbound / Pemakaian)",
  adjustment: "Koreksi / Opname",
  transfer_in: "Transfer Masuk",
  transfer_out: "Transfer Keluar",
  reject: "Reject Kemasan (Rusak/Cacat)",
};

export default function StockMovementsPage() {
  const { currentUser } = useAppStore();
  const [rawMovements, setRawMovements] = React.useState<MovementItem[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);

  // View state: "card" (Kartu Stok KSB per Item) or "ledger" (Semua Mutasi Global)
  const [viewMode, setViewMode] = React.useState<"card" | "ledger">("card");
  const [selectedProductId, setSelectedProductId] = React.useState<string>("");
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // Dialog state
  const [dialogMode, setDialogMode] = React.useState<"in" | "out" | "reject" | null>(null);
  const [formProductId, setFormProductId] = React.useState("");
  const [formWarehouseId, setFormWarehouseId] = React.useState("");
  const [formQuantity, setFormQuantity] = React.useState(1);
  const [formReason, setFormReason] = React.useState("");
  const [formReference, setFormReference] = React.useState("");
  const [formBatchNo, setFormBatchNo] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  const fetchMovements = React.useCallback(() => {
    inventoryApi
      .listMovements({ perPage: 200 })
      .then((res) => {
        setRawMovements(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load movements", err);
        setLoadError("Gagal memuat data mutasi stok dari server.");
      });
  }, []);

  React.useEffect(() => {
    fetchMovements();
    productsApi
      .list({ perPage: 200 })
      .then((res) => {
        const list = res.data || [];
        setProducts(list);
        if (list.length > 0) setSelectedProductId((prev) => prev || list[0].id);
      })
      .catch((err) => console.warn("Failed to load products", err));

    inventoryApi
      .listWarehouses({ perPage: 100 })
      .then((res) => {
        const list = res.data || [];
        setWarehouses(list);
        if (list.length > 0) setSelectedWarehouseId((prev) => prev || list[0].id);
      })
      .catch((err) => console.warn("Failed to load warehouses", err));
  }, [fetchMovements]);

  // Transform raw movements to formatted table rows
  const allMovementRows: StockMovementRow[] = React.useMemo(() => {
    return rawMovements.map((m) => {
      const isReject = m.type === "reject";
      const isIn = m.quantity > 0 && !isReject;
      const isOut = m.quantity < 0 && !isReject;

      const dateStr = m.createdAt ? m.createdAt.slice(0, 10) : "-";

      return {
        id: m.id,
        timestamp: m.createdAt || "-",
        dateOnly: dateStr,
        sku: m.productSku,
        productName: m.productName,
        productId: m.productId,
        movementType: movementTypeLabels[m.type] || m.type,
        rawType: m.type,
        refDocument: m.reference || "-",
        batchNo: m.batchNo || "-",
        warehouse: m.warehouseName,
        warehouseId: m.warehouseId,
        qtyIn: isIn ? m.quantity : 0,
        qtyOut: isOut ? Math.abs(m.quantity) : 0,
        qtyReject: isReject ? Math.abs(m.quantity) : 0,
        balanceAfter: m.balance,
        operator: m.createdBy || "-",
      };
    });
  }, [rawMovements]);

  // Movements filtered for specific Kartu Stok (KSB) per Product & Warehouse
  const ksbRows: StockMovementRow[] = React.useMemo(() => {
    return allMovementRows.filter((m) => {
      const matchProduct = !selectedProductId || m.productId === selectedProductId;
      const matchWarehouse = !selectedWarehouseId || m.warehouseId === selectedWarehouseId;
      return matchProduct && matchWarehouse;
    });
  }, [allMovementRows, selectedProductId, selectedWarehouseId]);

  // Determine KSB document classification
  const isPackaging = selectedProduct?.category?.toLowerCase().includes("kemas") || selectedProduct?.unit?.toLowerCase() === "pcs";
  const isBrontol = selectedProduct?.name?.toLowerCase().includes("brontol") || selectedProduct?.sku?.toLowerCase().includes("brt") || selectedProduct?.category?.toLowerCase().includes("brontol");
  const docCode = isBrontol ? "KSB-BRONTOL" : isPackaging ? "KSB-BK" : "KSB-BB";
  const docTitle = isBrontol ? "KARTU STOK BRONTOL (KSB-BRONTOL)" : isPackaging ? "KARTU STOK BARANG KEMAS (KSB)" : "KARTU STOK BAHAN BAKU (KSB)";

  const openDialog = (mode: "in" | "out" | "reject") => {
    setDialogMode(mode);
    setFormProductId(selectedProductId || (products[0]?.id || ""));
    setFormWarehouseId(selectedWarehouseId || (warehouses[0]?.id || ""));
    setFormQuantity(1);
    setFormReason(
      mode === "reject"
        ? "Reject kemasan cacat/rusak di packing"
        : mode === "out"
        ? "Pemakaian ke lantai produksi"
        : "Penerimaan masuk gudang"
    );
    setFormReference("");
    setFormBatchNo("");
    setFormError(null);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId || !formWarehouseId || formQuantity <= 0) return;
    setIsSubmitting(true);
    setFormError(null);

    const isNegative = dialogMode === "out" || dialogMode === "reject";
    const qty = isNegative ? -Math.abs(formQuantity) : Math.abs(formQuantity);

    try {
      await inventoryApi.adjustStock({
        productId: formProductId,
        warehouseId: formWarehouseId,
        quantity: qty,
        type: dialogMode === "reject" ? "reject" : undefined,
        reason: formReason.trim(),
        reference: formReference.trim(),
        batchNo: formBatchNo.trim(),
        createdBy: currentUser.name,
      });

      setNotice(
        dialogMode === "reject"
          ? "Pencatatan reject kemasan berhasil dicatat ke Kartu Stok."
          : `Mutasi stok ${dialogMode === "out" ? "keluar" : "masuk"} berhasil dicatat.`
      );
      setDialogMode(null);
      fetchMovements();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan transaksi stok.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cetak Dokumen Resmi Kartu Stok (KSB PDF View)
  const handlePrintKSB = () => {
    if (!selectedProduct) {
      alert("Pilih produk terlebih dahulu untuk mencetak Kartu Stok.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup pada browser Anda.");
      return;
    }

    const rowsHtml = ksbRows.map((r, idx) => `
      <tr>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #333; padding: 6px; font-family: monospace;">${r.dateOnly}</td>
        <td style="border: 1px solid #333; padding: 6px;">${r.refDocument}</td>
        <td style="border: 1px solid #333; padding: 6px; font-family: monospace; font-size: 11px;">${r.batchNo !== "-" ? r.batchNo : ""}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: right; color: #047857; font-weight: bold;">
          ${r.qtyIn > 0 ? r.qtyIn.toLocaleString("id-ID") : "-"}
        </td>
        <td style="border: 1px solid #333; padding: 6px; text-align: right; color: #b91c1c;">
          ${r.qtyOut > 0 ? r.qtyOut.toLocaleString("id-ID") : "-"}
        </td>
        ${isPackaging ? `
          <td style="border: 1px solid #333; padding: 6px; text-align: right; color: #d97706; font-weight: bold;">
            ${r.qtyReject > 0 ? r.qtyReject.toLocaleString("id-ID") : "-"}
          </td>
        ` : ""}
        <td style="border: 1px solid #333; padding: 6px; text-align: right; font-weight: bold; background: #f8fafc;">
          ${r.balanceAfter.toLocaleString("id-ID")} ${selectedProduct.unit}
        </td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center; font-size: 11px;">${r.operator}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle} - ${selectedProduct.sku}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; color: #1e293b; line-height: 1.3; }
            .header-table { width: 100%; border: 2px solid #000; border-collapse: collapse; margin-bottom: 15px; }
            .header-table td { border: 1px solid #000; padding: 6px 10px; font-size: 11px; }
            .ksb-title { font-size: 15px; font-weight: bold; text-align: center; padding: 8px 0; background: #f8fafc; }
            .doc-code { font-weight: bold; font-size: 12px; text-align: right; }
            table.ksb-data { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.ksb-data th { border: 1px solid #000; background: #e2e8f0; padding: 6px; font-size: 11px; text-align: center; }
            table.ksb-data td { font-size: 11px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
            .sig-box { width: 180px; border-top: 1px solid #000; padding-top: 4px; margin-top: 50px; font-weight: bold; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 25%; font-weight: bold; font-size: 13px;">PT MANNA JAYA MAKMUR</td>
              <td class="ksb-title">${docTitle}</td>
              <td class="doc-code" style="width: 25%;">KODE DOKUMEN: ${docCode}</td>
            </tr>
          </table>

          <table style="width: 100%; margin-bottom: 12px; font-size: 11px; border-collapse: collapse;">
            <tr>
              <td style="width: 15%; padding: 3px 0;"><strong>Nama Barang:</strong></td>
              <td style="width: 35%; padding: 3px 0; font-size: 12px;"><strong>${selectedProduct.name}</strong></td>
              <td style="width: 15%; padding: 3px 0;"><strong>Gudang Penyimpanan:</strong></td>
              <td style="width: 35%; padding: 3px 0;">${selectedWarehouse?.name || "Semua Gudang"}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0;"><strong>Kode SKU / Kemas:</strong></td>
              <td style="padding: 3px 0; font-family: monospace;">${selectedProduct.sku}</td>
              <td style="padding: 3px 0;"><strong>Satuan (UoM):</strong></td>
              <td style="padding: 3px 0;">${selectedProduct.unit}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0;"><strong>Kategori:</strong></td>
              <td style="padding: 3px 0;">${selectedProduct.category}</td>
              <td style="padding: 3px 0;"><strong>Status Sertifikasi:</strong></td>
              <td style="padding: 3px 0; font-weight: bold;">
                ${isPackaging ? "Food Grade (Pass QC Kemas)" : `HALAL: YA  |  KOSHER: YA  |  ORGANIK: ${selectedProduct.organicType || "Natural"}`}
              </td>
            </tr>
          </table>

          <table class="ksb-data">
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th style="width: 80px;">Tanggal</th>
                <th>Referensi Dokumen / Keterangan</th>
                <th style="width: 90px;">Kode Batch</th>
                <th style="width: 80px;">MASUK (+)<br/><span style="font-size: 9px;">${selectedProduct.unit}</span></th>
                <th style="width: 80px;">KELUAR (-)<br/><span style="font-size: 9px;">${selectedProduct.unit}</span></th>
                ${isPackaging ? `
                  <th style="width: 80px;">REJECT (-)<br/><span style="font-size: 9px;">PCS</span></th>
                ` : ""}
                <th style="width: 100px;">SALDO AKHIR<br/><span style="font-size: 9px;">${selectedProduct.unit}</span></th>
                <th style="width: 70px;">PIC</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="${isPackaging ? 9 : 8}" style="text-align: center; padding: 15px; border: 1px solid #333;">Belum ada mutasi stok tercatat untuk produk ini.</td></tr>`}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div style="font-size: 11px; color: #475569;">Dibuat Oleh (Admin Gudang)</div>
              <div class="sig-box">( Mbak Sari )</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #475569;">Diverifikasi Oleh (Spv Gudang / QC)</div>
              <div class="sig-box">( Mas Mario / Pak Adin )</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    if (!selectedProduct) return;
    const headers = isPackaging
      ? ["No", "Tanggal", "Referensi Dokumen", "Kode Batch", "Masuk (Pcs)", "Keluar (Pcs)", "Reject (Pcs)", "Saldo Akhir (Pcs)", "PIC"]
      : ["No", "Tanggal", "Referensi Dokumen", "Kode Batch", `Masuk (${selectedProduct.unit})`, `Keluar (${selectedProduct.unit})`, `Saldo Akhir (${selectedProduct.unit})`, "PIC"];

    const rows = ksbRows.map((r, i) =>
      isPackaging
        ? [i + 1, r.dateOnly, r.refDocument, r.batchNo, r.qtyIn, r.qtyOut, r.qtyReject, r.balanceAfter, r.operator]
        : [i + 1, r.dateOnly, r.refDocument, r.batchNo, r.qtyIn, r.qtyOut, r.balanceAfter, r.operator]
    );

    downloadCsv(`Kartu_Stok_${selectedProduct.sku}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // Columns for the KSB data table
  const ksbColumns: Column<StockMovementRow>[] = [
    {
      key: "dateOnly",
      header: "Tanggal",
      sortable: true,
      render: (m) => <span className="font-mono text-xs text-slate-700">{m.dateOnly}</span>,
    },
    {
      key: "refDocument",
      header: "Referensi Dokumen / Alasan",
      render: (m) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-900">{m.refDocument}</span>
          <span className="block text-[11px] text-muted-foreground">{m.movementType}</span>
        </div>
      ),
    },
    {
      key: "batchNo",
      header: "No. Batch",
      render: (m) => (
        <span className="font-mono text-xs font-bold text-brand-indigo">
          {m.batchNo !== "-" ? m.batchNo : "-"}
        </span>
      ),
    },
    {
      key: "qtyIn",
      header: "Masuk (+)",
      align: "right",
      render: (m) => (
        <span className="text-xs font-bold text-emerald-600">
          {m.qtyIn > 0 ? `+${m.qtyIn.toLocaleString("id-ID")}` : "-"}
        </span>
      ),
    },
    {
      key: "qtyOut",
      header: "Keluar (-)",
      align: "right",
      render: (m) => (
        <span className="text-xs font-bold text-rose-600">
          {m.qtyOut > 0 ? `-${m.qtyOut.toLocaleString("id-ID")}` : "-"}
        </span>
      ),
    },
    ...(isPackaging
      ? [
          {
            key: "qtyReject" as keyof StockMovementRow,
            header: "Reject Kemas",
            align: "right" as const,
            render: (m: StockMovementRow) => (
              <span className="text-xs font-bold text-amber-600">
                {m.qtyReject > 0 ? `-${m.qtyReject.toLocaleString("id-ID")}` : "-"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "balanceAfter",
      header: "Saldo Akhir",
      align: "right",
      render: (m) => (
        <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
          {m.balanceAfter.toLocaleString("id-ID")} {selectedProduct?.unit}
        </span>
      ),
    },
    {
      key: "operator",
      header: "PIC",
      render: (m) => <span className="text-xs text-slate-600">{m.operator}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kartu Stok & Buku Mutasi (KSB-BB & KSB-BK)"
        description="Buku mutasi stok fisik berurutan dengan pelacakan kode batch traceability, pemisahan reject kemasan, dan filter sertifikasi audit."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
            onClick={() => openDialog("reject")}
            title="Catat barang kemas yang rusak atau cacat cetak"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Catat Reject Kemas
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
            onClick={() => openDialog("out")}
          >
            <PackageMinus className="h-3.5 w-3.5" /> Pengeluaran Stok
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            onClick={() => openDialog("in")}
          >
            <PackagePlus className="h-3.5 w-3.5" /> Pemasukan Stok
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs text-slate-700"
            onClick={handlePrintKSB}
          >
            <Printer className="h-3.5 w-3.5" /> Cetak KSB (PDF)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5" /> Export KSB
          </Button>
        </div>
      </PageHeader>

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {/* Selector & Filter Card untuk Kartu Stok KSB */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-primary" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pilih Item Kartu Stok (KSB)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Format Dokumen:</span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
              {docCode} ({isPackaging ? "Barang Kemas" : "Bahan Baku"})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Pilih Produk / Bahan</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-1 focus:ring-brand-primary"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Gudang Penyimpanan</label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 font-medium focus:ring-1 focus:ring-brand-primary"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Filter Kategori</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                if (e.target.value !== "all") {
                  const match = products.find((p) => p.category.toLowerCase().includes(e.target.value.toLowerCase()));
                  if (match) setSelectedProductId(match.id);
                }
              }}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 font-medium"
            >
              <option value="all">Semua Kategori</option>
              <option value="bahan">Bahan Baku (Gula / VCO - KSB-BB)</option>
              <option value="kemas">Barang Kemas (Plastik / Box - KSB-BK)</option>
              <option value="brontol">WIP / Brontol (KSB-Brontol)</option>
            </select>
          </div>
        </div>

        {/* Header Metadata KSB sesuai template Excel */}
        {selectedProduct && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-muted-foreground block">Nama Barang:</span>
              <strong className="text-slate-900">{selectedProduct.name}</strong>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Kode / SKU:</span>
              <span className="font-mono font-bold text-brand-primary">{selectedProduct.sku}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Satuan Ukuran:</span>
              <strong className="text-slate-800">{selectedProduct.unit}</strong>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Status Kepatuhan Audit:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-800">
                  {isPackaging ? "Food Grade Pouch" : `Halal, Kosher, ${selectedProduct.organicType || "Natural"}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabel Mutasi Kartu Stok (KSB Table) */}
      <DataTable
        columns={ksbColumns}
        data={ksbRows}
        searchKey="refDocument"
        searchPlaceholder="Cari referensi dokumen, nomor batch, atau PIC..."
      />

      {/* Modal Input Transaksi Stok Cepat */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {dialogMode === "reject" ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : dialogMode === "out" ? (
                <PackageMinus className="h-4 w-4 text-rose-600" />
              ) : (
                <PackagePlus className="h-4 w-4 text-emerald-600" />
              )}
              <span>
                {dialogMode === "reject"
                  ? "Catat Reject Kemasan Rusak/Cacat (KSB-BK)"
                  : dialogMode === "out"
                  ? "Pengeluaran Stok (Stock Out)"
                  : "Penerimaan Stok (Stock In)"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-3.5 text-xs pt-1">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-foreground">Produk / Barang *</label>
              <select
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih produk...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} ({p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Gudang Penyimpanan *</label>
              <select
                value={formWarehouseId}
                onChange={(e) => setFormWarehouseId(e.target.value)}
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

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Jumlah (Qty) *</label>
                <Input
                  type="number"
                  min={1}
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(Number(e.target.value))}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Nomor Batch (Opsional)</label>
                <Input
                  placeholder="Contoh: 26N48PW213"
                  value={formBatchNo}
                  onChange={(e) => setFormBatchNo(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Referensi Dokumen</label>
              <Input
                placeholder={dialogMode === "reject" ? "Contoh: PBPK-002 (Reject Packing)" : dialogMode === "out" ? "Contoh: BPB-2026-051" : "Contoh: LBM-2026-042"}
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Alasan / Catatan Kondisi</label>
              <Input
                placeholder={dialogMode === "reject" ? "Cacat printing kemasan / sobekan seal" : "Keterangan mutasi stok..."}
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogMode(null)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="gradient"
                size="sm"
                disabled={isSubmitting}
                className="h-9 text-xs font-bold"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Mutasi Kartu Stok"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
