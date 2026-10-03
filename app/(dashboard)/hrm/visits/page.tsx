"use client";

import * as React from "react";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { hropsApi, VisitPlan } from "@/lib/api/hrops";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const km = (m: number) => `${(m / 1000).toFixed(1)} km`;

/** Reads the device position; rejects with a readable message. */
function currentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("Perangkat ini tidak mendukung lokasi."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? "Izin lokasi ditolak. Aktifkan lokasi untuk situs ini." : "Tidak bisa membaca lokasi saat ini.")),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

export default function VisitPlanPage() {
  const [date, setDate] = React.useState(today());
  const [plan, setPlan] = React.useState<VisitPlan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [customer, setCustomer] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");
  const [radius, setRadius] = React.useState(100);

  React.useEffect(() => {
    let alive = true;
    hropsApi
      .myVisitPlan(date)
      .then((r) => {
        if (!alive) return;
        setPlan(r.data);
        setError(null);
      })
      .catch((e) => alive && setError(errText(e, "Gagal memuat rencana kunjungan.")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date]);

  const run = async (action: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setPlan((await hropsApi.myVisitPlan(date)).data);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = async () => {
    try {
      const p = await currentPosition();
      setLat(p.latitude.toFixed(6));
      setLng(p.longitude.toFixed(6));
    } catch (e) {
      setError(errText(e, "Gagal membaca lokasi."));
    }
  };

  const isToday = date === today();
  const validCoords = lat !== "" && lng !== "" && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 && !(Number(lat) === 0 && Number(lng) === 0);
  const th = "text-left text-[11px] font-bold text-muted-foreground px-3 py-2";
  const td = "px-3 py-2 text-xs align-top";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2"><Route className="h-6 w-6 text-brand-primary" /><span>Rencana Kunjungan & Rute</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Susun kunjungan pelanggan per hari, urutkan rute terdekat dari lokasi Anda, dan check-in hanya bila berada di radius pelanggan pada hari kunjungan.</p>
      </div>

      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs font-semibold">Tanggal<Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-40 text-xs" /></label>
        {plan && plan.stops.length > 0 && <span className="text-xs text-muted-foreground pb-2">{plan.visited}/{plan.stops.length} terkunjungi · panjang rute rencana {km(plan.plannedRouteMeters)}</span>}
        <Button size="sm" variant="outline" disabled={busy || !plan || plan.stops.filter((s) => s.status === "planned").length < 2}
          onClick={() => run(async () => { const p = await currentPosition(); await hropsApi.optimizeVisits({ date, ...p }); }, "Rute diurutkan dari lokasi Anda.")} className="h-9 text-xs font-bold">Urutkan rute terdekat</Button>
      </div>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="text-xs font-bold">Tambah kunjungan</div>
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <label className="space-y-1 text-xs font-semibold sm:col-span-2">Pelanggan<Input value={customer} onChange={(e) => setCustomer(e.target.value)} /></label>
            <label className="space-y-1 text-xs font-semibold sm:col-span-2">Alamat<Input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
            <label className="space-y-1 text-xs font-semibold">Latitude<Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-6.2088" /></label>
            <label className="space-y-1 text-xs font-semibold">Longitude<Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="106.8456" /></label>
            <label className="space-y-1 text-xs font-semibold">Radius (m)<Input type="number" min={20} max={5000} value={radius} onChange={(e) => setRadius(Number(e.target.value))} /></label>
            <div className="sm:col-span-5 flex gap-2">
              <Button size="sm" variant="outline" onClick={useMyLocation} className="h-8 text-xs">Pakai lokasi saya</Button>
              <Button size="sm" disabled={busy || !customer.trim() || !validCoords || date < today()} onClick={() => run(async () => { await hropsApi.planVisits({ date, stops: [{ customerName: customer, address, latitude: Number(lat), longitude: Number(lng), radiusMeters: radius }] }); setCustomer(""); setAddress(""); setLat(""); setLng(""); }, "Kunjungan ditambahkan.")} className="h-8 text-xs font-bold">Tambah</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-2xs">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["#", "Pelanggan", "Koordinat / radius", "Status", "Aksi"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td className={td} colSpan={5}>Memuat...</td></tr>}
              {!loading && plan?.stops.length === 0 && <tr><td className={td} colSpan={5}>Belum ada kunjungan pada tanggal ini.</td></tr>}
              {plan?.stops.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className={td}>{s.seq}</td>
                  <td className={td}><div className="font-semibold">{s.customerName}</div><div className="text-[10px] text-muted-foreground">{s.address}</div></td>
                  <td className={`${td} font-mono text-[11px]`}>{s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}<div className="text-muted-foreground">radius {s.radiusMeters} m</div></td>
                  <td className={td}>
                    {s.status === "planned" && "Direncanakan"}
                    {s.status === "visited" && <span className="text-emerald-700 font-bold">Terkunjungi{s.distanceM !== undefined ? ` (${Math.round(s.distanceM)} m dari titik)` : ""}</span>}
                    {s.status === "skipped" && <span className="text-amber-700">Dilewati: {s.note}</span>}
                  </td>
                  <td className={td}>
                    {s.status === "planned" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="gradient" disabled={busy || !isToday} title={isToday ? undefined : "Check-in hanya pada hari kunjungan"} onClick={() => run(async () => { const p = await currentPosition(); await hropsApi.checkInVisit(s.id, p); }, `Check-in di ${s.customerName} berhasil.`)} className="h-7 px-2 text-[11px] font-bold">Check-in</Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => { const r = window.prompt("Alasan melewati kunjungan ini:"); if (r && r.trim()) run(() => hropsApi.skipVisit(s.id, r.trim()), "Kunjungan dilewati."); }} className="h-7 px-2 text-[11px]">Lewati</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
