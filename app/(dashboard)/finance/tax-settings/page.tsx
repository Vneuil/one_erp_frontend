"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useNavigationAccess } from "@/providers/navigation-access";
import { taxApi, SerialRange, TaxSettings } from "@/lib/api/tax";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const emptySettings: TaxSettings = { taxpayerName: "", npwp: "", address: "", isPkp: false };

export default function TaxSettingsPage() {
  const { canApprove } = useNavigationAccess();
  const [settings, setSettings] = React.useState<TaxSettings>(emptySettings);
  const [ranges, setRanges] = React.useState<SerialRange[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [prefix, setPrefix] = React.useState("");
  const [start, setStart] = React.useState(0);
  const [end, setEnd] = React.useState(0);
  const [width, setWidth] = React.useState(8);

  React.useEffect(() => {
    let alive = true;
    Promise.all([taxApi.getSettings(), taxApi.listSerialRanges()])
      .then(([s, r]) => {
        if (!alive) return;
        setSettings({ ...emptySettings, ...s.data });
        setRanges(r.data || []);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat pengaturan pajak.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };
  const reloadRanges = async () => setRanges((await taxApi.listSerialRanges()).data || []);

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs";
  const readOnly = !canApprove("finance");

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan Pajak" description="Identitas penjual pada Faktur Pajak dan pool nomor seri Faktur Pajak Keluaran." />

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}
      {loading && <div className="py-6 text-center text-xs text-muted-foreground">Memuat...</div>}

      {!loading && (
        <>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-bold">Identitas Pengusaha Kena Pajak</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-semibold">Nama wajib pajak<Input value={settings.taxpayerName} onChange={(e) => setSettings({ ...settings, taxpayerName: e.target.value })} /></label>
                <label className="space-y-1 text-xs font-semibold">NPWP (15/16 digit)<Input inputMode="numeric" value={settings.npwp} onChange={(e) => setSettings({ ...settings, npwp: e.target.value })} /></label>
              </div>
              <label className="space-y-1 text-xs font-semibold block">Alamat<Input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={settings.isPkp} onChange={(e) => setSettings({ ...settings, isPkp: e.target.checked })} />
                Perusahaan adalah PKP (hanya PKP yang boleh menerbitkan Faktur Pajak)
              </label>
              <div className="flex justify-end">
                <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || readOnly}
                  onClick={() => run(async () => { const r = await taxApi.updateSettings(settings); setSettings({ ...emptySettings, ...r.data }); }, "Pengaturan pajak disimpan.")}>Simpan</Button>
              </div>
              {readOnly && <p className="text-[11px] text-muted-foreground">Mengubah pengaturan pajak memerlukan hak approve di modul Finance (server juga membatasi ke admin).</p>}
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-bold">Pool nomor seri Faktur Pajak Keluaran</div>
              <p className="text-[11px] text-muted-foreground">Nomor diambil berurutan dari rentang aktif saat Faktur diterbitkan. Tanpa rentang aktif, nomor resmi diisi manual setelah Faktur diterbitkan (mis. nomor dari DJP).</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                <label className="space-y-1 text-xs font-semibold">Awalan<Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="040-26." /></label>
                <label className="space-y-1 text-xs font-semibold">Dari<Input type="number" min={0} value={start || ""} onChange={(e) => setStart(Number(e.target.value))} /></label>
                <label className="space-y-1 text-xs font-semibold">Sampai<Input type="number" min={0} value={end || ""} onChange={(e) => setEnd(Number(e.target.value))} /></label>
                <label className="space-y-1 text-xs font-semibold">Lebar digit<Input type="number" min={1} max={20} value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label>
                <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || readOnly || end < start || end === 0}
                  onClick={() => run(async () => { await taxApi.createSerialRange({ prefix, start, end, width }); await reloadRanges(); setStart(0); setEnd(0); }, "Rentang nomor ditambahkan.")}>Tambah</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>{["Awalan", "Rentang", "Berikutnya", "Sisa", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {ranges.length === 0 && <tr><td className={td} colSpan={6}>Belum ada rentang nomor.</td></tr>}
                    {ranges.map((r) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className={`${td} font-mono`}>{r.prefix || "-"}</td>
                        <td className={`${td} font-mono`}>{String(r.start).padStart(r.width, "0")} – {String(r.end).padStart(r.width, "0")}</td>
                        <td className={`${td} font-mono`}>{r.next <= r.end ? String(r.next).padStart(r.width, "0") : "habis"}</td>
                        <td className={td}>{Math.max(0, r.end - r.next + 1)}</td>
                        <td className={td}>{r.isActive ? "Aktif" : "Nonaktif"}</td>
                        <td className={td}>
                          <Button variant="outline" size="sm" className="h-7 text-[11px]" disabled={busy || readOnly}
                            onClick={() => run(async () => { await taxApi.setSerialRangeActive(r.id, !r.isActive); await reloadRanges(); }, r.isActive ? "Rentang dinonaktifkan." : "Rentang diaktifkan.")}>
                            {r.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
