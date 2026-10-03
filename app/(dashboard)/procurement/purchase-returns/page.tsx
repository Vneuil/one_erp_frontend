"use client";

import * as React from "react";
import { Plus, Undo2 } from "lucide-react";
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
import { MoneyDisplay } from "@/components/shared/money-display";
import { procurementApi, PurchaseReturnItem, GoodsReceiptItem } from "@/lib/api/procurement";

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = React.useState<PurchaseReturnItem[]>([]);
  const [receipts, setReceipts] = React.useState<GoodsReceiptItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [unitPrice, setUnitPrice] = React.useState(0);
  const [reason, setReason] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([procurementApi.listPurchaseReturns(), procurementApi.listGoodsReceipts()])
      .then(([retRes, grRes]) => {
        setReturns(retRes.data || []);
        setReceipts(grRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load purchase returns", err);
        setLoadError("Gagal memuat data retur pembelian dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedReceipt = receipts.find((r) => r.id === selectedReceiptId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceipt || quantity <= 0) return;
    const line = selectedReceipt.lines[0];
    if (!line) {
      setFormError("Goods receipt ini tidak punya baris barang.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await procurementApi.createPurchaseReturn({
        goodsReceiptId: selectedReceipt.id,
        reason,
        lines: [{ productId: line.productId, quantity, unitPrice }],
      });
      loadData();
      setIsNewOpen(false);
      setSelectedReceiptId("");
      setQuantity(1);
      setUnitPrice(0);
      setReason("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mencatat retur pembelian.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PurchaseReturnItem>[] = [
    {
      key: "returnNo",
      header: "No. Retur",
      render: (r) => <span className="font-mono text-xs font-bold text-brand-primary">{r.returnNo}</span>,
    },
    {
      key: "supplierName",
      header: "Vendor",
      render: (r) => <span className="text-xs font-semibold text-foreground">{r.supplierName}</span>,
    },
    {
      key: "returnDate",
      header: "Tanggal Retur",
      render: (r) => <span className="text-xs text-muted-foreground">{r.returnDate}</span>,
    },
    {
      key: "reason",
      header: "Alasan",
      render: (r) => <span className="text-xs text-foreground">{r.reason || "-"}</span>,
    },
    {
      key: "totalAmount",
      header: "Nilai Retur",
      align: "right",
      render: (r) => <MoneyDisplay amount={r.totalAmount} className="text-xs font-bold text-rose-600" />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retur Pembelian (Purchase Return)"
        description="Kembalikan barang yang sudah diterima (Goods Receipt) ke vendor - misalnya rusak atau salah kirim."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Buat Retur
        </Button>
      </PageHeader>

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <DataTable
          columns={columns}
          data={returns}
          searchKey="returnNo"
          searchPlaceholder="Cari nomor retur..."
        />
      )}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Undo2 className="h-4 w-4 text-brand-primary" /> Buat Retur Pembelian
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Goods Receipt</label>
              <select
                value={selectedReceiptId}
                onChange={(e) => setSelectedReceiptId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                required
              >
                <option value="">Pilih Goods Receipt...</option>
                {receipts.map((gr) => (
                  <option key={gr.id} value={gr.id}>
                    {gr.receiptNo} · {gr.receivedDate}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Qty Diretur</label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required min={1} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Harga Satuan</label>
                <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} required min={0} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Alasan Retur</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Barang rusak, salah kirim, dll." />
            </div>
            {formError && <p className="text-xs text-rose-600 font-semibold">{formError}</p>}
            <DialogFooter>
              <Button type="submit" variant="gradient" disabled={isSubmitting} className="text-xs font-semibold">
                {isSubmitting ? "Menyimpan..." : "Buat Retur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
