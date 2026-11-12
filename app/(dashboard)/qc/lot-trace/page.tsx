"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { certificationsApi, LotTrace, TraceInspection } from "@/lib/api/certifications";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white p-4 space-y-2">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Inspections({ rows }: { rows: TraceInspection[] }) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">Belum ada inspeksi.</p>;
  return (
    <ul className="space-y-1 text-xs">
      {rows.map((r) => (
        <li key={r.inspectionNo} className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-semibold">{r.inspectionNo}</span>
          <span className="text-muted-foreground">batch {r.batchNo} · {r.inspectedAt}</span>
          <Badge variant={r.isVoided ? "secondary" : r.overallStatus === "passed" ? "success" : "destructive"}>{r.isVoided ? "void" : r.overallStatus}</Badge>
        </li>
      ))}
    </ul>
  );
}

export default function LotTracePage() {
  const [lot, setLot] = React.useState("");
  const [trace, setTrace] = React.useState<LotTrace | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lot.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await certificationsApi.traceLot(lot.trim());
      setTrace(res.data);
    } catch (err) {
      setTrace(null);
      setError(err instanceof Error ? err.message : "Gagal menelusuri lot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Penelusuran Lot Number" description="Telusuri satu lot dari penerimaan bahan baku, QC masuk, pemakaian produksi, hingga batch jadi dan QC-nya (dasar COI)." />
      <form onSubmit={search} className="flex gap-2 max-w-xl">
        <Input value={lot} onChange={(e) => setLot(e.target.value.toUpperCase())} placeholder="LOT-261112-0037-01" className="font-mono" />
        <Button type="submit" variant="gradient" disabled={loading} className="gap-1.5"><Search className="h-4 w-4" /> Telusuri</Button>
      </form>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

      {trace && (
        <div className="space-y-4">
          <Section title="1. Penerimaan Barang (GRN)">
            {trace.receipts.length === 0 ? <p className="text-xs text-muted-foreground">Lot tidak ditemukan di penerimaan barang.</p> : (
              <ul className="space-y-1 text-xs">
                {trace.receipts.map((r) => (
                  <li key={r.receiptNo}><span className="font-mono font-semibold">{r.receiptNo}</span> · {r.receivedDate} · PO {r.orderNo} · {r.supplierName} · {r.quantity.toLocaleString("id-ID")} kg</li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="2. Sertifikat Vendor">
            {trace.supplierCertificates.length === 0 ? <p className="text-xs text-muted-foreground">Tidak ada sertifikat tercatat untuk vendor ini.</p> : (
              <ul className="space-y-1 text-xs">
                {trace.supplierCertificates.map((c) => (
                  <li key={c.id}>{c.scheme} <span className="font-mono">{c.number}</span> s/d {c.validUntil} <Badge variant={c.effectiveStatus === "active" ? "success" : "destructive"}>{c.effectiveStatus}</Badge></li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="3. QC Penerimaan"><Inspections rows={trace.receiptQc} /></Section>
          <Section title="4. Pemakaian Produksi">
            {trace.usedIn.length === 0 ? <p className="text-xs text-muted-foreground">Belum dipakai di produksi.</p> : (
              <ul className="space-y-1 text-xs">
                {trace.usedIn.map((u, i) => (<li key={i}>Order {u.orderNumber} → batch <span className="font-mono font-semibold">{u.childBatchNo}</span> ({u.childProduct}) · {u.quantityUsed} dipakai · {u.recordedAt}</li>))}
              </ul>
            )}
          </Section>
          <Section title="5. QC Batch Jadi (dasar COI)"><Inspections rows={trace.finishedQc} /></Section>
          {trace.gaps && trace.gaps.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">Mata rantai yang belum terhubung</p>
              <ul className="list-disc pl-4">{trace.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
