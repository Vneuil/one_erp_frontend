"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Printer, FileSpreadsheet, Scale, Info, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { procurementApi, PurchaseOrderItem, GoodsReceiptItem, GoodsReceiptLineInput } from "@/lib/api/procurement";
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { productsApi, ProductItem, isProductActive } from "@/lib/api/products";
import { useAppStore } from "@/stores/app-store";
import { exportLBMToExcel } from "@/lib/utils/export-lbm-excel";
import { printLBMExcelDocument } from "@/lib/utils/print-lbm-excel";

interface GoodsReceipt {
  id: string;
  grNumber: string;
  documentCode?: string;
  poNumber: string;
  vendorName: string;
  receivedDate: string;
  warehouse: string;
  receivedBy: string;
  status: string;
  deliveryNoteNo?: string;
  sugarCondition?: string;
  packageCondition?: string;
}

interface LineWeightEntry {
  productId: string;
  productName: string;
  orderedQty: number;
  remainingQty: number;
  gross: number;
  tare: number;
  net: number;
  bagWeightsText: string;
  adjustment: number;
  adjustmentReason: string;
}

export default function ReceiptsPage() {
  const router = useRouter();
  const { currentUser } = useAppStore();
  const [rawReceipts, setRawReceipts] = React.useState<GoodsReceiptItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrderItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [productMap, setProductMap] = React.useState<Record<string, ProductItem>>({});

  const [poId, setPoId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [deliveryNoteNo, setDeliveryNoteNo] = React.useState("");
  const [plasticTare, setPlasticTare] = React.useState(0.15);
  const [notes, setNotes] = React.useState("");
  const [lineWeights, setLineWeights] = React.useState<Record<string, LineWeightEntry>>({});

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const selectedPo = purchaseOrders.find((po) => po.id === poId);

  const loadReceipts = React.useCallback(() => {
    procurementApi
      .listGoodsReceipts()
      .then((res) => setRawReceipts(res.data || []))
      .catch((err) => (console.error("Failed to load data", err), setLoadError("Gagal memuat data dari server.")));
  }, []);

  React.useEffect(() => {
    procurementApi
      .listPurchaseOrders({ perPage: 100 })
      .then((res) => setPurchaseOrders(res.data || []))
      .catch((err) => console.warn("Failed to load purchase orders", err));

    inventoryApi
      .listWarehouses({ perPage: 50 })
      .then((res) => {
        const list = (res.data || []).filter((w) => w.isActive !== false);
        setWarehouses(list);
        if (list.length > 0) setWarehouseId((prev) => prev || list[0].id);
      })
      .catch((err) => console.warn("Failed to load warehouses", err));

    productsApi
      .list({ perPage: 200 })
      .then((res) => {
        const map: Record<string, ProductItem> = {};
        for (const p of res.data || []) {
          map[p.id] = p;
        }
        setProductMap(map);
      })
      .catch((err) => console.warn("Failed to load products", err));

    loadReceipts();
  }, [loadReceipts]);

  // When PO changes, initialize line weights
  React.useEffect(() => {
    if (!selectedPo) {
      setLineWeights({});
      return;
    }
    const initial: Record<string, LineWeightEntry> = {};
    for (const line of selectedPo.lines) {
      const remaining = line.quantity - line.quantityReceived;
      if (remaining > 0) {
        const prod = productMap[line.productId];
        initial[line.productId] = {
          productId: line.productId,
          productName: prod?.name || `Item SKU: ${line.productId.slice(0, 8)}`,
          orderedQty: line.quantity,
          remainingQty: remaining,
          gross: remaining,
          tare: 0,
          net: remaining,
          bagWeightsText: "",
          adjustment: 0,
          adjustmentReason: "",
        };
      }
    }
    setLineWeights(initial);
  }, [selectedPo, productMap]);

  // Helper when individual bag weights change
  const handleBagWeightsChange = (productId: string, text: string) => {
    const rawTokens = text.split(/[\s,;\n]+/).filter(Boolean);
    const parsed = rawTokens.map((t) => parseFloat(t)).filter((n) => !isNaN(n) && n > 0);
    const sumNet = parsed.reduce((acc, curr) => acc + curr, 0);

    setLineWeights((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      const updatedNet = parsed.length > 0 ? parseFloat((sumNet + current.adjustment).toFixed(2)) : current.net;
      const updatedGross = parseFloat((updatedNet + current.tare).toFixed(2));
      return {
        ...prev,
        [productId]: {
          ...current,
          bagWeightsText: text,
          net: updatedNet,
          gross: updatedGross,
        },
      };
    });
  };

  // Manual adjustment (kg, signed) on top of the per-sak total. Net is recomputed from the sacks.
  const handleAdjustmentChange = (productId: string, patch: { adjustment?: number; adjustmentReason?: string }) => {
    setLineWeights((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      const next = { ...current, ...patch };
      const bags = current.bagWeightsText
        .split(/[\s,;\n]+/)
        .map((t) => parseFloat(t))
        .filter((n) => !isNaN(n) && n > 0);
      if (bags.length > 0 && patch.adjustment !== undefined) {
        const sum = bags.reduce((a, b) => a + b, 0);
        next.net = Math.max(0, parseFloat((sum + next.adjustment).toFixed(2)));
        next.gross = parseFloat((next.net + next.tare).toFixed(2));
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleWeightChange = (productId: string, field: "gross" | "tare" | "net", value: number) => {
    setLineWeights((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      let newGross = current.gross;
      let newTare = current.tare;
      let newNet = current.net;

      if (field === "gross") {
        newGross = value;
        newNet = Math.max(0, parseFloat((newGross - newTare).toFixed(2)));
      } else if (field === "tare") {
        newTare = value;
        newNet = Math.max(0, parseFloat((newGross - newTare).toFixed(2)));
      } else if (field === "net") {
        newNet = value;
        newGross = parseFloat((newNet + newTare).toFixed(2));
      }

      return {
        ...prev,
        [productId]: {
          ...current,
          gross: newGross,
          tare: newTare,
          net: newNet,
        },
      };
    });
  };

  // Cetak Nota Tanda Terima Supplier (Ringkas untuk Supir/Vendor)
  const handlePrintSupplierSlip = (gr: GoodsReceipt) => {
    const raw = rawReceipts?.find((r) => r.id === gr.id);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup untuk mencetak nota.");
      return;
    }

    const linesHtml = (raw?.lines || []).map((l, idx) => {
      const prod = productMap[l.productId];
      const prodName = prod?.name || `Produk #${idx + 1}`;
      const prodSku = prod?.sku || "";
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">
            <strong>${prodName}</strong>
            ${prodSku ? `<div style="font-size: 11px; color: #666; font-family: monospace;">SKU: ${prodSku}</div>` : ""}
          </td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(l.quantityOrderedReference || l.quantityReceived).toLocaleString("id-ID")} kg</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${l.weightGross ? l.weightGross.toLocaleString("id-ID") + " kg" : "-"}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${l.weightTare ? l.weightTare.toLocaleString("id-ID") + " kg" : "-"}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; color: #0f766e;">${l.quantityReceived.toLocaleString("id-ID")} kg</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Nota Tanda Terima Timbangan Supplier - ${gr.grNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; font-size: 13px; color: #1e293b; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 20px; }
            .kop-doc { text-align: right; font-size: 11px; font-weight: bold; color: #0f766e; }
            .title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; color: #0f766e; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            th { border: 1px solid #cbd5e1; background: #f1f5f9; padding: 8px; text-align: left; font-size: 12px; }
            td { font-size: 12px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 50px; text-align: center; }
            .sig-box { border-top: 1px solid #334155; padding-top: 6px; font-weight: bold; margin-top: 60px; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">PT MANNA JAYA MAKMUR</div>
              <div style="font-size: 11px; color: #64748b;">Pengolahan Gula Kelapa & VCO Terpadu — Inbound Receiving Log</div>
            </div>
            <div class="kop-doc">
              <div style="font-size: 13px;">FORM: ${gr.documentCode || "GD-007-LBM"}</div>
              <div>NOTA PENERIMAAN & TIMBANGAN RESMI</div>
            </div>
          </div>

          <div class="meta">
            <div>
              <div><strong>No. LBM / GRN:</strong> <span style="font-family: monospace; font-weight: bold;">${gr.grNumber}</span></div>
              <div><strong>No. Surat Jalan:</strong> ${gr.deliveryNoteNo || "-"}</div>
              <div><strong>No. Referensi PO:</strong> ${gr.poNumber}</div>
              <div><strong>Tanggal Kedatangan:</strong> ${gr.receivedDate}</div>
            </div>
            <div>
              <div><strong>Supplier / Petani:</strong> <span style="font-weight: bold;">${gr.vendorName}</span></div>
              <div><strong>Gudang Penerima:</strong> ${gr.warehouse}</div>
              <div><strong>Kondisi Fisik Gula:</strong> ${gr.sugarCondition || "Lihat hasil QC"}</div>
              <div><strong>Kondisi Karung/Kemasan:</strong> ${gr.packageCondition || "Lihat hasil QC"}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">No</th>
                <th>Item Bahan Baku</th>
                <th style="text-align: right; width: 110px;">Qty Surat Jalan</th>
                <th style="text-align: right; width: 100px;">Bruto Timbang</th>
                <th style="text-align: right; width: 90px;">Tara Wadah</th>
                <th style="text-align: right; width: 110px;">Netto Aktual (kg)</th>
              </tr>
            </thead>
            <tbody>
              ${linesHtml || '<tr><td colspan="6" style="padding: 12px; text-align: center;">Tidak ada rincian baris.</td></tr>'}
            </tbody>
          </table>

          <div style="font-size: 11px; color: #475569; background: #fffbeb; border: 1px solid #fef3c7; padding: 8px; border-radius: 4px; margin-bottom: 30px;">
            <strong>Catatan Kepatuhan Finansial:</strong> Berat Netto Aktual pada nota ini merupakan dasar penagihan resmi (Invoice Purchase) dan pencatatan kartu stok gudang. Harga nominal dilindungi oleh ketentuan Confidential Pricing.
          </div>

          <div class="signatures">
            <div>
              <div style="font-size: 11px; color: #64748b;">Pengirim / Supir Vendor</div>
              <div class="sig-box">( ${gr.vendorName} )</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #64748b;">Petugas Timbang & Gudang</div>
              <div class="sig-box">( ${gr.receivedBy || "Mas Abel"} )</div>
            </div>
            <div>
              <div style="font-size: 11px; color: #64748b;">Admin Penerimaan / QC Inbound</div>
              <div class="sig-box">( Mbak Sari / Pak Adin )</div>
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

  // Export Excel (.xlsx) sesuai template LAPORAN BARANG MASUK (LBM).xlsx
  const handleExportExcel = async (gr: GoodsReceipt) => {
    const raw = rawReceipts?.find((r) => r.id === gr.id);
    if (!raw) return;

    try {
      const exportLines = (raw.lines || []).map((l) => {
        const prod = productMap[l.productId];
        const net = l.weightNet ?? l.quantityReceived ?? 0;
        const pSize = l.packageSize && l.packageSize > 0 ? l.packageSize : 10;

        let entries = l.bagEntries || [];
        if (entries.length === 0 && l.bagWeights) {
          const bagTokens = l.bagWeights
            .split(/[\s,;\n]+/)
            .map((t) => parseFloat(t))
            .filter((n) => !isNaN(n) && n > 0);
          entries = bagTokens.map((w, idx) => ({
            id: `legacy-${idx}`,
            rowNumber: idx + 1,
            weightActual: w,
          }));
        }

        return {
          lineId: l.id,
          productId: l.productId,
          productName: prod?.name || `Produk #${l.productId.slice(0, 8)}`,
          quantityOrderedRef: l.quantityOrderedReference || net,
          weightGross: l.weightGross ?? net,
          weightTare: l.weightTare ?? 0,
          weightNet: net,
          packageSize: pSize,
          bagCount: entries.length > 0 ? entries.length : Math.ceil(net / pSize),
          entries,
        };
      });

      await exportLBMToExcel({
        receipt: raw,
        lines: exportLines,
        vendorName: gr.vendorName,
        warehouseName: gr.warehouse,
      });
      setNotice(`Berkas Excel LBM (${gr.grNumber}) berhasil diunduh.`);
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Gagal mengekspor berkas Excel LBM.");
    }
  };

  // Cetak Dokumen Lengkap LBM (GDG-001-LBM) sesuai format Excel yang ter-generate
  const handlePrintDetailedLBM = (gr: GoodsReceipt) => {
    const raw = rawReceipts?.find((r) => r.id === gr.id);
    if (!raw) return;

    const exportLines = (raw.lines || []).map((l) => {
      const prod = productMap[l.productId];
      const net = l.weightNet ?? l.quantityReceived ?? 0;
      const pSize = l.packageSize && l.packageSize > 0 ? l.packageSize : 10;

      let entries = l.bagEntries || [];
      if (entries.length === 0 && l.bagWeights) {
        const bagTokens = l.bagWeights
          .split(/[\s,;\n]+/)
          .map((t) => parseFloat(t))
          .filter((n) => !isNaN(n) && n > 0);
        entries = bagTokens.map((w, idx) => ({
          id: `legacy-${idx}`,
          rowNumber: idx + 1,
          weightActual: w,
        }));
      }

      return {
        lineId: l.id,
        productId: l.productId,
        productName: prod?.name || `Produk #${l.productId.slice(0, 8)}`,
        quantityOrderedRef: l.quantityOrderedReference || net,
        weightGross: l.weightGross ?? net,
        weightTare: l.weightTare ?? 0,
        weightNet: net,
        packageSize: pSize,
        bagCount: entries.length > 0 ? entries.length : Math.ceil(net / pSize),
        entries,
      };
    });

    printLBMExcelDocument({
      receipt: raw,
      lines: exportLines,
      vendorName: gr.vendorName,
      warehouseName: gr.warehouse,
    });
  };

  const receipts: GoodsReceipt[] = React.useMemo(() => {
    if (rawReceipts === null) return [];
    return rawReceipts
      .filter((gr) => {
        if (!gr.lines || gr.lines.length === 0) return true;
        if (Object.keys(productMap).length === 0) return true;
        return gr.lines.every((l) => {
          if (!l.productId) return true;
          const p = productMap[l.productId];
          return p ? isProductActive(p) : false;
        });
      })
      .map((gr) => {
        const po = purchaseOrders.find((p) => p.id === gr.purchaseOrderId);
        const wh = warehouses.find((w) => w.id === gr.warehouseId);
        return {
          id: gr.id,
          grNumber: gr.receiptNo,
          documentCode: gr.documentCode || "GDG-001-LBM",
          poNumber: po?.orderNo || gr.purchaseOrderId,
          vendorName: po?.supplierName || "-",
          receivedDate: gr.receivedDate,
          warehouse: wh?.name || "-",
          receivedBy: gr.receivedBy || "-",
          status: gr.status,
          deliveryNoteNo: gr.deliveryNoteNo,
          sugarCondition: gr.sugarCondition,
          packageCondition: gr.packageCondition,
        };
      });
  }, [rawReceipts, purchaseOrders, warehouses, productMap]);

  const receivablePOs = purchaseOrders.filter(
    (po) =>
      po.status !== "cancelled" &&
      po.status !== "draft" &&
      po.lines.some((l) => l.quantity - l.quantityReceived > 0)
  );

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo || !warehouseId || isSubmitting) return;

    const remainingLines: GoodsReceiptLineInput[] = [];
    for (const [prodId, data] of Object.entries(lineWeights)) {
      if (data.net > 0) {
        remainingLines.push({
          productId: prodId,
          quantityReceived: data.net,
          weightGross: data.gross,
          weightTare: data.tare,
          weightNet: data.net,
          bagWeights: data.bagWeightsText,
          weightAdjustment: data.adjustment || undefined,
          adjustmentReason: data.adjustment ? data.adjustmentReason.trim() : undefined,
        });
      }
    }

    const missingReason = Object.values(lineWeights).find((l) => l.adjustment !== 0 && !l.adjustmentReason.trim());
    if (missingReason) {
      setFormError(`Adjustment manual untuk ${missingReason.productName} wajib disertai alasan (untuk audit organik).`);
      return;
    }

    if (remainingLines.length === 0) {
      setFormError("Pastikan minimal ada satu baris barang dengan berat Netto aktual > 0 kg.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await procurementApi.createGoodsReceipt({
        purchaseOrderId: selectedPo.id,
        warehouseId,
        deliveryNoteNo: deliveryNoteNo.trim(),
        plasticTare,
        notes: notes.trim(),
        lines: remainingLines,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal mencatat penerimaan barang.");
      }

      loadReceipts();
      procurementApi
        .listPurchaseOrders({ perPage: 100 })
        .then((resp) => setPurchaseOrders(resp.data || []))
        .catch((err) => console.warn("Failed to refresh purchase orders", err));

      setIsNewOpen(false);
      setPoId("");
      setDeliveryNoteNo("");
      setNotes("");
      router.push(`/procurement/receipts/${res.data.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mencatat penerimaan barang. Periksa kembali isian form.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<GoodsReceipt>[] = [
    {
      key: "grNumber",
      header: "No. LBM / GRN",
      sortable: true,
      render: (gr) => (
        <div>
          <span className="font-mono text-xs font-bold text-brand-primary">{gr.grNumber}</span>
          <span className="block text-[10px] font-mono text-muted-foreground">{gr.documentCode || "GDG-001-LBM"}</span>
        </div>
      ),
    },
    {
      key: "poNumber",
      header: "Referensi PO & Surat Jalan",
      render: (gr) => (
        <div>
          <span className="font-mono text-xs text-brand-indigo">{gr.poNumber}</span>
          {gr.deliveryNoteNo && (
            <span className="block text-[11px] text-muted-foreground">SJ: {gr.deliveryNoteNo}</span>
          )}
        </div>
      ),
    },
    {
      key: "vendorName",
      header: "Vendor",
      sortable: true,
      render: (gr) => <span className="text-xs font-semibold text-foreground">{gr.vendorName}</span>,
    },
    {
      key: "receivedDate",
      header: "Tgl Kedatangan",
      render: (gr) => <span className="text-xs text-muted-foreground">{gr.receivedDate}</span>,
    },
    {
      key: "warehouse",
      header: "Gudang",
      render: (gr) => <span className="text-xs text-foreground font-medium">{gr.warehouse}</span>,
    },
    {
      key: "status",
      header: "Status QC",
      render: (gr) => <StatusBadge status={gr.status} />,
    },
    {
      key: "actions",
      header: "Dokumen & Aksi",
      align: "right",
      render: (gr) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-indigo-700 hover:text-indigo-800 border-indigo-200 hover:bg-indigo-50"
            onClick={() => router.push(`/procurement/receipts/${gr.id}`)}
            title="Buka Halaman Detail LBM & Timbangan Karung"
          >
            <Eye className="h-3 w-3" /> Detail LBM
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:bg-emerald-50"
            onClick={() => handleExportExcel(gr)}
            title="Download Berkas Excel LBM (.xlsx) Sesuai Format GDG-001"
          >
            <FileSpreadsheet className="h-3 w-3" /> Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-slate-700 hover:text-brand-primary"
            onClick={() => handlePrintSupplierSlip(gr)}
            title="Cetak Nota Tanda Terima untuk Supir/Vendor"
          >
            <Printer className="h-3 w-3" /> Nota Supplier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 text-slate-700 hover:text-brand-primary"
            onClick={() => handlePrintDetailedLBM(gr)}
            title="Cetak Laporan Resmi LBM GDG-001 sesuai format Excel referensi"
          >
            <Printer className="h-3 w-3" /> Cetak LBM
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Penerimaan Barang"
        description="Laporan Barang Masuk (GDG-001-LBM): timbangan per sak, verifikasi surat jalan, cetak laporan resmi format Excel, dan tanda terima."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => {
            setFormError(null);
            setIsNewOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Catat Penerimaan Barang (LBM)
        </Button>
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

      <DataTable
        columns={columns}
        data={receipts}
        searchKey="grNumber"
        searchPlaceholder="Cari nomor LBM, PO, atau vendor..."
      />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Scale className="h-5 w-5 text-brand-primary" />
              Pencatatan Laporan Barang Masuk (GD-007-LBM)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReceive} className="space-y-4 pt-1">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Referensi Pesanan Pembelian (PO)</label>
                <select
                  value={poId}
                  onChange={(e) => setPoId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
                >
                  <option value="">Pilih Pesanan Pembelian yang masih aktif...</option>
                  {receivablePOs.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.orderNo} — {po.supplierName}
                    </option>
                  ))}
                </select>
                {receivablePOs.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Tidak ada PO yang memiliki sisa barang.</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Vendor / Petani Pengirim</label>
                <Input
                  value={selectedPo?.supplierName || ""}
                  disabled
                  readOnly
                  placeholder="Otomatis dari PO yang dipilih"
                  className="h-9 text-xs bg-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Nomor Surat Jalan Supplier</label>
                <Input
                  value={deliveryNoteNo}
                  onChange={(e) => setDeliveryNoteNo(e.target.value)}
                  placeholder="Contoh: SJ-2026/XI/089"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Gudang Tujuan Penerimaan</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
                >
                  <option value="">Pilih gudang tujuan...</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 text-[11px] text-muted-foreground bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2">
                Kondisi fisik gula &amp; kemasan dicatat oleh <strong>QC</strong> pada menu Inspeksi QC (target: Penerimaan Barang).
              </div>
            </div>

            {/* Rincian Penimbangan per Baris Produk */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-brand-primary" />
                  Rincian Penimbangan Bahan & Timbangan Karung
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Format Dokumen Standar: <strong>GD-007-LBM</strong>
                </span>
              </div>

              {Object.keys(lineWeights).length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-xs text-muted-foreground">
                  Pilih Pesanan Pembelian di atas untuk memuat daftar bahan yang akan ditimbang.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(lineWeights).map(([prodId, line]) => {
                    const parsedBags = line.bagWeightsText
                      .split(/[\s,;\n]+/)
                      .map((t) => parseFloat(t))
                      .filter((n) => !isNaN(n) && n > 0);

                    return (
                      <div key={prodId} className="border border-slate-200 rounded-lg p-3 bg-white shadow-xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-xs font-bold text-slate-900">{line.productName}</span>
                            <span className="block text-[10px] text-muted-foreground">
                              Order PO: {line.orderedQty.toLocaleString("id-ID")} kg | Sisa Belum Datang: {line.remainingQty.toLocaleString("id-ID")} kg
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                            Netto Diterima: {line.net.toLocaleString("id-ID")} kg
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600">Berat Bruto (kg)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.gross || ""}
                              onChange={(e) => handleWeightChange(prodId, "gross", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600">Tara Wadah/Truk (kg)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.tare || ""}
                              onChange={(e) => handleWeightChange(prodId, "tare", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600">Netto Aktual (kg)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.net || ""}
                              onChange={(e) => handleWeightChange(prodId, "net", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="h-8 text-xs font-mono font-bold text-brand-primary bg-slate-50"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600">Adjustment manual (kg, +/-)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.adjustment || ""}
                              onChange={(e) => handleAdjustmentChange(prodId, { adjustment: parseFloat(e.target.value) || 0 })}
                              placeholder="0.00"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600">Alasan adjustment {line.adjustment !== 0 && "*"}</label>
                            <Input
                              value={line.adjustmentReason}
                              onChange={(e) => handleAdjustmentChange(prodId, { adjustmentReason: e.target.value })}
                              placeholder="Wajib diisi bila ada adjustment (audit organik)"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Catatan / Evaluasi Kedatangan</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan penerimaan (misal: nama supir, plat truk, atau palet yang dipakai)..."
                className="h-9 text-xs"
              />
            </div>

            <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-[11px] text-blue-800 flex items-start gap-1.5">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Alur LBM:</strong> Menekan tombol <strong>Tambah LBM</strong> akan membuat draft LBM dan membuka halaman rincian penimbangan per kemasan untuk diinput oleh staff gudang.
              </span>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? "Memproses..." : "Tambah LBM"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
