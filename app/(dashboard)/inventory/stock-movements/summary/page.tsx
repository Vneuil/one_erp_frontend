"use client";

import * as React from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { downloadCsv } from "@/lib/utils/csv";
import { inventoryApi, MovementSummary, WarehouseItem } from "@/lib/api/inventory";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function MovementSummaryPage() {
  const now = new Date();
  const [from, setFrom] = React.useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = React.useState(iso(now));
  const [warehouseId, setWarehouseId] = React.useState("");
  const [warehouses, setWarehouses] = React.useState<WarehouseItem[]>([]);
  const [data, setData] = React.useState<MovementSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    inventoryApi.listWarehouses({ perPage: 100 }).then((r) => setWarehouses(r.data || [])).catch(() => setWarehouses([]));
  }, []);

  const load = () => {
    setLoading(true);
    setError(null);
    inventoryApi
      .movementSummary({ from, to, warehouseId: warehouseId || undefined })
      .then((r) => setData(r.data))
      .catch((e) => setError(errText(e, "Gagal memuat ringkasan.")))
      .finally(() => setLoading(false));
  };

  const td = "p-3 text-right font-mono";
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Ringkasan Pergerakan Stok</h1>
        <p className="text-xs text-muted-foreground">Per produk dan gudang: saldo awal, masuk, keluar, dan saldo akhir untuk periode. Hanya produk yang bergerak pada periode yang tampil.</p>
      </div>
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Gudang
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
              <option value="">Semua gudang</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <Button size="sm" onClick={load} disabled={loading || !from || !to} className="text-xs font-bold">{loading ? "Memuat…" : "Tampilkan"}</Button>
          {data && data.rows.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => downloadCsv(`pergerakan-stok-${data.from}_${data.to}.csv`, ["SKU", "Produk", "Gudang", "Awal", "Masuk", "Keluar", "Penyesuaian", "Akhir"], data.rows.map((r) => [r.productSku, r.productName, r.warehouseName, r.opening, r.received, r.issued, r.adjustments, r.closing]))}
            ><Download className="h-3.5 w-3.5" /> CSV</Button>
          )}
        </CardContent>
      </Card>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {data && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {data.rows.length === 0 ? <p className="p-4 text-xs text-muted-foreground">Tidak ada pergerakan stok pada periode ini.</p> : (
              <table className="w-full text-xs">
                <thead><tr className="text-left text-muted-foreground border-b"><th className="p-3">Produk</th><th className="p-3">Gudang</th><th className="p-3 text-right">Awal</th><th className="p-3 text-right">Masuk</th><th className="p-3 text-right">Keluar</th><th className="p-3 text-right">Akhir</th></tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={`${r.productId}-${r.warehouseId}`} className="border-b">
                      <td className="p-3"><div className="font-semibold">{r.productName}</div><div className="text-[10px] text-muted-foreground">{r.productSku}</div></td>
                      <td className="p-3">{r.warehouseName}</td>
                      <td className={td}>{r.opening}</td>
                      <td className={`${td} text-emerald-700`}>+{r.received}</td>
                      <td className={`${td} text-rose-700`}>-{r.issued}</td>
                      <td className={`${td} font-bold`}>{r.closing}</td>
                    </tr>
                  ))}
                  <tr className="font-bold"><td className="p-3" colSpan={3}>Total</td><td className={`${td} text-emerald-700`}>+{data.totalReceived}</td><td className={`${td} text-rose-700`}>-{data.totalIssued}</td><td /></tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
