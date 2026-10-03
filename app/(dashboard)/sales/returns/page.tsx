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
import { salesApi, SalesReturnItem, DeliveryItem } from "@/lib/api/sales";
import { productsApi, ProductItem } from "@/lib/api/products";

export default function SalesReturnsPage() {
  const [returns, setReturns] = React.useState<SalesReturnItem[]>([]);
  const [deliveries, setDeliveries] = React.useState<DeliveryItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = React.useState("");
  const [selectedProductId, setSelectedProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [unitPrice, setUnitPrice] = React.useState(0);
  const [reason, setReason] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([salesApi.listReturns(), salesApi.listDeliveries(), productsApi.list({ perPage: 100 })])
      .then(([retRes, dRes, pRes]) => {
        setReturns(retRes.data || []);
        setDeliveries(dRes.data || []);
        setProducts(pRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load sales returns", err);
        setLoadError("Gagal memuat data retur penjualan dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedDelivery = deliveries.find((d) => d.id === selectedDeliveryId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery || !selectedProductId || quantity <= 0) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await salesApi.createReturn({
        deliveryId: selectedDelivery.id,
        reason,
        lines: [{ productId: selectedProductId, quantity, unitPrice }],
      });
      loadData();
      setIsNewOpen(false);
      setSelectedDeliveryId("");
      setSelectedProductId("");
      setQuantity(1);
      setUnitPrice(0);
      setReason("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mencatat retur penjualan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<SalesReturnItem>[] = [
    {
      key: "returnNo",
      header: "No. Retur",
      render: (r) => <span className="font-mono text-xs font-bold text-brand-primary">{r.returnNo}</span>,
    },
    {
      key: "customerName",
      header: "Pelanggan",
      render: (r) => <span className="text-xs font-semibold text-foreground">{r.customerName}</span>,
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
        title="Retur Penjualan (Sales Return)"
        description="Terima kembali barang yang sudah dikirim (Delivery) dari pelanggan - misalnya rusak atau salah kirim."
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
              <Undo2 className="h-4 w-4 text-brand-primary" /> Buat Retur Penjualan
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Delivery</label>
              <select
                value={selectedDeliveryId}
                onChange={(e) => setSelectedDeliveryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                required
              >
                <option value="">Pilih Delivery...</option>
                {deliveries.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.deliveryNumber} · {d.customerName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Barang</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  setSelectedProductId(e.target.value);
                  if (product) setUnitPrice(product.sellingPrice || 0);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                required
              >
                <option value="">Pilih Barang...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.name}
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
