"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { useProductOptions } from "@/components/shared/use-product-options";
import { errText, useReport } from "@/components/reports/report-ui";
import { manufacturingApi, BOMItem } from "@/lib/api/manufacturing";

interface DraftComponent {
  productId: string;
  quantity: number;
}
interface DraftProcess {
  name: string;
  minutes: string;
}

const select = "w-full h-9 px-2 rounded-lg border border-border bg-white text-xs";

export default function BOMPage() {
  const [reload, setReload] = React.useState(0);
  const boms = useReport(`boms|${reload}`, () => manufacturingApi.listBOMs({ perPage: 100 }).then((r) => r.data || []));
  const productOptions = useProductOptions();
  const { options, known, pick } = productOptions;

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<BOMItem | null>(null);
  const [productId, setProductId] = React.useState("");
  const [version, setVersion] = React.useState("v1.0");
  const [components, setComponents] = React.useState<DraftComponent[]>([{ productId: "", quantity: 1 }]);
  const [processes, setProcesses] = React.useState<DraftProcess[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const outputProduct = known[productId] ?? options.find((p) => p.id === productId);
  const unitCost = components.reduce((s, c) => s + (known[c.productId]?.costPrice ?? 0) * (c.quantity > 0 ? c.quantity : 0), 0);
  const valid = Boolean(outputProduct) && components.length > 0 && components.every((c) => c.productId && c.quantity > 0) && processes.every((p) => p.name.trim() !== "");

  const setComponent = (i: number, patch: Partial<DraftComponent>) => setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const setProcess = (i: number, patch: Partial<DraftProcess>) => setProcesses((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const move = (i: number, dir: -1 | 1) =>
    setProcesses((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outputProduct || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await manufacturingApi.createBOM({
        productId: outputProduct.id,
        name: `${outputProduct.name} Recipe`,
        version,
        lines: components.map((c) => ({ componentProductId: c.productId, quantityRequired: c.quantity, unit: known[c.productId]?.unit })),
        processes: processes.map((p) => ({ name: p.name.trim(), standardMinutes: p.minutes === "" ? 0 : Number(p.minutes) })),
      });
      setIsNewOpen(false);
      setProductId("");
      setVersion("v1.0");
      setComponents([{ productId: "", quantity: 1 }]);
      setProcesses([]);
      setNotice("Resep BOM berhasil dibuat.");
      setReload((n) => n + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal membuat BOM. Silakan coba lagi."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<BOMItem>[] = [
    { key: "productSku", header: "BOM Code", sortable: true, render: (b) => <span className="font-mono text-xs font-bold text-brand-primary">BOM-{b.productSku || b.id.slice(0, 6).toUpperCase()}</span> },
    { key: "productName", header: "Output Product", sortable: true, render: (b) => <span className="text-xs font-semibold text-foreground">{b.productName || b.name}</span> },
    { key: "version", header: "Revision", render: (b) => <span className="font-mono text-xs text-muted-foreground">{b.version}</span> },
    { key: "lines", header: "Components", align: "center", render: (b) => <span className="text-xs font-semibold">{b.lines.length} Parts</span> },
    {
      key: "processes",
      header: "Routing",
      render: (b) => <span className="text-xs text-muted-foreground">{b.processes?.length ? b.processes.map((p) => p.name).join(" → ") : "Tanpa proses"}</span>,
    },
    { key: "isActive", header: "Status", render: (b) => <StatusBadge status={b.isActive ? "active" : "draft"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Bill of Materials (BOM) Recipes" description="Resep produksi: bahan baku per unit dan rute proses (misalnya Potong → Jahit → QC) untuk barang jadi.">
        <Button variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => { setFormError(null); setIsNewOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Create BOM
        </Button>
      </PageHeader>

      {notice && <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">{notice}</div>}
      {boms.error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{boms.error}</div>}
      {boms.loading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <DataTable columns={columns} data={boms.data ?? []} searchKey="productName" searchPlaceholder="Search product..." onRowClick={(b) => setDetail(b)} />
      )}

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{detail?.productName} · {detail?.version}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-bold mb-1">Bahan per unit</div>
                <table className="w-full"><tbody>
                  {detail.lines.map((l) => <tr key={l.id} className="border-t border-border"><td className="py-1.5"><span className="font-mono">{l.componentSku}</span> {l.componentName}</td><td className="py-1.5 text-right">{l.quantityRequired} {l.unit}</td></tr>)}
                </tbody></table>
              </div>
              <div>
                <div className="font-bold mb-1">Rute proses</div>
                {detail.processes?.length ? (
                  <table className="w-full"><tbody>
                    {detail.processes.map((p) => <tr key={p.id} className="border-t border-border"><td className="py-1.5 w-8">{p.sequence}</td><td className="py-1.5">{p.name}</td><td className="py-1.5 text-right text-muted-foreground">{p.standardMinutes ? `${p.standardMinutes} menit/unit` : "-"}</td></tr>)}
                  </tbody></table>
                ) : <p className="text-muted-foreground">BOM ini tidak punya rute proses, jadi produksinya dicatat langsung sebagai selesai.</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create New BOM</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateBom} className="space-y-4 text-xs">
            {formError && <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">{formError}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <label className="space-y-1 font-semibold sm:col-span-2">Output Product *
                <div className="flex gap-1.5">
                  <Input value={productOptions.search} onChange={(e) => productOptions.setSearch(e.target.value)} placeholder="Cari SKU / nama" className="w-32 h-9 text-xs" aria-label="Cari produk" />
                  <select value={productId} onChange={(e) => { setProductId(e.target.value); pick(e.target.value); }} className={select} aria-label="Output product">
                    <option value="">Pilih produk...</option>
                    {options.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                </div>
              </label>
              <label className="space-y-1 font-semibold">Revision<Input value={version} onChange={(e) => setVersion(e.target.value)} /></label>
            </div>

            <div className="space-y-2">
              <div className="font-bold">Bahan per 1 unit *</div>
              {components.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={c.productId} onChange={(e) => { setComponent(i, { productId: e.target.value }); pick(e.target.value); }} className={`${select} col-span-8`} aria-label={`Komponen ${i + 1}`}>
                    <option value="">Pilih komponen...</option>
                    {options.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name} ({p.unit})</option>)}
                  </select>
                  <Input type="number" min={0} step="any" value={c.quantity || ""} onChange={(e) => setComponent(i, { quantity: Number(e.target.value) })} className="col-span-3 h-9 text-xs" aria-label={`Jumlah komponen ${i + 1}`} />
                  <Button type="button" variant="outline" size="sm" className="h-9 col-span-1" disabled={components.length === 1} onClick={() => setComponents((prev) => prev.filter((_, idx) => idx !== i))} aria-label={`Hapus komponen ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setComponents((prev) => [...prev, { productId: "", quantity: 1 }])}><Plus className="h-3.5 w-3.5" /> Tambah bahan</Button>
                <span className="font-semibold">Biaya material per unit: <MoneyDisplay amount={unitCost} /></span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold">Rute proses (opsional)</div>
              <p className="text-[11px] text-muted-foreground">Urutan langkah yang dilalui setiap unit. Unit hanya bisa selesai di satu langkah setelah selesai di langkah sebelumnya. Kosongkan bila produksi dicatat langsung selesai.</p>
              {processes.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-center font-semibold">{i + 1}</span>
                  <Input value={p.name} onChange={(e) => setProcess(i, { name: e.target.value })} placeholder="Nama proses, mis. Potong" className="col-span-5 h-9 text-xs" aria-label={`Nama proses ${i + 1}`} />
                  <Input type="number" min={0} step="any" value={p.minutes} onChange={(e) => setProcess(i, { minutes: e.target.value })} placeholder="Menit/unit" className="col-span-3 h-9 text-xs" aria-label={`Menit proses ${i + 1}`} />
                  <div className="col-span-3 flex gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Naikkan proses ${i + 1}`}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" disabled={i === processes.length - 1} onClick={() => move(i, 1)} aria-label={`Turunkan proses ${i + 1}`}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 px-2" onClick={() => setProcesses((prev) => prev.filter((_, idx) => idx !== i))} aria-label={`Hapus proses ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setProcesses((prev) => [...prev, { name: "", minutes: "" }])}><Plus className="h-3.5 w-3.5" /> Tambah proses</Button>
            </div>

            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold" disabled={!valid || isSubmitting}>{isSubmitting ? "Menyimpan..." : "Create BOM"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
