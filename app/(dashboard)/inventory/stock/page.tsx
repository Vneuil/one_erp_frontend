"use client";

import * as React from "react";
import { Download, Settings2 } from "lucide-react";
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
import { formatNumber } from "@/lib/utils";
import { downloadCsv } from "@/lib/utils/csv";
import { inventoryApi, StockLevelItem } from "@/lib/api/inventory";

export default function InventoryStockPage() {
  const [stocks, setStocks] = React.useState<StockLevelItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [bufferTarget, setBufferTarget] = React.useState<StockLevelItem | null>(null);
  const [minStock, setMinStock] = React.useState(0);
  const [maxStock, setMaxStock] = React.useState(0);
  const [bufferError, setBufferError] = React.useState<string | null>(null);
  const [isSavingBuffer, setIsSavingBuffer] = React.useState(false);

  const loadStocks = React.useCallback(() => {
    setIsLoading(true);
    inventoryApi
      .listStockLevels({ perPage: 100 })
      .then((res) => {
        setStocks(res.data || []);
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load stock levels", err);
        setLoadError("Gagal memuat data stok dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const handleExportStockList = () => {
    downloadCsv(
      "inventory-stock.csv",
      ["SKU", "Product Name", "Location", "On-Hand", "Reserved", "Available", "Min Stock", "Max Stock", "Buffer Status"],
      stocks.map((s) => [s.productSku, s.productName, s.warehouseName, s.quantity, s.reserved, s.available, s.minStock, s.maxStock, s.bufferStatus || ""])
    );
  };

  const openBufferDialog = (s: StockLevelItem) => {
    setBufferTarget(s);
    setMinStock(s.minStock);
    setMaxStock(s.maxStock);
    setBufferError(null);
  };

  const handleSaveBuffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bufferTarget) return;
    setIsSavingBuffer(true);
    setBufferError(null);
    try {
      await inventoryApi.setBufferStock({
        productId: bufferTarget.productId,
        warehouseId: bufferTarget.warehouseId,
        minStock,
        maxStock,
      });
      setBufferTarget(null);
      loadStocks();
    } catch (err) {
      setBufferError(err instanceof Error ? err.message : "Gagal menyimpan buffer stok.");
    } finally {
      setIsSavingBuffer(false);
    }
  };

  const stockHealthStatus = (s: StockLevelItem) => {
    if (s.quantity === 0) return "out_of_stock";
    if (s.bufferStatus === "below_min") return "low_stock";
    if (s.bufferStatus === "above_max") return "overstock";
    return "in_stock";
  };

  const columns: Column<StockLevelItem>[] = [
    {
      key: "productSku",
      header: "SKU",
      sortable: true,
      render: (s) => <span className="font-mono text-xs font-bold text-brand-primary">{s.productSku}</span>,
    },
    {
      key: "productName",
      header: "Product Name",
      sortable: true,
      render: (s) => <span className="text-xs font-semibold text-foreground">{s.productName}</span>,
    },
    {
      key: "warehouseName",
      header: "Location",
      sortable: true,
      render: (s) => <span className="text-xs text-muted-foreground">{s.warehouseName}</span>,
    },
    {
      key: "quantity",
      header: "Physical On-Hand",
      align: "right",
      sortable: true,
      render: (s) => <span className="text-xs font-semibold">{formatNumber(s.quantity)}</span>,
    },
    {
      key: "reserved",
      header: "Reserved/SO",
      align: "right",
      render: (s) => <span className="text-xs text-muted-foreground">{formatNumber(s.reserved)}</span>,
    },
    {
      key: "available",
      header: "Available to Sell",
      align: "right",
      sortable: true,
      render: (s) => <span className="text-xs font-bold text-brand-dark">{formatNumber(s.available)}</span>,
    },
    {
      key: "minStock",
      header: "Buffer (Min/Max)",
      align: "right",
      render: (s) => (
        <span className="text-xs text-muted-foreground">
          {s.minStock > 0 || s.maxStock > 0 ? `${formatNumber(s.minStock)} / ${formatNumber(s.maxStock)}` : "-"}
        </span>
      ),
    },
    {
      key: "id",
      header: "Stock Health",
      render: (s) => <StatusBadge status={stockHealthStatus(s)} />,
    },
    {
      key: "productId",
      header: "Aksi",
      render: (s) => (
        <button
          onClick={() => openBufferDialog(s)}
          className="p-1 rounded text-muted-foreground hover:text-brand-primary hover:bg-brand-tint cursor-pointer"
          title="Atur Buffer Stok"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Real-Time Inventory Stock"
        description="Comprehensive view of on-hand quantities, customer allocations, and available-to-promise inventory."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportStockList}>
          <Download className="h-3.5 w-3.5" /> Export Stock List
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
          data={stocks}
          searchKey="productName"
          searchPlaceholder="Search by product name or SKU..."
        />
      )}

      <Dialog open={!!bufferTarget} onOpenChange={(open) => !open && setBufferTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atur Buffer Stok</DialogTitle>
          </DialogHeader>
          {bufferTarget && (
            <form onSubmit={handleSaveBuffer} className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-mono font-bold text-brand-primary">{bufferTarget.productSku}</span>
                {" · "}
                {bufferTarget.productName} @ {bufferTarget.warehouseName}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Min Stock</label>
                  <Input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} min={0} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Max Stock</label>
                  <Input type="number" value={maxStock} onChange={(e) => setMaxStock(Number(e.target.value))} min={0} />
                </div>
              </div>
              {bufferError && <p className="text-xs text-rose-600 font-semibold">{bufferError}</p>}
              <DialogFooter>
                <Button type="submit" variant="gradient" disabled={isSavingBuffer} className="text-xs font-semibold">
                  {isSavingBuffer ? "Menyimpan..." : "Simpan Buffer"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
