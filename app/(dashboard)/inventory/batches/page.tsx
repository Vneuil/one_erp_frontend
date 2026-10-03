"use client";

import * as React from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigationAccess } from "@/providers/navigation-access";
import { inventoryApi, StockBatchItem, WarehouseItem } from "@/lib/api/inventory";
import { productsApi, ProductItem } from "@/lib/api/products";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const STATUS: Record<string, { label: string; style: string }> = {
  expired: { label: "Kedaluwarsa", style: "bg-rose-100 text-rose-700" },
  expiring_soon: { label: "Segera kedaluwarsa", style: "bg-amber-100 text-amber-800" },
  ok: { label: "Aman", style: "bg-emerald-100 text-emerald-700" },
  no_expiry: { label: "Tanpa kedaluwarsa", style: "bg-slate-100 text-slate-700" },
};

export default function StockBatchesPage() {
  const { canApprove } = useNavigationAccess();
  const mayWriteOff = canApprove("inventory");

  const [batches, setBatches] = React.useState<StockBatchItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [onlyRisky, setOnlyRisky] = React.useState(false);

  const [productId, setProductId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [batchNo, setBatchNo] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [quantity, setQuantity] = React.useState(0);

  const loadAll = React.useCallback(
    () => Promise.all([inventoryApi.listBatches(), productsApi.list({ perPage: 500 }), inventoryApi.listWarehouses({ perPage: 100 })]),
    []
  );

  React.useEffect(() => {
    let alive = true;
    loadAll()
      .then(([b, p, w]) => {
        if (!alive) return;
        setBatches(b.data || []);
        setProducts(p.data || []);
        setWarehouses(w.data || []);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat batch.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [loadAll]);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setBatches((await inventoryApi.listBatches()).data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const shown = batches.filter((b) => !onlyRisky || b.status === "expired" || b.status === "expiring_soon");
  const expired = batches.filter((b) => b.status === "expired");
  const soon = batches.filter((b) => b.status === "expiring_soon");
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <PackageCheck className="h-6 w-6 text-brand-primary" />
          <span>Batch & Kedaluwarsa</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Terima barang per nomor batch dengan tanggal kedaluwarsa. Penjualan mengambil batch yang paling cepat kedaluwarsa lebih dulu (FEFO); stok kedaluwarsa tidak dihitung tersedia dan tidak dijual, dan dapat dihapus sebagai kerugian.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Batch aktif</div><div className="text-2xl font-black">{batches.length}</div></CardContent></Card>
        <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Segera kedaluwarsa (≤ 30 hari)</div><div className="text-2xl font-black text-amber-700">{soon.length} batch · {soon.reduce((a, b) => a + b.quantity, 0)} unit</div></CardContent></Card>
        <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Sudah kedaluwarsa</div><div className="text-2xl font-black text-rose-700">{expired.length} batch · {expired.reduce((a, b) => a + b.quantity, 0)} unit</div></CardContent></Card>
      </div>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">
            Produk
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Pilih produk…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.variantLabel ? ` · ${p.variantLabel}` : ""} ({p.sku})</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold">
            Gudang
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Pilih…</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold">No. batch<Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Kedaluwarsa<Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Jumlah<Input type="number" min={1} value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
          <div className="sm:col-span-6">
            <Button size="sm" disabled={busy || !productId || !warehouseId || !batchNo.trim() || quantity <= 0}
              onClick={() => run(async () => { await inventoryApi.receiveBatch({ productId, warehouseId, batchNo, expiryDate: expiry || undefined, quantity }); setBatchNo(""); setQuantity(0); }, "Barang diterima dan stok bertambah.")}
              className="h-9 text-xs font-bold">Terima Barang</Button>
          </div>
        </CardContent>
      </Card>

      <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" checked={onlyRisky} onChange={(e) => setOnlyRisky(e.target.checked)} /> Hanya yang segera/sudah kedaluwarsa</label>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Produk", "Gudang", "Batch", "Kedaluwarsa", "Sisa / Awal", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td className={td} colSpan={7}>Memuat data...</td></tr>}
              {!loading && shown.length === 0 && <tr><td className={td} colSpan={7}>Tidak ada batch.</td></tr>}
              {shown.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className={`${td} font-semibold`}>{b.productName}<div className="text-[10px] font-normal text-muted-foreground">{b.productSku}</div></td>
                  <td className={td}>{b.warehouseName}</td>
                  <td className={`${td} font-mono`}>{b.batchNo}</td>
                  <td className={td}>{b.expiryDate || "-"}{b.daysToExpiry !== undefined && <div className="text-[10px] text-muted-foreground">{b.daysToExpiry < 0 ? `${-b.daysToExpiry} hari lalu` : `${b.daysToExpiry} hari lagi`}</div>}</td>
                  <td className={td}>{b.quantity} / {b.initialQty}</td>
                  <td className={td}><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[b.status]?.style}`}>{STATUS[b.status]?.label}</span></td>
                  <td className={td}>
                    {mayWriteOff && b.quantity > 0 && (
                      <Button size="sm" variant="outline" disabled={busy} className="h-7 px-2 text-[11px] text-rose-600 border-rose-200"
                        onClick={() => { const reason = window.prompt(`Hapus ${b.quantity} unit batch ${b.batchNo} sebagai kerugian? Isi alasan:`, b.status === "expired" ? "Kedaluwarsa" : ""); if (reason && reason.trim()) run(() => inventoryApi.writeOffBatch(b.id, reason.trim()), `Batch ${b.batchNo} dihapus dari stok dan dijurnal sebagai kerugian.`); }}>
                        Hapus stok
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
