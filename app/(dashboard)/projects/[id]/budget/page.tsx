"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calculator, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/shared/money-display";
import { downloadCsv } from "@/lib/utils/csv";
import { parseDelimited, parseNumber } from "@/lib/utils/csv-parse";
import { projectCostApi, BudgetView, BudgetLineInput, CostEntryItem } from "@/lib/api/projectcost";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const HEADERS = ["kind", "category", "description", "quantity", "unit", "unitPrice"];

/** Reads a spreadsheet (header row required) into budget lines; returns problems by sheet row. */
function readSheet(text: string): { lines: BudgetLineInput[]; problems: string[] } {
  const rows = parseDelimited(text);
  if (rows.length < 2) return { lines: [], problems: ["Berkas kosong atau hanya berisi judul kolom."] };
  const header = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const col = (name: string, ...aliases: string[]) => header.findIndex((h) => [name, ...aliases].includes(h));
  const idx = {
    kind: col("kind", "jenis", "tipe"),
    category: col("category", "kategori"),
    description: col("description", "deskripsi", "uraian", "item"),
    quantity: col("quantity", "qty", "volume", "jumlah"),
    unit: col("unit", "satuan"),
    unitPrice: col("unitprice", "harga", "hargasatuan", "price"),
  };
  const missing = (["kind", "category", "description", "quantity", "unitPrice"] as const).filter((k) => idx[k] < 0);
  if (missing.length) return { lines: [], problems: [`Kolom wajib tidak ditemukan: ${missing.join(", ")}. Judul kolom yang dibaca: ${HEADERS.join(", ")}.`] };
  const lines: BudgetLineInput[] = [];
  const problems: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const quantity = parseNumber(r[idx.quantity] ?? "");
    const unitPrice = parseNumber(r[idx.unitPrice] ?? "");
    if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
      problems.push(`Baris ${i + 1}: jumlah atau harga bukan angka.`);
      return;
    }
    lines.push({ kind: (r[idx.kind] ?? "").toLowerCase(), category: r[idx.category] ?? "", description: r[idx.description] ?? "", quantity, unit: idx.unit >= 0 ? r[idx.unit] : "", unitPrice });
  });
  return { lines, problems };
}

export default function ProjectBudgetPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = React.useState<BudgetView | null>(null);
  const [costs, setCosts] = React.useState<CostEntryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [sheet, setSheet] = React.useState("");
  const [mode, setMode] = React.useState<"append" | "replace">("replace");
  const [preview, setPreview] = React.useState<{ lines: BudgetLineInput[]; problems: string[] } | null>(null);

  const [cCategory, setCCategory] = React.useState("");
  const [cAmount, setCAmount] = React.useState(0);
  const [cDesc, setCDesc] = React.useState("");
  const [cDate, setCDate] = React.useState(today());

  const loadAll = React.useCallback(() => Promise.all([projectCostApi.budget(id), projectCostApi.costs(id)]), [id]);

  React.useEffect(() => {
    let alive = true;
    loadAll()
      .then(([b, c]) => {
        if (!alive) return;
        setView(b.data);
        setCosts(c.data || []);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat anggaran.")))
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
      const [b, c] = await loadAll();
      setView(b.data);
      setCosts(c.data || []);
      setNotice(okText);
    } catch (e) {
      // A rejected import lists every bad row, so the sheet can be fixed in one pass.
      const rows = (e as { details?: { row: number; message: string }[] }).details;
      const list = Array.isArray(rows) ? rows.slice(0, 8).map((r) => `baris ${r.row}: ${r.message}`).join("; ") : "";
      setError(list ? `${errText(e, "Impor gagal.")} — ${list}${rows && rows.length > 8 ? ` (+${rows.length - 8} lainnya)` : ""}` : errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setSheet(text);
    setPreview(readSheet(text));
  };

  const s = view?.summary;
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs"><Link href={`/projects/${id}`}><ArrowLeft className="h-3.5 w-3.5" /> Kembali ke proyek</Link></Button>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2"><Calculator className="h-6 w-6 text-brand-primary" /><span>RAB, RAP & Realisasi Biaya</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground">RAB = anggaran yang ditagihkan ke klien. RAP = rencana biaya internal. Catat biaya aktual per kategori untuk memantau selisih terhadap RAP.</p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}
      {loading && <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>}

      {s && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">RAB (nilai kontrak)</div><div className="text-xl font-black"><MoneyDisplay amount={s.rab} /></div></CardContent></Card>
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">RAP (rencana biaya)</div><div className="text-xl font-black"><MoneyDisplay amount={s.rap} /></div><div className="text-[11px] text-muted-foreground">margin rencana <MoneyDisplay amount={s.plannedMargin} /> ({s.plannedMarginPct}%)</div></CardContent></Card>
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Biaya aktual</div><div className={`text-xl font-black ${s.overBudget ? "text-rose-700" : ""}`}><MoneyDisplay amount={s.actual} /></div><div className="text-[11px] text-muted-foreground">{s.rap > 0 ? `${Math.round((s.actual / s.rap) * 100)}% dari RAP` : "belum ada RAP"}</div></CardContent></Card>
            <Card className="border-border shadow-2xs"><CardContent className="p-4"><div className="text-xs text-muted-foreground font-semibold">Margin sementara (RAB − aktual)</div><div className={`text-xl font-black ${s.projectedMargin < 0 ? "text-rose-700" : "text-emerald-700"}`}><MoneyDisplay amount={s.projectedMargin} /></div></CardContent></Card>
          </div>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <div className="px-3 pt-3 text-xs font-bold">Rencana vs aktual per kategori {s.overBudget && <span className="ml-2 text-rose-700">⚠ ada kategori melebihi RAP</span>}</div>
              <table className="w-full">
                <thead><tr>{["Kategori", "RAP", "Aktual", "Selisih", "Terpakai"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {s.categories.length === 0 && <tr><td className={td} colSpan={5}>Belum ada RAP atau biaya.</td></tr>}
                  {s.categories.map((c) => (
                    <tr key={c.category} className="border-t border-border">
                      <td className={`${td} font-semibold`}>{c.category}{c.planned === 0 && <span className="ml-1.5 text-[10px] text-rose-600">tanpa RAP</span>}</td>
                      <td className={td}><MoneyDisplay amount={c.planned} /></td><td className={td}><MoneyDisplay amount={c.actual} /></td>
                      <td className={`${td} font-bold ${c.over ? "text-rose-700" : "text-emerald-700"}`}><MoneyDisplay amount={c.variance} /></td>
                      <td className={td}>{c.planned > 0 ? `${c.usedPct}%` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="text-xs font-bold">Catat biaya aktual</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs font-semibold">Kategori<Input value={cCategory} onChange={(e) => setCCategory(e.target.value)} placeholder="Material, Tenaga, ..." list="cat-list" /></label>
                  <datalist id="cat-list">{s.categories.map((c) => <option key={c.category} value={c.category} />)}</datalist>
                  <label className="space-y-1 text-xs font-semibold">Jumlah (Rp)<Input type="number" min={0} value={cAmount || ""} onChange={(e) => setCAmount(Number(e.target.value))} /></label>
                  <label className="space-y-1 text-xs font-semibold">Tanggal<Input type="date" max={today()} value={cDate} onChange={(e) => setCDate(e.target.value)} /></label>
                  <label className="space-y-1 text-xs font-semibold">Keterangan<Input value={cDesc} onChange={(e) => setCDesc(e.target.value)} /></label>
                </div>
                <Button size="sm" disabled={busy || !cCategory.trim() || cAmount <= 0} onClick={() => run(async () => { await projectCostApi.recordCost(id, { category: cCategory, amount: cAmount, description: cDesc, date: cDate }); setCAmount(0); setCDesc(""); }, "Biaya dicatat.")} className="h-8 text-xs font-bold">Catat</Button>
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {costs.slice(0, 30).map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs">
                      <span>{c.date} · <b>{c.category}</b>{c.description ? ` · ${c.description}` : ""}</span>
                      <span className="flex items-center gap-2"><MoneyDisplay amount={c.amount} /><button onClick={() => window.confirm("Hapus catatan biaya ini?") && run(() => projectCostApi.deleteCost(id, c.id), "Biaya dihapus.")} className="text-rose-600 cursor-pointer" aria-label="Hapus">✕</button></span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold">Impor RAB / RAP dari spreadsheet</div>
                  <Button size="sm" variant="outline" onClick={() => downloadCsv("template-rab-rap.csv", HEADERS, [["rab", "Material", "Semen 50kg", 100, "sak", 65000], ["rap", "Material", "Semen 50kg", 100, "sak", 58000]])} className="h-7 gap-1 text-[11px]"><Download className="h-3 w-3" /> Template</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Kolom: kind (rab/rap), category, description, quantity, unit, unitPrice. Pemisah koma, titik koma, atau tab; angka boleh berformat 1.234,56. Bila ada satu baris salah, tidak ada yang diimpor.</p>
                <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs" aria-label="Berkas CSV" />
                <textarea value={sheet} onChange={(e) => { setSheet(e.target.value); setPreview(e.target.value.trim() ? readSheet(e.target.value) : null); }} rows={4} placeholder="…atau tempel isi spreadsheet di sini" className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono" />
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1"><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Ganti (jenis yang diunggah)</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={mode === "append"} onChange={() => setMode("append")} /> Tambahkan</label>
                </div>
                {preview && (
                  <p className={`text-xs ${preview.problems.length ? "text-rose-700" : "text-emerald-700"}`}>
                    {preview.problems.length ? preview.problems.slice(0, 4).join(" ") : `${preview.lines.length} baris siap diimpor.`}
                  </p>
                )}
                <Button size="sm" disabled={busy || !preview || preview.problems.length > 0 || preview.lines.length === 0} onClick={() => preview && run(async () => { await projectCostApi.importBudget(id, mode, preview.lines); setSheet(""); setPreview(null); }, "Anggaran diimpor.")} className="h-8 gap-1 text-xs font-bold"><Upload className="h-3.5 w-3.5" /> Impor</Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["Jenis", "Kategori", "Uraian", "Volume", "Satuan", "Harga satuan", "Jumlah", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {view?.items.length === 0 && <tr><td className={td} colSpan={8}>Belum ada baris anggaran. Impor dari spreadsheet di atas.</td></tr>}
                  {view?.items.map((it) => (
                    <tr key={it.id} className="border-t border-border">
                      <td className={`${td} uppercase font-bold`}>{it.kind}</td><td className={td}>{it.category}</td><td className={td}>{it.description}</td><td className={td}>{it.quantity}</td><td className={td}>{it.unit}</td>
                      <td className={td}><MoneyDisplay amount={it.unitPrice} /></td><td className={`${td} font-semibold`}><MoneyDisplay amount={it.amount} /></td>
                      <td className={td}><button onClick={() => window.confirm("Hapus baris ini?") && run(() => projectCostApi.deleteBudgetLine(id, it.id), "Baris dihapus.")} className="text-rose-600 cursor-pointer" aria-label="Hapus">✕</button></td>
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
