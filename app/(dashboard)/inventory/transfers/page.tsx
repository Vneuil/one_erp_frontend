"use client";

import * as React from "react";
import { Plus, ArrowRightLeft } from "lucide-react";
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
import { inventoryApi, WarehouseItem } from "@/lib/api/inventory";
import { productsApi, ProductItem } from "@/lib/api/products";

interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWH: string;
  destWH: string;
  transferDate: string;
  itemCount: number;
  driver: string;
  status: string;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = React.useState<StockTransfer[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [productId, setProductId] = React.useState("");
  const [sourceWH, setSourceWH] = React.useState("");
  const [destWH, setDestWH] = React.useState("");
  const [itemCount, setItemCount] = React.useState(1);
  const [driver, setDriver] = React.useState("");
  const [actioningId, setActioningId] = React.useState<string | null>(null);
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const [isRequesting, setIsRequesting] = React.useState(false);

  const fetchTransfers = React.useCallback(() => {
    inventoryApi
      .listTransfers({ perPage: 50 })
      .then((res) => {
                  setTransfers(
            (res.data || []).map((t) => ({
              id: t.id,
              transferNumber: t.id.slice(0, 8).toUpperCase(),
              sourceWH: t.fromWarehouseName,
              destWH: t.toWarehouseName,
              transferDate: t.createdAt ? t.createdAt.slice(0, 10) : "",
              itemCount: t.quantity,
              driver: t.requestedBy || "-",
              status: t.status,
            }))
          );
      })
      .catch((err) => {
        (console.error("Failed to load data", err), setLoadError("Gagal memuat data dari server."));
      });
  }, []);

  React.useEffect(() => {
    inventoryApi
      .listWarehouses({ perPage: 50 })
      .then((res) => {
        if (res.data) setWarehouses(res.data);
      })
      .catch((err) => {
        (console.error("Failed to load data", err), setLoadError("Gagal memuat data dari server."));
      });

    fetchTransfers();

    productsApi
      .list({ perPage: 200 })
      .then((res) => setProducts(res.data || []))
      .catch((err) => console.warn("Failed to load products", err));
  }, [fetchTransfers]);

  const handleCompleteTransfer = async (id: string) => {
    setActioningId(id);
    try {
      await inventoryApi.completeTransfer(id);
      fetchTransfers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyelesaikan transfer");
    } finally {
      setActioningId(null);
    }
  };

  const handleCancelTransfer = async (id: string) => {
    if (!confirm("Batalkan transfer ini?")) return;
    setActioningId(id);
    try {
      await inventoryApi.cancelTransfer(id);
      fetchTransfers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal membatalkan transfer");
    } finally {
      setActioningId(null);
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !sourceWH || !destWH || !driver) return;
    if (sourceWH === destWH) {
      setRequestError("Gudang asal dan tujuan tidak boleh sama");
      return;
    }

    setIsRequesting(true);
    setRequestError(null);
    try {
      await inventoryApi.createTransfer({
        productId,
        fromWarehouseId: sourceWH,
        toWarehouseId: destWH,
        quantity: itemCount,
        requestedBy: driver,
      });
      fetchTransfers();
      setIsNewOpen(false);
      setProductId("");
      setSourceWH("");
      setDestWH("");
      setItemCount(1);
      setDriver("");
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Gagal membuat permintaan transfer");
    } finally {
      setIsRequesting(false);
    }
  };

  const columns: Column<StockTransfer>[] = [
    {
      key: "transferNumber",
      header: "Transfer No.",
      sortable: true,
      render: (tr) => <span className="font-mono text-xs font-bold text-brand-primary">{tr.transferNumber}</span>,
    },
    {
      key: "route",
      header: "Warehouse Route",
      render: (tr) => (
        <div className="text-xs space-y-0.5">
          <p className="font-medium text-foreground">From: {tr.sourceWH}</p>
          <p className="text-muted-foreground">To: {tr.destWH}</p>
        </div>
      ),
    },
    {
      key: "transferDate",
      header: "Date Dispatched",
      render: (tr) => <span className="text-xs text-muted-foreground">{tr.transferDate}</span>,
    },
    {
      key: "itemCount",
      header: "Quantity",
      align: "center",
      render: (tr) => <span className="text-xs font-semibold">{tr.itemCount} SKUs</span>,
    },
    {
      key: "driver",
      header: "Driver / Fleet",
      render: (tr) => <span className="text-xs text-muted-foreground">{tr.driver}</span>,
    },
    {
      key: "status",
      header: "Transfer Status",
      render: (tr) => <StatusBadge status={tr.status} />,
    },
    {
      key: "actions",
      header: "Aksi",
      render: (tr) =>
        tr.status === "pending" || tr.status === "in_transit" ? (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actioningId === tr.id}
              onClick={() => handleCompleteTransfer(tr.id)}
              className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              Selesai
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actioningId === tr.id}
              onClick={() => handleCancelTransfer(tr.id)}
              className="h-7 text-[11px] px-2 text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              Batal
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inter-Warehouse Stock Transfers"
        description="Transfer inventory between distribution centers, branches, and regional warehouses."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Request Stock Transfer
        </Button>
      </PageHeader>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      <DataTable
        columns={columns}
        data={transfers}
        searchKey="transferNumber"
        searchPlaceholder="Search transfer number..."
      />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Stock Transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRequestTransfer} className="space-y-3 text-xs">
            {requestError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                {requestError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Produk *</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
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
              <label className="text-xs font-semibold text-foreground">Gudang Asal *</label>
              <select
                value={sourceWH}
                onChange={(e) => setSourceWH(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih gudang asal...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Gudang Tujuan *</label>
              <select
                value={destWH}
                onChange={(e) => setDestWH(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih gudang tujuan...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Quantity (SKUs)</label>
                <Input type="number" min={1} value={itemCount} onChange={(e) => setItemCount(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Driver / Fleet</label>
                <Input value={driver} onChange={(e) => setDriver(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold" disabled={isRequesting}>
                {isRequesting ? "Mengirim..." : "Request Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
