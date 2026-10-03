"use client";

import * as React from "react";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useNavigationAccess } from "@/providers/navigation-access";
import { hropsApi, CanteenItemT, CanteenOrderItem, CanteenTotal } from "@/lib/api/hrops";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function CanteenPage() {
  const { canApprove } = useNavigationAccess();
  const isHr = canApprove("hrm");
  const [period, setPeriod] = React.useState(today().slice(0, 7));
  const [menu, setMenu] = React.useState<CanteenItemT[]>([]);
  const [orders, setOrders] = React.useState<CanteenOrderItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<CanteenTotal[]>([]);
  const [allItems, setAllItems] = React.useState<CanteenItemT[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [qty, setQty] = React.useState<Record<string, number>>({});
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState(0);

  const load = React.useCallback(async () => {
    const [m, o] = await Promise.all([hropsApi.canteenMenu(), hropsApi.myMeals(period)]);
    let sum: CanteenTotal[] = [];
    let items: CanteenItemT[] = [];
    if (isHr) {
      const [s, a] = await Promise.all([hropsApi.canteenSummary(period), hropsApi.canteenAllItems()]);
      sum = s.data || [];
      items = a.data || [];
    }
    return { menu: m.data || [], orders: o.data.orders || [], total: o.data.total || 0, summary: sum, items };
  }, [period, isHr]);

  const apply = (r: Awaited<ReturnType<typeof load>>) => {
    setMenu(r.menu);
    setOrders(r.orders);
    setTotal(r.total);
    setSummary(r.summary);
    setAllItems(r.items);
  };

  React.useEffect(() => {
    let alive = true;
    load()
      .then((r) => {
        if (!alive) return;
        apply(r);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat kantin.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      apply(await load());
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2"><UtensilsCrossed className="h-6 w-6 text-brand-primary" /><span>Kantin Karyawan</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Pesan makanan hari ini atau hari berikutnya. Total pesanan sebulan otomatis dipotong dari gaji saat payroll dihitung (dan dijurnal sebagai pendapatan kantin).</p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-bold">Menu</div>
          {loading && <p className="text-xs text-muted-foreground">Memuat…</p>}
          {!loading && menu.length === 0 && <p className="text-xs text-muted-foreground">Belum ada menu aktif.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {menu.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="text-xs"><MoneyDisplay amount={m.price} /></div>
                <div className="flex gap-1.5">
                  <Input type="number" min={1} max={20} value={qty[m.id] ?? 1} onChange={(e) => setQty((q) => ({ ...q, [m.id]: Number(e.target.value) }))} className="h-8 w-16 text-xs" aria-label={`Jumlah ${m.name}`} />
                  <Button size="sm" disabled={busy} onClick={() => run(() => hropsApi.orderMeal({ itemId: m.id, quantity: qty[m.id] ?? 1 }), `${m.name} dipesan untuk hari ini.`)} className="h-8 text-xs font-bold">Pesan hari ini</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <div className="flex items-center justify-between gap-3 px-3 pt-3">
            <span className="text-xs font-bold">Pesanan saya · total bulan ini <MoneyDisplay amount={total} /></span>
            <Input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="h-8 w-40 text-xs" aria-label="Periode" />
          </div>
          <table className="w-full mt-2">
            <thead><tr>{["Tanggal", "Menu", "Jumlah", "Total", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td className={td} colSpan={6}>Belum ada pesanan pada periode ini.</td></tr>}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className={td}>{o.date}</td><td className={td}>{o.itemName}</td><td className={td}>{o.quantity}</td><td className={td}><MoneyDisplay amount={o.amount} /></td>
                  <td className={td}>{o.status === "ordered" ? "Dipesan" : "Dibatalkan"}</td>
                  <td className={td}>{o.status === "ordered" && o.date >= today() && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => hropsApi.cancelMeal(o.id), "Pesanan dibatalkan.")} className="h-7 px-2 text-[11px]">Batalkan</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isHr && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-bold">Kelola menu</div>
              <div className="flex gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama menu" className="h-8 text-xs" />
                <Input type="number" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} placeholder="Harga" className="h-8 w-28 text-xs" />
                <Button size="sm" disabled={busy || !name.trim() || price <= 0} onClick={() => run(async () => { await hropsApi.createCanteenItem({ name, price }); setName(""); setPrice(0); }, "Menu ditambahkan.")} className="h-8 text-xs font-bold">Tambah</Button>
              </div>
              <ul className="space-y-1">
                {allItems.map((it) => (
                  <li key={it.id} className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs">
                    <span className={it.isActive ? "" : "text-muted-foreground line-through"}>{it.name} · <MoneyDisplay amount={it.price} /></span>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => hropsApi.updateCanteenItem(it.id, { isActive: !it.isActive }), it.isActive ? "Menu dinonaktifkan." : "Menu diaktifkan.")} className="h-7 px-2 text-[11px]">{it.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-3 pt-3 text-xs font-bold">Potongan gaji periode {period}</div>
              <table className="w-full">
                <thead><tr>{["Karyawan", "Pesanan", "Potongan"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {summary.length === 0 && <tr><td className={td} colSpan={3}>Belum ada pesanan.</td></tr>}
                  {summary.map((s) => <tr key={s.nip} className="border-t border-border"><td className={td}>{s.employeeName} <span className="text-muted-foreground">({s.nip})</span></td><td className={td}>{s.orders}</td><td className={`${td} font-bold`}><MoneyDisplay amount={s.amount} /></td></tr>)}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
