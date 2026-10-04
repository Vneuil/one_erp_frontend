"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, AccountItem, CashVoucherItem } from "@/lib/api/finance";

type Filter = "all" | "receipt" | "payment";
interface DraftLine { accountCode: string; description: string; amount: number }

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const isCashCode = (code: string) => /^10\d\d$/.test(code);
const emptyLine = (): DraftLine => ({ accountCode: "", description: "", amount: 0 });

export default function CashVouchersPage() {
  const [vouchers, setVouchers] = React.useState<CashVoucherItem[]>([]);
  const [accounts, setAccounts] = React.useState<AccountItem[]>([]);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [type, setType] = React.useState<"receipt" | "payment">("receipt");
  const [date, setDate] = React.useState(today());
  const [cashCode, setCashCode] = React.useState("1000");
  const [counterparty, setCounterparty] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [lines, setLines] = React.useState<DraftLine[]>([emptyLine()]);

  const loadVouchers = React.useCallback(() => financeApi.listCashVouchers().then((r) => setVouchers(r.data || [])), []);

  React.useEffect(() => {
    let alive = true;
    Promise.all([financeApi.listCashVouchers(), financeApi.listAccounts({ perPage: 500 })])
      .then(([v, a]) => {
        if (!alive) return;
        setVouchers(v.data || []);
        setAccounts((a.data || []).filter((x) => x.isActive));
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat data.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const cashAccounts = accounts.filter((a) => a.type === "asset" && isCashCode(a.code));
  const counterAccounts = accounts.filter((a) => a.code !== cashCode);
  const total = lines.reduce((s, l) => s + (l.amount > 0 ? l.amount : 0), 0);
  const valid = lines.length > 0 && lines.every((l) => l.accountCode && l.amount > 0);
  const accountName = (code: string) => accounts.find((a) => a.code === code)?.name ?? "";

  const updateLine = (i: number, patch: Partial<DraftLine>) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await financeApi.createCashVoucher({
        type, date, cashAccountCode: cashCode, counterparty, description,
        lines: lines.map((l) => ({ accountCode: l.accountCode, description: l.description, amount: l.amount })),
      });
      setNotice(`Voucher ${res.data.number} dicatat dan dijurnal.`);
      setLines([emptyLine()]);
      setCounterparty("");
      setDescription("");
      await loadVouchers();
    } catch (e) {
      setError(errText(e, "Gagal mencatat voucher."));
      loadVouchers().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const shown = vouchers.filter((v) => filter === "all" || v.type === filter);
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-xs";

  return (
    <div className="space-y-6">
      <PageHeader title="Penerimaan & Pengeluaran Kas / Bank" description="Voucher kas dan bank masuk (BKM) serta keluar (BKK). Setiap voucher otomatis dijurnal ke buku besar." />

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs font-semibold">
              Jenis
              <select value={type} onChange={(e) => setType(e.target.value as "receipt" | "payment")} className={sel}>
                <option value="receipt">Penerimaan (kas/bank masuk)</option>
                <option value="payment">Pengeluaran (kas/bank keluar)</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">Tanggal<Input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="space-y-1 text-xs font-semibold">
              Kas / Bank
              <select value={cashCode} onChange={(e) => setCashCode(e.target.value)} className={sel}>
                {!cashAccounts.some((a) => a.code === "1000") && <option value="1000">Kas (1000)</option>}
                {cashAccounts.map((a) => <option key={a.id} value={a.code}>{a.name} ({a.code})</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">{type === "receipt" ? "Diterima dari" : "Dibayar kepada"}<Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} /></label>
          </div>
          <Input placeholder="Keterangan (opsional)" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="space-y-2">
            <div className="text-xs font-bold">{type === "receipt" ? "Dikreditkan ke akun" : "Didebitkan ke akun"}</div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <label className="sm:col-span-5 space-y-1 text-[11px] font-semibold">
                  {i === 0 && "Akun"}
                  <select value={l.accountCode} onChange={(e) => updateLine(i, { accountCode: e.target.value })} className={sel} aria-label={`Akun baris ${i + 1}`}>
                    <option value="">Pilih akun...</option>
                    {counterAccounts.map((a) => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
                  </select>
                </label>
                <label className="sm:col-span-4 space-y-1 text-[11px] font-semibold">{i === 0 && "Keterangan"}<Input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} aria-label={`Keterangan baris ${i + 1}`} /></label>
                <label className="sm:col-span-2 space-y-1 text-[11px] font-semibold">{i === 0 && "Jumlah (Rp)"}<Input type="number" min={0} value={l.amount || ""} onChange={(e) => updateLine(i, { amount: Number(e.target.value) })} aria-label={`Jumlah baris ${i + 1}`} /></label>
                <Button type="button" variant="outline" size="sm" className="h-9 sm:col-span-1" disabled={lines.length === 1} onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} aria-label={`Hapus baris ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setLines((prev) => [...prev, emptyLine()])}><Plus className="h-3.5 w-3.5" /> Tambah baris</Button>
              <div className="text-sm font-bold">Total: <MoneyDisplay amount={total} /></div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !valid} onClick={submit}>{busy ? "Menyimpan..." : "Catat voucher"}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-1.5">
        {([["all", "Semua"], ["receipt", "Penerimaan (BKM)"], ["payment", "Pengeluaran (BKK)"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${filter === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["No. Voucher", "Tanggal", "Jenis", "Kas / Bank", "Pihak", "Rincian akun", "Jumlah", "Jurnal"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td className={td} colSpan={8}>Memuat data...</td></tr>}
              {!loading && shown.length === 0 && <tr><td className={td} colSpan={8}>Belum ada voucher.</td></tr>}
              {shown.map((v) => (
                <tr key={v.id} className="border-t border-border align-top">
                  <td className={`${td} font-mono font-bold`}>{v.number}</td>
                  <td className={td}>{v.date}</td>
                  <td className={td}>{v.type === "receipt" ? "Penerimaan" : "Pengeluaran"}</td>
                  <td className={td}>{v.cashAccountCode} {accountName(v.cashAccountCode)}</td>
                  <td className={td}>{v.counterparty || v.description || "-"}</td>
                  <td className={td}>{v.lines.map((l) => <div key={l.id}>{l.accountCode} {accountName(l.accountCode)}{l.description ? ` - ${l.description}` : ""}</div>)}</td>
                  <td className={`${td} font-bold ${v.type === "receipt" ? "text-emerald-700" : "text-rose-700"}`}><MoneyDisplay amount={v.total} /></td>
                  <td className={td}>{v.posted ? "Terposting" : <span className="text-rose-700 font-bold">Belum terposting</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
