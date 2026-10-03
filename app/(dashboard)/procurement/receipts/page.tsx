"use client";

import * as React from "react";
import { Plus, PackageCheck } from "lucide-react";
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
import { procurementApi, PurchaseOrderItem, GoodsReceiptItem } from "@/lib/api/procurement";
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { useAppStore } from "@/stores/app-store";

interface GoodsReceipt {
  id: string;
  grNumber: string;
  poNumber: string;
  vendorName: string;
  receivedDate: string;
  warehouse: string;
  receivedBy: string;
  status: string;
}


export default function ReceiptsPage() {
  const { currentUser } = useAppStore();
  const [rawReceipts, setRawReceipts] = React.useState<GoodsReceiptItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchaseOrderItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [poId, setPoId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");

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
        const list = res.data || [];
        setWarehouses(list);
        if (list.length > 0) setWarehouseId((prev) => prev || list[0].id);
      })
      .catch((err) => console.warn("Failed to load warehouses", err));
    loadReceipts();
  }, [loadReceipts]);

  const receipts: GoodsReceipt[] = React.useMemo(() => {
    if (rawReceipts === null) return [];
    return rawReceipts.map((gr) => {
      const po = purchaseOrders.find((p) => p.id === gr.purchaseOrderId);
      const wh = warehouses.find((w) => w.id === gr.warehouseId);
      return {
        id: gr.id,
        grNumber: gr.receiptNo,
        poNumber: po?.orderNo || gr.purchaseOrderId,
        vendorName: po?.supplierName || "-",
        receivedDate: gr.receivedDate,
        warehouse: wh?.name || "-",
        receivedBy: gr.receivedBy || "-",
        status: gr.status,
      };
    });
  }, [rawReceipts, purchaseOrders, warehouses]);

  // Purchase orders that still have something left to receive.
  const receivablePOs = purchaseOrders.filter(
    (po) =>
      po.status !== "cancelled" &&
      po.status !== "draft" &&
      po.lines.some((l) => l.quantity - l.quantityReceived > 0)
  );

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo || !warehouseId || isSubmitting) return;

    const remainingLines = selectedPo.lines
      .filter((l) => l.quantity - l.quantityReceived > 0)
      .map((l) => ({ productId: l.productId, quantityReceived: l.quantity - l.quantityReceived }));
    if (remainingLines.length === 0) {
      setFormError("Semua item pada PO ini sudah diterima sepenuhnya.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await procurementApi.createGoodsReceipt({
        purchaseOrderId: selectedPo.id,
        warehouseId,
        lines: remainingLines,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal mencatat penerimaan barang.");
      }
      loadReceipts();
      // Purchase order's remaining-quantity-received bookkeeping changed
      // server-side, refresh so the PO picker's "fully received" filter
      // stays accurate for the next receipt.
      procurementApi
        .listPurchaseOrders({ perPage: 100 })
        .then((res) => setPurchaseOrders(res.data || []))
        .catch((err) => console.warn("Failed to refresh purchase orders", err));
      setIsNewOpen(false);
      setPoId("");
      setNotice("Penerimaan barang (Goods Receipt) berhasil dicatat.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mencatat penerimaan barang. Silakan periksa kembali referensi PO.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<GoodsReceipt>[] = [
    {
      key: "grNumber",
      header: "GR Number",
      sortable: true,
      render: (gr) => <span className="font-mono text-xs font-bold text-brand-primary">{gr.grNumber}</span>,
    },
    {
      key: "poNumber",
      header: "PO Reference",
      render: (gr) => <span className="font-mono text-xs text-brand-indigo">{gr.poNumber}</span>,
    },
    {
      key: "vendorName",
      header: "Vendor / Supplier",
      sortable: true,
      render: (gr) => <span className="text-xs font-semibold text-foreground">{gr.vendorName}</span>,
    },
    {
      key: "receivedDate",
      header: "Received Date",
      render: (gr) => <span className="text-xs text-muted-foreground">{gr.receivedDate}</span>,
    },
    {
      key: "warehouse",
      header: "Destination WH",
      render: (gr) => <span className="text-xs text-foreground font-medium">{gr.warehouse}</span>,
    },
    {
      key: "status",
      header: "Quality Check",
      render: (gr) => <StatusBadge status={gr.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipts & Inbound Logistics"
        description="Inspect inbound vendor shipments, log warehouse receiving slips, and initiate QA check."
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
          <Plus className="h-3.5 w-3.5" /> Receive Inbound Shipment
        </Button>
      </PageHeader>

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
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
        searchPlaceholder="Search goods receipt or PO number..."
      />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Inbound Shipment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceive} className="space-y-3">
            {formError && (
              <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">PO Reference</label>
              <select
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Pilih Purchase Order...</option>
                {receivablePOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNo} — {po.supplierName}
                  </option>
                ))}
              </select>
              {receivablePOs.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Tidak ada Purchase Order yang masih memiliki item belum diterima.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vendor / Supplier</label>
              <Input value={selectedPo?.supplierName || ""} disabled readOnly placeholder="Otomatis dari PO yang dipilih" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Destination Warehouse</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
              >
                <option value="">Pilih gudang tujuan...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Received By</label>
              <Input value={currentUser.name} disabled readOnly />
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Log Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
