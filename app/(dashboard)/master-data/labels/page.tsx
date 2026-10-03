"use client";

import * as React from "react";
import { Tags, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { productsApi, ProductItem } from "@/lib/api/products";
import { canEncode128, code128Runs, code128Width } from "@/lib/utils/code128";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

/** One barcode as inline SVG, drawn from the Code 128 runs. */
function BarcodeSvg({ text, height = 34 }: { text: string; height?: number }) {
  const runs = code128Runs(text);
  const width = code128Width(text);
  let x = 10; // quiet zone
  const bars: React.ReactNode[] = [];
  runs.forEach((w, i) => {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={w} height={height} fill="#000" />);
    x += w;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={`Barcode ${text}`} shapeRendering="crispEdges">
      <rect width={width} height={height} fill="#fff" />
      {bars}
    </svg>
  );
}

export default function LabelPrintPage() {
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copies, setCopies] = React.useState<Record<string, number>>({});
  const [search, setSearch] = React.useState("");
  const [showPrice, setShowPrice] = React.useState(true);
  const [widthMm, setWidthMm] = React.useState(50);
  const [heightMm, setHeightMm] = React.useState(30);

  React.useEffect(() => {
    let alive = true;
    productsApi
      .list({ perPage: 500 })
      .then((r) => alive && setProducts(r.data || []))
      .catch((e) => alive && setError(errText(e, "Gagal memuat produk.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const code = (p: ProductItem) => (p.barcode && p.barcode.trim()) || p.sku;
  const q = search.trim().toLowerCase();
  const shown = products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  const labels = products.flatMap((p) => Array.from({ length: Math.max(0, Math.min(500, copies[p.id] ?? 0)) }, (_, i) => ({ p, key: `${p.id}-${i}` })));

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #label-sheet, #label-sheet * { visibility: visible !important; }
          #label-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 4mm; }
        }
      `}</style>

      <div className="print:hidden space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2"><Tags className="h-6 w-6 text-brand-primary" /><span>Cetak Label Barcode</span></h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Pilih produk dan jumlah label, lalu cetak. Barcode memakai kolom Barcode produk; bila kosong dipakai SKU. Format Code 128, terbaca oleh pemindai umum.</p>
        </div>
        {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex flex-wrap items-end gap-4 text-xs font-semibold">
            <label className="space-y-1">Lebar label (mm)<Input type="number" min={20} max={120} value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value))} className="h-8 w-24 text-xs" /></label>
            <label className="space-y-1">Tinggi label (mm)<Input type="number" min={15} max={80} value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value))} className="h-8 w-24 text-xs" /></label>
            <label className="flex items-center gap-1.5 pb-1.5"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} /> Tampilkan harga</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk…" className="h-8 w-48 text-xs" />
            <Button size="sm" disabled={labels.length === 0} onClick={() => window.print()} className="h-8 gap-1 text-xs font-bold"><Printer className="h-3.5 w-3.5" /> Cetak {labels.length} label</Button>
            <Button size="sm" variant="outline" disabled={labels.length === 0} onClick={() => setCopies({})} className="h-8 text-xs">Reset jumlah</Button>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-0 overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead><tr>{["Produk", "SKU", "Kode barcode", "Harga", "Jumlah label"].map((h) => <th key={h} className="text-left text-[11px] font-bold text-muted-foreground px-3 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {loading && <tr><td className="px-3 py-2 text-xs" colSpan={5}>Memuat produk...</td></tr>}
                {shown.map((p) => {
                  const ok = canEncode128(code(p));
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 text-xs font-semibold">{p.name}{p.variantLabel ? ` · ${p.variantLabel}` : ""}</td>
                      <td className="px-3 py-2 text-xs font-mono">{p.sku}</td>
                      <td className="px-3 py-2 text-xs font-mono">{ok ? code(p) : <span className="text-rose-600">tidak dapat dikodekan</span>}</td>
                      <td className="px-3 py-2 text-xs">{rupiah(p.sellingPrice)}</td>
                      <td className="px-3 py-2"><Input type="number" min={0} max={500} disabled={!ok} value={copies[p.id] ?? ""} onChange={(e) => setCopies((c) => ({ ...c, [p.id]: Number(e.target.value) }))} className="h-7 w-20 text-xs" aria-label={`Jumlah label ${p.name}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div id="label-sheet" className="flex flex-wrap gap-1">
        {labels.map(({ p, key }) => (
          <div key={key} style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, breakInside: "avoid" }} className="border border-dashed border-slate-300 print:border-0 p-1 flex flex-col justify-between overflow-hidden bg-white text-black">
            <div className="text-[9px] font-bold leading-tight line-clamp-2">{p.name}{p.variantLabel ? ` · ${p.variantLabel}` : ""}</div>
            <BarcodeSvg text={code(p)} height={Math.max(14, heightMm * 0.9 - 12)} />
            <div className="flex justify-between text-[9px] font-mono"><span>{code(p)}</span>{showPrice && <span className="font-bold">{rupiah(p.sellingPrice)}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
