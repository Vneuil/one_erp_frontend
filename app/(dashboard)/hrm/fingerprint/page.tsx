"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { API_BASE_URL } from "@/lib/api/client";
import {
  fingerprintApi,
  FingerprintDevice,
  FingerprintPinMap,
  FingerprintPunch,
  FingerprintProtocol,
  IngestResult,
  RegisteredDevice,
} from "@/lib/api/fingerprint";

type Tab = "devices" | "pins" | "punches" | "import";
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-");
const summary = (r: IngestResult) => `${r.stored} punch baru, ${r.duplicates} duplikat, ${r.unresolved} belum terpetakan, ${r.daysSynced} hari absensi diperbarui.`;

// Reads "pin,time" or "pin,date,time" rows (comma, semicolon or tab separated); a header row is skipped.
function parsePunchFile(text: string): { rows: { pin: string; time: string }[]; skipped: number } {
  const rows: { pin: string; time: string }[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2 || !/\d/.test(cols[1])) {
      skipped++;
      continue;
    }
    const time = cols.length >= 3 && /^\d{1,2}:\d{2}/.test(cols[2]) && !/:/.test(cols[1]) ? `${cols[1]} ${cols[2]}` : cols[1];
    rows.push({ pin: cols[0], time });
  }
  return { rows, skipped };
}

export default function FingerprintPage() {
  const [tab, setTab] = React.useState<Tab>("devices");
  const [devices, setDevices] = React.useState<FingerprintDevice[]>([]);
  const [maps, setMaps] = React.useState<FingerprintPinMap[]>([]);
  const [punches, setPunches] = React.useState<FingerprintPunch[]>([]);
  const [unresolvedOnly, setUnresolvedOnly] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [reload, setReload] = React.useState(0);

  const [form, setForm] = React.useState({ serial: "", name: "", location: "", vendor: "", protocol: "adms" as FingerprintProtocol, allowedIp: "" });
  const [secret, setSecret] = React.useState<RegisteredDevice | null>(null);
  const [pin, setPin] = React.useState("");
  const [nip, setNip] = React.useState("");
  const [fileInfo, setFileInfo] = React.useState<{ name: string; rows: { pin: string; time: string }[]; skipped: number } | null>(null);

  React.useEffect(() => {
    let alive = true;
    Promise.all([fingerprintApi.listDevices(), fingerprintApi.listPinMaps(), fingerprintApi.listPunches({ unresolved: unresolvedOnly })])
      .then(([d, m, p]) => {
        if (!alive) return;
        setDevices(d.data || []);
        setMaps(m.data || []);
        setPunches(p.data || []);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(errText(e, "Gagal memuat data fingerprint."));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reload, unresolvedOnly]);

  const run = async (action: () => Promise<string | void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const msg = await action();
      if (msg) setNotice(msg);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
      setReload((n) => n + 1);
    }
  };

  const origin = React.useMemo(() => {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return "https://<alamat-server>";
    }
  }, []);

  const register = () =>
    run(async () => {
      const res = await fingerprintApi.registerDevice({ ...form, allowedIp: form.allowedIp || undefined });
      setSecret(res.data);
      setForm({ serial: "", name: "", location: "", vendor: "", protocol: form.protocol, allowedIp: "" });
      return `Mesin ${res.data.device.serial} terdaftar.`;
    });

  const rotate = (d: FingerprintDevice) => {
    if (!window.confirm(`Buat token baru untuk ${d.serial}? Token lama langsung tidak berlaku.`)) return;
    run(async () => {
      const res = await fingerprintApi.rotateToken(d.serial);
      setSecret(res.data);
      return "Token baru dibuat.";
    });
  };

  const remove = (d: FingerprintDevice) => {
    if (!window.confirm(`Hapus mesin ${d.serial}? Mesin tidak akan bisa mengirim data lagi. Log punch yang sudah masuk tetap tersimpan.`)) return;
    run(async () => {
      await fingerprintApi.deleteDevice(d.serial);
      return `Mesin ${d.serial} dihapus.`;
    });
  };

  const toggle = (d: FingerprintDevice) =>
    run(async () => {
      await fingerprintApi.updateDevice(d.serial, { name: d.name, location: d.location, vendor: d.vendor, allowedIp: d.allowedIp, active: !d.active });
      return d.active ? "Mesin dinonaktifkan." : "Mesin diaktifkan.";
    });

  const addMap = () =>
    run(async () => {
      const res = await fingerprintApi.mapPin(pin, nip);
      setPin("");
      setNip("");
      return `PIN ${res.data.mapping.pin} dipetakan ke ${res.data.mapping.employeeName}. ${summary(res.data.reprocessed)}`;
    });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parsePunchFile(await file.text());
    setFileInfo({ name: file.name, ...parsed });
  };

  const doImport = () =>
    run(async () => {
      if (!fileInfo) return;
      const res = await fingerprintApi.importPunches(fileInfo.rows, fileInfo.name);
      setFileInfo(null);
      const bad = res.data.problems.length ? ` ${res.data.problems.length} baris tidak terbaca (mis. ${res.data.problems[0]}).` : "";
      return `Impor selesai: ${summary(res.data.result)}${bad}`;
    });

  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs align-top";
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-xs";
  const unresolvedCount = punches.filter((p) => !p.resolved).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Mesin Fingerprint" description="Daftarkan mesin absensi, petakan PIN ke karyawan, dan pantau log punch. Punch pertama hari itu menjadi jam masuk, punch terakhir menjadi jam pulang." />

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <div className="flex flex-wrap gap-1.5">
        {([["devices", "Mesin"], ["pins", "Pemetaan PIN"], ["punches", "Log Punch"], ["import", "Impor File"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${tab === k ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "devices" && (
        <>
          {secret && (
            <Card className="border-amber-300 bg-amber-50 shadow-2xs">
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="font-bold text-sm">Pengaturan mesin {secret.device.serial}</div>
                {secret.device.protocol === "adms" ? (
                  <>
                    <p>Pada menu <b>Comm / Cloud Server / ADMS</b> mesin, isi alamat server <code className="font-mono">{origin}</code> (port sesuai server, HTTPS bila tersedia). Mesin akan memanggil <code className="font-mono">/iclock/cdata</code> memakai nomor serialnya, jadi serial yang didaftarkan harus sama persis dengan yang tertera di mesin.</p>
                    <p>Mesin ADMS tidak mengirim token, sehingga satu-satunya penjaga adalah daftar serial. Isi <b>IP yang diizinkan</b> bila mesin punya IP publik tetap.</p>
                  </>
                ) : (
                  <>
                    <p>Kirim <code className="font-mono">POST {origin}/fingerprint-push</code> dengan header <code className="font-mono">X-Device-Serial: {secret.device.serial}</code> dan <code className="font-mono">X-Device-Token</code> di bawah. Isi: <code className="font-mono">{`{"punches":[{"pin":"12","time":"2026-03-10 08:01:00"}]}`}</code> (waktu WIB).</p>
                    {secret.token && <p className="font-mono break-all bg-white border border-amber-200 rounded px-2 py-1">Token: {secret.token}</p>}
                    <p className="text-amber-800">Token hanya ditampilkan sekarang. Simpan sebelum menutup panel ini.</p>
                  </>
                )}
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setSecret(null)}>Tutup</Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-bold">Daftarkan mesin</div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <label className="space-y-1 text-xs font-semibold">No. Serial (SN) *<Input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} /></label>
                <label className="space-y-1 text-xs font-semibold">Nama *<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pintu depan" /></label>
                <label className="space-y-1 text-xs font-semibold">Lokasi<Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
                <label className="space-y-1 text-xs font-semibold">Merk / model<Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></label>
                <label className="space-y-1 text-xs font-semibold">Protokol
                  <select className={sel} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value as FingerprintProtocol })}>
                    <option value="adms">ADMS / iclock (push)</option>
                    <option value="generic">JSON + token</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold">IP diizinkan<Input value={form.allowedIp} onChange={(e) => setForm({ ...form, allowedIp: e.target.value })} placeholder="opsional" /></label>
              </div>
              <div className="flex justify-end"><Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !form.serial.trim() || !form.name.trim()} onClick={register}>Daftarkan</Button></div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["Mesin", "Serial", "Protokol", "Terakhir terhubung", "Punch terakhir", "Status", ""].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {loading && <tr><td className={td} colSpan={7}>Memuat...</td></tr>}
                  {!loading && devices.length === 0 && <tr><td className={td} colSpan={7}>Belum ada mesin terdaftar.</td></tr>}
                  {devices.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className={td}><div className="font-semibold">{d.name}</div><div className="text-[10px] text-muted-foreground">{[d.vendor, d.location].filter(Boolean).join(" · ")}</div></td>
                      <td className={`${td} font-mono`}>{d.serial}</td>
                      <td className={td}>{d.protocol === "adms" ? "ADMS" : "JSON"}</td>
                      <td className={td}>{fmtTime(d.lastSeenAt)}{d.lastIp ? <div className="text-[10px] text-muted-foreground font-mono">{d.lastIp}</div> : null}</td>
                      <td className={td}>{fmtTime(d.lastPunchAt)}</td>
                      <td className={td}>{d.active ? "Aktif" : <span className="text-rose-700 font-bold">Nonaktif</span>}</td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => toggle(d)}>{d.active ? "Nonaktifkan" : "Aktifkan"}</Button>
                          {d.protocol === "generic" && <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy} onClick={() => rotate(d)}>Token baru</Button>}
                          <Button size="sm" variant="outline" className="h-7 text-[11px] text-rose-700" disabled={busy} onClick={() => remove(d)}>Hapus</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "pins" && (
        <>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-bold">Petakan PIN mesin ke karyawan</div>
              <p className="text-xs text-muted-foreground">PIN yang sama dengan NIP karyawan otomatis dikenali. Untuk PIN numerik di mesin (1, 2, 3...), petakan ke NIP di sini; punch yang menunggu langsung diproses.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <label className="space-y-1 text-xs font-semibold">PIN di mesin<Input value={pin} onChange={(e) => setPin(e.target.value)} /></label>
                <label className="space-y-1 text-xs font-semibold">NIP karyawan<Input value={nip} onChange={(e) => setNip(e.target.value)} placeholder="EMP-001" /></label>
                <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || !pin.trim() || !nip.trim()} onClick={addMap}>Petakan</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["PIN", "NIP", "Karyawan", ""].map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {!loading && maps.length === 0 && <tr><td className={td} colSpan={4}>Belum ada pemetaan.</td></tr>}
                  {maps.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className={`${td} font-mono`}>{m.pin}</td>
                      <td className={`${td} font-mono`}>{m.nip}</td>
                      <td className={td}>{m.employeeName}</td>
                      <td className={td}><Button size="sm" variant="outline" className="h-7 text-[11px] text-rose-700" disabled={busy} onClick={() => run(async () => { await fingerprintApi.deletePinMap(m.id); return "Pemetaan dihapus."; })}>Hapus</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "punches" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={unresolvedOnly} onChange={(e) => setUnresolvedOnly(e.target.checked)} /> Hanya yang belum terpetakan{unresolvedOnly ? ` (${unresolvedCount})` : ""}</label>
            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={busy} onClick={() => run(async () => `Diproses ulang: ${summary(await fingerprintApi.reprocess().then((r) => r.data))}`)}>Proses ulang</Button>
          </div>
          <Card className="border-border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead><tr>{["Waktu (WIB)", "Mesin", "PIN", "Karyawan", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {!loading && punches.length === 0 && <tr><td className={td} colSpan={5}>{unresolvedOnly ? "Tidak ada punch yang menunggu pemetaan." : "Belum ada punch."}</td></tr>}
                  {punches.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className={td}>{fmtTime(p.punchedAt)}</td>
                      <td className={`${td} font-mono`}>{p.deviceSerial}</td>
                      <td className={`${td} font-mono`}>{p.pin}</td>
                      <td className={td}>{p.employeeName ? `${p.employeeName} (${p.nip})` : "-"}</td>
                      <td className={td}>{p.resolved ? "Masuk absensi" : <span className="text-amber-700 font-bold">Belum terpetakan</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "import" && (
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-3">
            <div className="text-xs font-bold">Impor log dari file</div>
            <p className="text-xs text-muted-foreground">Untuk mesin yang tidak bisa push: unduh log dari mesin (USB/aplikasi bawaan), simpan sebagai CSV, lalu unggah di sini. Format kolom: <span className="font-mono">PIN, waktu</span> atau <span className="font-mono">PIN, tanggal, jam</span> (contoh 2026-03-10 08:01:00). Waktu dianggap WIB. Mengunggah file yang sama dua kali aman, duplikat dilewati.</p>
            <input type="file" accept=".csv,.txt,.tsv,.log" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs" />
            {fileInfo && (
              <div className="text-xs space-y-2">
                <div>{fileInfo.name}: <b>{fileInfo.rows.length}</b> baris terbaca{fileInfo.skipped ? `, ${fileInfo.skipped} baris dilewati (header/kosong)` : ""}.</div>
                {fileInfo.rows.length > 0 && <div className="font-mono text-[11px] text-muted-foreground">Contoh: PIN {fileInfo.rows[0].pin} · {fileInfo.rows[0].time}</div>}
                <Button size="sm" className="h-9 text-xs font-bold" disabled={busy || fileInfo.rows.length === 0 || fileInfo.rows.length > 20000} onClick={doImport}>{busy ? "Mengimpor..." : "Impor punch"}</Button>
                {fileInfo.rows.length > 20000 && <div className="text-rose-700">Maksimal 20.000 baris per file. Pecah file menjadi beberapa bagian.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
