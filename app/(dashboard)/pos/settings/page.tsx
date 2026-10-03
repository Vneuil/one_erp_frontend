"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { posApi } from "@/lib/api/pos";
import { defaultPosSettings, PosSettings } from "@/lib/utils/pos-totals";
import { useAppStore } from "@/stores/app-store";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function PosSettingsPage() {
  const isAdmin = useAppStore((s) => s.currentUser?.role?.toLowerCase() === "admin");
  const [s, setS] = React.useState<PosSettings>(defaultPosSettings);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    posApi
      .getSettings()
      .then((r) => alive && r.data && setS({ ...defaultPosSettings, ...r.data }))
      .catch((e) => alive && setError(errText(e, "Gagal memuat pengaturan.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await posApi.updateSettings(s);
      setS({ ...defaultPosSettings, ...r.data });
      setNotice("Pengaturan POS disimpan. Berlaku untuk transaksi berikutnya.");
    } catch (e) {
      setError(errText(e, "Gagal menyimpan."));
    } finally {
      setBusy(false);
    }
  };

  const example = 100_000;
  const rate = s.taxPercent / 100;
  const exTax = s.taxInclusive ? example - example / (1 + rate) : example * rate;
  const exTotal = s.taxInclusive ? example : example + example * rate;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2"><Settings2 className="h-6 w-6 text-brand-primary" /><span>Pengaturan POS</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Pajak penjualan, pembulatan, nama outlet, dan teks struk. {!isAdmin && "Hanya admin yang dapat mengubah."}</p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs font-semibold">Tarif pajak / PPN (%)<Input type="number" min={0} max={100} step="0.01" value={s.taxPercent} disabled={!isAdmin || loading} onChange={(e) => setS({ ...s, taxPercent: Number(e.target.value) })} /></label>
            <label className="space-y-1 text-xs font-semibold">
              Cara pajak
              <select value={s.taxInclusive ? "incl" : "excl"} disabled={!isAdmin || loading} onChange={(e) => setS({ ...s, taxInclusive: e.target.value === "incl" })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                <option value="incl">Harga sudah termasuk pajak</option>
                <option value="excl">Pajak ditambahkan di atas harga</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              Pembulatan total
              <select value={s.roundTo} disabled={!isAdmin || loading} onChange={(e) => setS({ ...s, roundTo: Number(e.target.value) })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                <option value={0}>Tanpa pembulatan</option><option value={100}>Ke Rp100</option><option value={500}>Ke Rp500</option><option value={1000}>Ke Rp1.000</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">Nama outlet bawaan<Input value={s.defaultOutlet} disabled={!isAdmin || loading} onChange={(e) => setS({ ...s, defaultOutlet: e.target.value })} /></label>
          </div>
          <p className="text-[11px] text-muted-foreground rounded bg-slate-50 p-2">
            Contoh: barang Rp100.000 → pajak Rp{Math.round(exTax).toLocaleString("id-ID")}, total bayar Rp{Math.round(exTotal).toLocaleString("id-ID")}.
            {s.taxPercent === 0 && " (Pajak nonaktif: tarif 0%.)"}
          </p>
          <label className="block space-y-1 text-xs font-semibold">Header struk (alamat, NPWP, telepon)<textarea rows={2} value={s.receiptHeader} disabled={!isAdmin || loading} onChange={(e) => setS({ ...s, receiptHeader: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs" /></label>
          <label className="block space-y-1 text-xs font-semibold">Footer struk<textarea rows={2} value={s.receiptFooter} disabled={!isAdmin || loading} onChange={(e) => setS({ ...s, receiptFooter: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs" /></label>
          <label className="block space-y-1 text-xs font-semibold">Kode akun bank untuk QRIS/kartu/transfer (kosong = kas)<Input value={s.nonCashAccountCode} disabled={!isAdmin || loading} onChange={(e) => setS({ ...s, nonCashAccountCode: e.target.value })} placeholder="mis. 1010" /></label>
          {isAdmin && <Button size="sm" disabled={busy || loading} onClick={save} className="h-9 text-xs font-bold">{busy ? "Menyimpan..." : "Simpan Pengaturan"}</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
