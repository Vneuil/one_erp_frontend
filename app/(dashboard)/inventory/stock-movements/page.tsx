"use client";

import * as React from "react";
import { Download, PackagePlus, PackageMinus } from "lucide-react";
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
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { productsApi, ProductItem } from "@/lib/api/products";
import { useAppStore } from "@/stores/app-store";

interface StockMovement {
  id: string;
  timestamp: string;
  sku: string;
  productName: string;
  movementType: string;
  refDocument: string;
  warehouse: string;
  qtyChange: string;
  balanceAfter: string;
  operator: string;
}

const movementTypeLabels: Record<string, string> = {
  in: "Goods Receipt",
  out: "Delivery Dispatch",
  adjustment: "Stock Adjustment",
  transfer_in: "Internal Transfer In",
  transfer_out: "Internal Transfer Out",
};

export default function StockMovementsPage() {
  const { currentUser } = useAppStore();
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);

  const [dialogMode, setDialogMode] = React.useState<"in" | "out" | null>(null);
  const [formProductId, setFormProductId] = React.useState("");
  const [formWarehouseId, setFormWarehouseId] = React.useState("");
  const [formQuantity, setFormQuantity] = React.useState(1);
  const [formReason, setFormReason] = React.useState("");
  const [formReference, setFormReference] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const fetchMovements = React.useCallback(() => {
    inventoryApi
      .listMovements({ perPage: 100 })
      .then((res) => {
                  setMovements(
            (res.data || []).map((m) => ({
              id: m.id,
              timestamp: m.createdAt || "",
              sku: m.productSku,
              productName: m.productName,
              movementType: movementTypeLabels[m.type] || m.type,
              refDocument: m.reference || "-",
              warehouse: m.warehouseName,
              qtyChange: `${m.quantity >= 0 ? "+" : ""}${m.quantity}`,
              balanceAfter: `${m.balance}`,
              operator: m.createdBy || "-",
            }))
          );
      })
      .catch((err) => {
        (console.error("Failed to load data", err), setLoadError("Gagal memuat data dari server."));
      });
  }, []);

  React.useEffect(() => {
    fetchMovements();
    productsApi
      .list({ perPage: 200 })
      .then((res) => setProducts(res.data || []))
      .catch((err) => console.warn("Failed to load products for stock form", err));
    inventoryApi
      .listWarehouses({ perPage: 100 })
      .then((res) => setWarehouses(res.data || []))
      .catch((err) => console.warn("Failed to load warehouses for stock form", err));
  }, [fetchMovements]);

  const openDialog = (mode: "in" | "out") => {
    setDialogMode(mode);
    setFormProductId("");
    setFormWarehouseId("");
    setFormQuantity(1);
    setFormReason("");
    setFormReference("");
    setFormError(null);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId || !formWarehouseId || formQuantity <= 0) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await inventoryApi.adjustStock({
        productId: formProductId,
        warehouseId: formWarehouseId,
        quantity: dialogMode === "out" ? -Math.abs(formQuantity) : Math.abs(formQuantity),
        reason: formReason || (dialogMode === "out" ? "Manual stock out" : "Manual stock in"),
        reference: formReference,
        createdBy: currentUser.name,
      });
      setDialogMode(null);
      fetchMovements();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan transaksi stok");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportLedger = () => {
    downloadCsv(
      "stock-movements.csv",
      ["Timestamp", "SKU", "Product", "Movement Type", "Document Ref", "Warehouse", "Change", "Ending Stock", "Operator"],
      movements.map((m) => [
        m.timestamp,
        m.sku,
        m.productName,
        m.movementType,
        m.refDocument,
        m.warehouse,
        m.qtyChange,
        m.balanceAfter,
        m.operator,
      ])
    );
  };

  const columns: Column<StockMovement>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      render: (m) => <span className="text-xs text-muted-foreground">{m.timestamp}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      render: (m) => <span className="font-mono text-xs font-bold text-brand-primary">{m.sku}</span>,
    },
    {
      key: "productName",
      header: "Product",
      render: (m) => <span className="text-xs font-semibold text-foreground">{m.productName}</span>,
    },
    {
      key: "movementType",
      header: "Movement Type",
      render: (m) => <span className="text-xs font-medium text-brand-indigo">{m.movementType}</span>,
    },
    {
      key: "refDocument",
      header: "Document Ref",
      render: (m) => <span className="font-mono text-xs text-muted-foreground">{m.refDocument}</span>,
    },
    {
      key: "qtyChange",
      header: "Change",
      align: "right",
      render: (m) => (
        <span className={`text-xs font-bold ${m.qtyChange.startsWith("+") ? "text-emerald-600" : "text-rose-600"}`}>
          {m.qtyChange}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Ending Stock",
      align: "right",
      render: (m) => <span className="text-xs font-semibold text-foreground">{m.balanceAfter}</span>,
    },
    {
      key: "operator",
      header: "Operator",
      render: (m) => <span className="text-xs text-muted-foreground">{m.operator}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements & Ledger"
        description="Immutable audit trail of all warehouse inventory receipts, dispatches, adjustments, and transfers."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs text-rose-700 border-rose-200 hover:bg-rose-50" onClick={() => openDialog("out")}>
          <PackageMinus className="h-3.5 w-3.5" /> Stock Out
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => openDialog("in")}>
          <PackagePlus className="h-3.5 w-3.5" /> Stock In
        </Button>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportLedger}>
          <Download className="h-3.5 w-3.5" /> Export Ledger
        </Button>
      </PageHeader>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      <DataTable
        columns={columns}
        data={movements}
        searchKey="sku"
        searchPlaceholder="Search by SKU or document..."
      />

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {dialogMode === "out" ? (
                <PackageMinus className="h-4 w-4 text-rose-600" />
              ) : (
                <PackagePlus className="h-4 w-4 text-emerald-600" />
              )}
              <span>{dialogMode === "out" ? "Catat Barang Keluar (Stock Out)" : "Catat Barang Masuk (Stock In)"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-3.5 text-xs">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-foreground">Produk *</label>
              <select
                value={formProductId}
                onChange={(e) => setFormProductId(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih produk...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Gudang *</label>
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
              <label className="font-bold text-foreground">Referensi Dokumen</label>
              <Input
                placeholder={dialogMode === "out" ? "Contoh: DO-2026-0512" : "Contoh: PO-2026-0421"}
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Alasan / Catatan</label>
              <Input
                placeholder={dialogMode === "out" ? "Contoh: Pengiriman ke customer" : "Contoh: Penerimaan dari supplier"}
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
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
