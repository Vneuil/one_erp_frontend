"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { reportsApi } from "@/lib/api/reports";
import { downloadCsv } from "@/lib/utils/csv";
import { Note, RangeFilter, ReportState, Tabs, monthStart, selectCls, td, tdr, th, thr, today, useReport } from "@/components/reports/report-ui";

type Tab = "balances" | "card";

/**
 * Saldo Akhir and Kartu for one side of the sub-ledger: "ar" (Piutang, customers)
 * or "ap" (Hutang, suppliers). Both sides share the same shape; only the labels differ.
 */
export function PartyLedgerReport({ kind }: { kind: "ar" | "ap" }) {
  const ar = kind === "ar";
  const L = ar
    ? { title: "Kartu & Saldo Akhir Piutang", desc: "Saldo piutang per customer dan kartu piutang (invoice dan pembayaran) per customer.", party: "Customer", charge: "Invoice", payment: "Pembayaran diterima", file: "piutang" }
    : { title: "Kartu & Saldo Akhir Hutang", desc: "Saldo hutang per supplier dan kartu hutang (invoice dan pembayaran) per supplier.", party: "Supplier", charge: "Invoice", payment: "Pembayaran", file: "hutang" };

  const [tab, setTab] = React.useState<Tab>("balances");
  const [asOf, setAsOf] = React.useState(today());
  const [includeZero, setIncludeZero] = React.useState(false);
  const [party, setParty] = React.useState("");
  const [from, setFrom] = React.useState(monthStart());
  const [to, setTo] = React.useState(today());

  // The party list always comes from the balances (including settled parties), as of today.
  const parties = useReport("parties", () => reportsApi.partyBalances(kind, { includeZero: true }).then((r) => r.data));
  const balances = useReport(`b|${asOf}|${includeZero}`, () => reportsApi.partyBalances(kind, { asOf, includeZero }).then((r) => r.data), tab === "balances");
  const card = useReport(`c|${party}|${from}|${to}`, () => reportsApi.partyCard(kind, { party, from, to }).then((r) => r.data), tab === "card" && party !== "");

  const openCard = (name: string) => {
    setParty(name);
    setTab("card");
  };

  const exportCsv = () => {
    if (tab === "balances" && balances.data) {
      downloadCsv(`saldo-akhir-${L.file}-${balances.data.asOf}.csv`, [L.party, "Total Invoice", "Total Dibayar", "Saldo", "Dokumen Terbuka", "Jatuh Tempo Tertua"],
        balances.data.rows.map((r) => [r.party, r.invoiced, r.paid, r.balance, r.openDocuments, r.oldestDue ?? ""]));
    } else if (card.data) {
      downloadCsv(`kartu-${L.file}-${card.data.party}-${from}-${to}.csv`, ["Tanggal", "Jenis", "Referensi", "Keterangan", "Jatuh Tempo", L.charge, L.payment, "Saldo"],
        [["", "", "", "Saldo awal", "", "", "", card.data.openingBalance], ...card.data.entries.map((e) => [e.date, e.type === "invoice" ? "Invoice" : "Pembayaran", e.reference, e.description, e.dueDate ?? "", e.charge || "", e.payment || "", e.balance])]);
    }
  };

  const active = tab === "balances" ? balances : card;
  return (
    <div className="space-y-6">
      <PageHeader title={L.title} description={L.desc}>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" disabled={tab === "card" ? !card.data : !balances.data} onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>Cetak</Button>
      </PageHeader>
      <Tabs value={tab} onChange={setTab} tabs={[["balances", "Saldo Akhir"], ["card", "Kartu"]] as const} />

      {tab === "balances" ? (
        <Card className="border-border shadow-2xs print:hidden"><CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold">Per tanggal<Input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} /></label>
          <label className="flex items-center gap-2 text-xs font-semibold h-9"><input type="checkbox" checked={includeZero} onChange={(e) => setIncludeZero(e.target.checked)} />Tampilkan saldo nol</label>
        </CardContent></Card>
      ) : (
        <RangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }}>
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">{L.party}
            <select value={party} onChange={(e) => setParty(e.target.value)} className={selectCls}>
              <option value="">Pilih {L.party.toLowerCase()}...</option>
              {parties.data?.rows.map((r) => <option key={r.party} value={r.party}>{r.party}</option>)}
            </select>
          </label>
        </RangeFilter>
      )}

      <ReportState loading={active.loading} error={active.error} empty={tab === "card" && party === "" ? `Pilih ${L.party.toLowerCase()} untuk melihat kartunya.` : false} />

      {tab === "balances" && balances.data && (
        <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
          <table className="w-full"><thead><tr><th className={th}>{L.party}</th><th className={thr}>Total invoice</th><th className={thr}>Total dibayar</th><th className={thr}>Saldo</th><th className={thr}>Dokumen terbuka</th><th className={th}>Jatuh tempo tertua</th><th className={th} /></tr></thead>
            <tbody>
              {balances.data.rows.length === 0 && <tr><td className={td} colSpan={7}>Tidak ada saldo pada tanggal ini.</td></tr>}
              {balances.data.rows.map((r) => (
                <tr key={r.party} className="border-t border-border">
                  <td className={td}>{r.party}</td><td className={tdr}><MoneyDisplay amount={r.invoiced} /></td><td className={tdr}><MoneyDisplay amount={r.paid} /></td>
                  <td className={`${tdr} font-bold`}><MoneyDisplay amount={r.balance} /></td><td className={tdr}>{r.openDocuments}</td><td className={td}>{r.oldestDue || "-"}</td>
                  <td className={td}><Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => openCard(r.party)}>Kartu</Button></td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-bold bg-slate-50"><td className={td}>Total</td><td className={tdr}><MoneyDisplay amount={balances.data.totalInvoiced} /></td><td className={tdr}><MoneyDisplay amount={balances.data.totalPaid} /></td><td className={tdr}><MoneyDisplay amount={balances.data.totalBalance} /></td><td className={td} colSpan={3} /></tr>
            </tbody></table>
        </CardContent></Card>
      )}

      {tab === "card" && card.data && (
        <>
          <Card className="border-border shadow-2xs"><CardContent className="p-0 overflow-x-auto">
            <div className="px-3 py-2 border-b border-border bg-slate-50 text-sm font-bold">{card.data.party} · {card.data.from} s.d. {card.data.to}</div>
            <table className="w-full"><thead><tr><th className={th}>Tanggal</th><th className={th}>Keterangan</th><th className={th}>Jatuh tempo</th><th className={thr}>{L.charge}</th><th className={thr}>{L.payment}</th><th className={thr}>Saldo</th></tr></thead>
              <tbody>
                <tr className="border-t border-border font-semibold"><td className={td} colSpan={5}>Saldo awal</td><td className={tdr}><MoneyDisplay amount={card.data.openingBalance} /></td></tr>
                {card.data.entries.length === 0 && <tr className="border-t border-border"><td className={td} colSpan={6}>Tidak ada transaksi pada periode ini.</td></tr>}
                {card.data.entries.map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className={td}>{e.date}</td><td className={td}>{e.description}{e.approximate && <span className="ml-1 text-amber-700" title="Tanggal pembayaran tidak tercatat; diperkirakan dari pembaruan terakhir">*</span>}</td><td className={td}>{e.dueDate || ""}</td>
                    <td className={tdr}>{e.charge ? <MoneyDisplay amount={e.charge} /> : ""}</td><td className={tdr}>{e.payment ? <MoneyDisplay amount={e.payment} /> : ""}</td><td className={tdr}><MoneyDisplay amount={e.balance} /></td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-bold bg-slate-50"><td className={td} colSpan={3}>Total / Saldo akhir</td><td className={tdr}><MoneyDisplay amount={card.data.totalCharges} /></td><td className={tdr}><MoneyDisplay amount={card.data.totalPayments} /></td><td className={tdr}><MoneyDisplay amount={card.data.closingBalance} /></td></tr>
              </tbody></table>
          </CardContent></Card>
          {card.data.entries.some((e) => e.approximate) && <Note>* Pembayaran tanpa riwayat tanggal (piutang/hutang manual) ditampilkan satu baris pada tanggal pembaruan terakhirnya.</Note>}
        </>
      )}
    </div>
  );
}
