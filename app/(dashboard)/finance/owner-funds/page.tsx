"use client";

import * as React from "react";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useNavigationAccess } from "@/providers/navigation-access";
import { financeApi, CapitalTransactionItem, OtherIncomeItem, AccountItem } from "@/lib/api/finance";

type Tab = "capital" | "income";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const INCOME_CATEGORIES = ["Bunga bank", "Sewa diterima", "Hibah / subsidi", "Keuntungan penjualan aset", "Lain-lain"];

export default function OwnerFundsPage() {
  const { canApprove } = useNavigationAccess();
  // Drawings take money out of the business, so they need approval rights (the server enforces it too).
  const mayDraw = canApprove("finance");

  const [tab, setTab] = React.useState<Tab>("capital");
  const [capital, setCapital] = React.useState<CapitalTransactionItem[]>([]);
  const [income, setIncome] = React.useState<OtherIncomeItem[]>([]);
  const [bankAccounts, setBankAccounts] = React.useState<AccountItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [kind, setKind] = React.useState<"injection" | "drawing">("injection");
  const [owner, setOwner] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [date, setDate] = React.useState(today());
  const [desc, setDesc] = React.useState("");
  const [account, setAccount] = React.useState("1000");

  const [category, setCategory] = React.useState(INCOME_CATEGORIES[0]);
  const [iAmount, setIAmount] = React.useState(0);
  const [iDate, setIDate] = React.useState(today());
  const [iDesc, setIDesc] = React.useState("");
  const [iAccount, setIAccount] = React.useState("1000");

  const loadAll = React.useCallback(
    () => Promise.all([financeApi.listCapital(), financeApi.listOtherIncome(), financeApi.listAccounts({ perPage: 500 })]),
    []
  );

  React.useEffect(() => {
    let alive = true;
    loadAll()
      .then(([c, i, a]) => {
        if (!alive) return;
        setCapital(c.data || []);
        setIncome(i.data || []);
        setBankAccounts((a.data || []).filter((x) => x.type === "asset" && x.isActive && x.code !== "1000" && /^10\d\d$/.test(x.code)));
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat data.")))
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
      const [c, i] = await loadAll();
      setCapital(c.data || []);
      setIncome(i.data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
      // A failed posting still leaves a saved (unposted) record; refresh so it shows.
      loadAll().then(([c, i]) => { setCapital(c.data || []); setIncome(i.data || []); }).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const totals = capital.reduce(
    (acc, c) => ({ ...acc, [c.type]: acc[c.type] + c.amount }),
    { injection: 0, drawing: 0 } as Record<"injection" | "drawing", number>
  );
  const accountOptions = (
    <>
      <option value="1000">Kas (1000)</option>
      {bankAccounts.map((a) => <option key={a.id} value={a.code}>{a.name} ({a.code})</option>)}
    </>
  );
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Landmark className="h-6 w-6 text-brand-primary" />
          <span>Modal, Prive & Pendapatan Lain</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Setoran modal pemilik, penarikan pribadi (prive), dan pendapatan di luar penjualan. Semuanya otomatis dijurnal dan masuk neraca serta laba rugi.
        </p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <div className="flex gap-1.5">
        {([["capital", "Modal & Prive"], ["income", "Pendapatan Lain"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : tab === "capital" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Total setoran modal</div><div className="text-xl font-black text-emerald-700"><MoneyDisplay amount={totals.injection} /></div></CardContent></Card>
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Total prive</div><div className="text-xl font-black text-rose-700"><MoneyDisplay amount={totals.drawing} /></div></CardContent></Card>
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Modal bersih dari pemilik</div><div className="text-xl font-black"><MoneyDisplay amount={totals.injection - totals.drawing} /></div></CardContent></Card>
          </div>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <label className="space-y-1 text-xs font-semibold">
                  Jenis
                  <select value={kind} onChange={(e) => setKind(e.target.value as "injection" | "drawing")} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                    <option value="injection">Setoran modal</option>
                    {mayDraw && <option value="drawing">Prive (penarikan)</option>}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">Nama pemilik<Input value={owner} onChange={(e) => setOwner(e.target.value)} /></label>
                <label className="space-y-1 text-xs font-semibold">Jumlah (Rp)<Input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></label>
                <label className="space-y-1 text-xs font-semibold">Tanggal<Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
                <label className="space-y-1 text-xs font-semibold">
                  Akun
                  <select value={account} onChange={(e) => setAccount(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">{accountOptions}</select>
                </label>
                <Button
                  size="sm"
                  disabled={busy || !owner.trim() || amount <= 0}
                  onClick={() => run(async () => { await financeApi.recordCapital(kind, { ownerName: owner, amount, date, description: desc, paymentAccountCode: account }); setAmount(0); setDesc(""); }, kind === "injection" ? "Setoran modal dicatat dan dijurnal." : "Prive dicatat dan dijurnal.")}
                  className="h-9 text-xs font-bold"
                >
                  Catat
                </Button>
              </div>
              <Input placeholder="Keterangan (opsional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
              {!mayDraw && <p className="text-[11px] text-muted-foreground">Pencatatan prive memerlukan hak approve di modul Finance.</p>}
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["Tanggal", "Jenis", "Pemilik", "Jumlah", "Akun", "Keterangan", "Jurnal"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {capital.length === 0 && <tr><td className={td} colSpan={7}>Belum ada transaksi modal.</td></tr>}
                  {capital.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className={td}>{c.date}</td>
                      <td className={td}>{c.type === "injection" ? "Setoran modal" : "Prive"}</td>
                      <td className={td}>{c.ownerName}</td>
                      <td className={`${td} font-bold ${c.type === "injection" ? "text-emerald-700" : "text-rose-700"}`}><MoneyDisplay amount={c.amount} /></td>
                      <td className={td}>{c.paymentAccountCode}</td>
                      <td className={td}>{c.description || "-"}</td>
                      <td className={td}>{c.posted ? "Terposting" : <span className="text-rose-700 font-bold">Belum terposting</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <label className="space-y-1 text-xs font-semibold sm:col-span-2">
                  Kategori
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                    {INCOME_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">Jumlah (Rp)<Input type="number" min={0} value={iAmount || ""} onChange={(e) => setIAmount(Number(e.target.value))} /></label>
                <label className="space-y-1 text-xs font-semibold">Tanggal<Input type="date" max={today()} value={iDate} onChange={(e) => setIDate(e.target.value)} /></label>
                <label className="space-y-1 text-xs font-semibold">
                  Diterima di
                  <select value={iAccount} onChange={(e) => setIAccount(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">{accountOptions}</select>
                </label>
                <Button
                  size="sm"
                  disabled={busy || iAmount <= 0}
                  onClick={() => run(async () => { await financeApi.recordOtherIncome({ category, amount: iAmount, date: iDate, description: iDesc, paymentAccountCode: iAccount }); setIAmount(0); setIDesc(""); }, "Pendapatan lain dicatat dan dijurnal.")}
                  className="h-9 text-xs font-bold"
                >
                  Catat
                </Button>
              </div>
              <Input placeholder="Keterangan (opsional)" value={iDesc} onChange={(e) => setIDesc(e.target.value)} />
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["Tanggal", "Kategori", "Jumlah", "Akun", "Keterangan", "Jurnal"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {income.length === 0 && <tr><td className={td} colSpan={6}>Belum ada pendapatan lain.</td></tr>}
                  {income.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className={td}>{o.date}</td>
                      <td className={td}>{o.category}</td>
                      <td className={`${td} font-bold text-emerald-700`}><MoneyDisplay amount={o.amount} /></td>
                      <td className={td}>{o.paymentAccountCode}</td>
                      <td className={td}>{o.description || "-"}</td>
                      <td className={td}>{o.posted ? "Terposting" : <span className="text-rose-700 font-bold">Belum terposting</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
