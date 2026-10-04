"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { inventoryApi } from "@/lib/api/inventory";
import { ReportState, useReport } from "@/components/reports/report-ui";

/** Printable count sheet for a stock opname: blank "Hasil Hitung" column and signature blocks. */
export default function OpnamePrintPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [blind, setBlind] = React.useState(false);
  const { data, error, loading } = useReport(`opname|${id}`, () => inventoryApi.getOpname(id).then((r) => r.data));

  const cell = "border border-slate-400 px-2 py-1.5 text-xs";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href="/inventory/stock-opname" className="text-xs text-brand-primary font-semibold">← Kembali ke Stock Opname</Link>
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />Sembunyikan stok sistem (hitung buta)</label>
        <Button size="sm" className="h-9 text-xs font-bold" disabled={!data} onClick={() => window.print()}>Cetak</Button>
      </div>
      <ReportState loading={loading} error={error} />
      {data && (
        <div className="bg-white p-6 print:p-0">
          <div className="text-center mb-4">
            <h1 className="text-lg font-black tracking-wide">FORM STOCK OPNAME</h1>
            <p className="text-xs text-muted-foreground">Lembar penghitungan fisik persediaan</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mb-4">
            <div><span className="inline-block w-28 text-muted-foreground">Gudang</span>: {data.warehouseName}</div>
            <div><span className="inline-block w-28 text-muted-foreground">Tanggal audit</span>: {data.auditDate}</div>
            <div><span className="inline-block w-28 text-muted-foreground">No. dokumen</span>: SO-AUD-{data.auditDate}-{data.id.slice(0, 4).toUpperCase()}</div>
            <div><span className="inline-block w-28 text-muted-foreground">Jumlah SKU</span>: {data.lines.length}</div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className={`${cell} w-10 text-center`}>No</th><th className={`${cell} text-left`}>SKU</th><th className={`${cell} text-left`}>Nama Produk</th>
                {!blind && <th className={`${cell} text-right w-24`}>Stok Sistem</th>}
                <th className={`${cell} w-32`}>Hasil Hitung</th><th className={`${cell} text-left w-40`}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={l.id} style={{ breakInside: "avoid" }}>
                  <td className={`${cell} text-center`}>{i + 1}</td><td className={`${cell} font-mono`}>{l.productSku}</td><td className={cell}>{l.productName}</td>
                  {!blind && <td className={`${cell} text-right tabular-nums`}>{l.systemQty}</td>}
                  <td className={`${cell} h-8`} /><td className={cell} />
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-3 gap-6 mt-10 text-xs text-center" style={{ breakInside: "avoid" }}>
            {["Dihitung oleh", "Diperiksa oleh", "Disetujui oleh"].map((r) => (
              <div key={r}><div>{r}</div><div className="h-16" /><div className="border-t border-slate-500 pt-1">( _____________________ )</div><div className="text-muted-foreground mt-1">Tanggal: ____ / ____ / ________</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
