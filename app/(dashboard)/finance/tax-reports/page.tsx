"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { taxApi, SalesBook, VATSummary } from "@/lib/api/tax";
import { downloadCsv } from "@/lib/utils/csv";

type Tab = "salesBook" | "vat";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const STATUS_LABEL: Record<string, string> = { draft: "Draft", issued: "Terbit", cancelled: "Batal", replaced: "Diganti" };

export default function TaxReportsPage() {
  const [tab, setTab] = React.useState<Tab>("salesBook");
  const [from, setFrom] = React.useState(today().slice(0, 8) + "01");
  const [to, setTo] = React.useState(today());
  // Results are tagged with the query that produced them, so "loading" is derived.
  const key = `${tab}|${from}|${to}`;
  const [result, setResult] = React.useState<{ key: string; book: SalesBook | null; vat: VATSummary | null; error: string | null } | null>(null);

  React.useEffect(() => {
    let alive = true;
    const req = tab === "salesBook"
      ? taxApi.salesBook(from, to).then((r) => ({ book: r.data, vat: null }))
      : taxApi.vatSummary(from.slice(0, 4) + "-01-01", to).then((r) => ({ book: null, vat: r.data }));
    req
      .then((r) => alive && setResult({ key, ...r, error: null }))
      .catch((e) => alive && setResult({ key, book: null, vat: null, error: errText(e, "Gagal memuat laporan.") }));
    return () => {
      alive = false;
    };
  }, [key, tab, from, to]);

  const current = result?.key === key ? result : null;
  const loading = current === null;
  const book = current?.book ?? null;
  const vat = current?.vat ?? null;

  const exportCsv = () => {
    if (book) {
      downloadCsv(`buku-penjualan-${from}-${to}.csv`,
        ["Tanggal", "No. Invoice", "Customer", "NPWP", "NIK", "Penjualan Bruto", "Diskon", "DPP", "PPN", "Total", "No. Faktur Pajak", "Status Faktur"],
        book.rows.map((r) => [r.date, r.invoiceNumber, r.customerName, r.customerNpwp, r.customerNik, r.gross, r.discount, r.taxBase, r.vatAmount, r.total, r.taxNumber || r.taxInvoiceNumber || "", r.taxInvoiceStatus ? STATUS_LABEL[r.taxInvoiceStatus] : ""]));
    } else if (vat) {
      downloadCsv(`ringkasan-ppn-${vat.from}-${vat.to}.csv`,
        ["Masa", "PPN Keluaran", "PPN Masukan", "Kurang/(Lebih) Bayar", "Keluaran tanpa Faktur", "Masukan tanpa Faktur"],
        [...vat.periods, vat.total].map((p) => [p.period, p.outputVat, p.inputVat, p.net, p.outputWithoutFaktur, p.inputWithoutFaktur]));
    }
  };

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const thr = `${th} text-right`;
  const td = "px-3 py-1.5 text-xs";
  const tdr = `${td} text-right tabular-nums`;

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan Pajak" description="Buku Penjualan dan ringkasan PPN Keluaran dikurangi PPN Masukan per masa pajak.">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={!book && !vat} onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>

      <Card className="border-border shadow-2xs print:hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold">Dari<Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="space-y-1 text-xs font-semibold">Sampai<Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
          <div className="sm:col-span-2 flex gap-1.5">
            {([["salesBook", "Buku Penjualan"], ["vat", "Ringkasan PPN"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 rounded text-xs font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      {current?.error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{current.error}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat laporan...</div>}

      {!loading && book && (
        <>
          {book.pendingFaktur > 0 && (
            <div role="status" className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">{book.pendingFaktur} invoice ber-PPN belum memiliki Faktur Pajak yang terbit.</div>
          )}
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className={th}>Tanggal</th><th className={th}>No. Invoice</th><th className={th}>Customer</th><th className={th}>NPWP / NIK</th><th className={thr}>DPP</th><th className={thr}>PPN</th><th className={thr}>Total</th><th className={th}>Faktur Pajak</th></tr></thead>
                <tbody>
                  {book.rows.length === 0 && <tr><td className={td} colSpan={8}>Tidak ada penjualan pada periode ini.</td></tr>}
                  {book.rows.map((r) => (
                    <tr key={r.invoiceId} className="border-t border-border">
                      <td className={td}>{r.date}</td>
                      <td className={`${td} font-mono`}>{r.invoiceNumber}</td>
                      <td className={td}>{r.customerName}</td>
                      <td className={`${td} font-mono`}>{r.customerNpwp || r.customerNik || "-"}</td>
                      <td className={tdr}><MoneyDisplay amount={r.taxBase} /></td>
                      <td className={tdr}>{r.vatAmount ? <MoneyDisplay amount={r.vatAmount} /> : "-"}</td>
                      <td className={tdr}><MoneyDisplay amount={r.total} /></td>
                      <td className={td}>{r.taxInvoiceStatus ? <>{r.taxNumber || r.taxInvoiceNumber} <span className="text-muted-foreground">({STATUS_LABEL[r.taxInvoiceStatus]})</span></> : r.vatAmount ? <span className="text-amber-700 font-semibold">Belum dibuat</span> : "-"}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold bg-slate-50">
                    <td className={td} colSpan={4}>Total ({book.count} invoice)</td>
                    <td className={tdr}><MoneyDisplay amount={book.taxBase} /></td><td className={tdr}><MoneyDisplay amount={book.vatAmount} /></td><td className={tdr}><MoneyDisplay amount={book.total} /></td><td className={td} />
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && vat && (
        <>
          {(vat.total.outputWithoutFaktur > 0 || vat.total.inputWithoutFaktur > 0) && (
            <div role="status" className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Ada PPN pada invoice yang belum memiliki Faktur Pajak terbit (Keluaran <MoneyDisplay amount={vat.total.outputWithoutFaktur} />, Masukan <MoneyDisplay amount={vat.total.inputWithoutFaktur} />). Jumlah tersebut belum masuk perhitungan di bawah.
            </div>
          )}
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-3 py-2 border-b border-border bg-slate-50 text-xs text-muted-foreground">Tahun berjalan: {vat.from} s.d. {vat.to}. Positif = kurang bayar, negatif = lebih bayar.</div>
              <table className="w-full">
                <thead><tr><th className={th}>Masa</th><th className={thr}>PPN Keluaran</th><th className={thr}>PPN Masukan</th><th className={thr}>Kurang / (Lebih) Bayar</th><th className={thr}>Keluaran tanpa Faktur</th><th className={thr}>Masukan tanpa Faktur</th></tr></thead>
                <tbody>
                  {vat.periods.length === 0 && <tr><td className={td} colSpan={6}>Belum ada Faktur Pajak terbit pada periode ini.</td></tr>}
                  {[...vat.periods, ...(vat.periods.length ? [vat.total] : [])].map((p) => (
                    <tr key={p.period} className={`border-t border-border ${p.period === "total" ? "font-bold bg-slate-50 border-t-2" : ""}`}>
                      <td className={td}>{p.period === "total" ? "Total" : p.period}</td>
                      <td className={tdr}><MoneyDisplay amount={p.outputVat} /></td>
                      <td className={tdr}><MoneyDisplay amount={p.inputVat} /></td>
                      <td className={`${tdr} font-bold ${p.net > 0 ? "text-rose-700" : "text-emerald-700"}`}><MoneyDisplay amount={p.net} /></td>
                      <td className={tdr}>{p.outputWithoutFaktur ? <MoneyDisplay amount={p.outputWithoutFaktur} /> : "-"}</td>
                      <td className={tdr}>{p.inputWithoutFaktur ? <MoneyDisplay amount={p.inputWithoutFaktur} /> : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
