"use client";

import * as React from "react";
import { Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { payslipApi, Payslip, PayslipSummary } from "@/lib/api/payslip";

const periodLabel = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
};
const fmtHours = (min: number) => `${Math.floor(min / 60)}j ${min % 60}m`;

export default function MyPayslipsPage() {
  const [list, setList] = React.useState<PayslipSummary[] | null>(null);
  const [slip, setSlip] = React.useState<Payslip | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    payslipApi.mine().then((r) => alive && setList(r.data || [])).catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat slip gaji."));
    return () => {
      alive = false;
    };
  }, []);

  const open = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      setSlip((await payslipApi.get(id)).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuka slip gaji.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><ReceiptText className="h-5 w-5" /> Slip Gaji Saya</h1>
        <p className="text-xs text-muted-foreground">Slip tampil setelah payroll periode tersebut disetujui. Hanya Anda yang dapat melihatnya.</p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 print:hidden">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="print:hidden">
          <CardContent className="p-0">
            {!list ? <p className="p-4 text-xs text-muted-foreground">Memuat…</p> : list.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Belum ada slip gaji yang diterbitkan.</p>
            ) : (
              <ul>
                {list.map((s) => (
                  <li key={s.entryId} className="border-b last:border-0">
                    <button disabled={busy} onClick={() => open(s.entryId)} className={`w-full text-left p-3 text-xs hover:bg-slate-50 cursor-pointer ${slip?.entryId === s.entryId ? "bg-slate-50" : ""}`}>
                      <div className="font-bold">{periodLabel(s.period)}</div>
                      <div className="text-muted-foreground"><MoneyDisplay amount={s.takeHomePay} /> · {s.status === "paid" ? "Dibayar" : "Disetujui"}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {slip ? (
            <Card>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-black">Slip Gaji — {periodLabel(slip.period)}</div>
                    <div>{slip.employeeName} · {slip.nip} · {slip.department}</div>
                    {slip.bank && <div className="text-muted-foreground">{slip.bank} {slip.accountMasked}</div>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1 text-xs print:hidden"><Printer className="h-3.5 w-3.5" /> Cetak</Button>
                </div>

                <section>
                  <div className="font-bold mb-1">Penghasilan</div>
                  {slip.earnings.map((l) => <div key={l.label} className="flex justify-between"><span>{l.label}{l.note ? <em className="ml-1 text-muted-foreground">({l.note})</em> : null}</span><MoneyDisplay amount={l.amount} /></div>)}
                  <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total penghasilan</span><MoneyDisplay amount={slip.gross} /></div>
                </section>

                <section>
                  <div className="font-bold mb-1">Potongan</div>
                  {slip.deductions.length === 0 ? <div className="text-muted-foreground">Tidak ada potongan.</div> : slip.deductions.map((l) => (
                    <div key={l.label} className="flex justify-between text-rose-700"><span>{l.label}{l.note ? <em className="ml-1 opacity-80">({l.note})</em> : null}</span><MoneyDisplay amount={l.amount} /></div>
                  ))}
                  <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total potongan</span><MoneyDisplay amount={slip.totalDeductions} /></div>
                </section>

                <div className="flex justify-between text-sm font-black bg-slate-50 rounded-lg p-3"><span>Gaji bersih</span><MoneyDisplay amount={slip.takeHomePay} /></div>

                {slip.overtime.length > 0 && (
                  <section>
                    <div className="font-bold mb-1">Rincian lembur ({slip.overtimeHours} jam)</div>
                    <table className="w-full">
                      <thead><tr className="text-left text-muted-foreground"><th>Tanggal</th><th>Durasi</th><th className="text-right">Nilai</th></tr></thead>
                      <tbody>{slip.overtime.map((o) => <tr key={o.date + o.minutes}><td>{o.date}</td><td>{fmtHours(o.minutes)}</td><td className="text-right"><MoneyDisplay amount={o.amount} /></td></tr>)}</tbody>
                    </table>
                  </section>
                )}
              </CardContent>
            </Card>
          ) : list && list.length > 0 ? <p className="text-xs text-muted-foreground print:hidden">Pilih periode untuk melihat rincian.</p> : null}
        </div>
      </div>
    </div>
  );
}
