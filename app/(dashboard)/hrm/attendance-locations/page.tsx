"use client";

import * as React from "react";
import { MapPin, Trash2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { hrmApi, AttendanceLocationItem } from "@/lib/api/hrm";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function AttendanceLocationsPage() {
  const [items, setItems] = React.useState<AttendanceLocationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [lat, setLat] = React.useState("");
  const [lng, setLng] = React.useState("");
  const [radius, setRadius] = React.useState("100");

  React.useEffect(() => {
    let alive = true;
    hrmApi
      .listAttendanceLocations()
      .then((r) => alive && setItems(r.data || []))
      .catch((e) => alive && setError(errText(e, "Gagal memuat lokasi absensi.")))
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
      const r = await hrmApi.listAttendanceLocations();
      setItems(r.data || []);
      setNotice(okText);
    } catch (e) {
      setError(errText(e, "Aksi gagal."));
    } finally {
      setBusy(false);
    }
  };

  const useHere = () => {
    if (!navigator.geolocation) return setError("Peramban tidak mendukung lokasi.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLng(p.coords.longitude.toFixed(6));
      },
      () => setError("Tidak bisa membaca lokasi. Isi koordinat secara manual."),
    );
  };

  const latN = Number(lat);
  const lngN = Number(lng);
  const radiusN = Number(radius);
  const valid = name.trim() !== "" && lat !== "" && lng !== "" && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180 && radiusN >= 10;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-brand-dark flex items-center gap-2"><MapPin className="h-5 w-5" /> Lokasi Absensi</h1>
        <p className="text-xs text-muted-foreground">
          Bila ada lokasi aktif, karyawan hanya bisa clock-in di dalam radius salah satu lokasi. Tanpa lokasi, clock-in bebas. Hanya admin yang dapat mengubah.
        </p>
      </div>
      {error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
      {notice && <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">{notice}</div>}

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-5 items-end">
          <label className="space-y-1 text-xs font-semibold sm:col-span-2">Nama lokasi<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kantor Pusat" /></label>
          <label className="space-y-1 text-xs font-semibold">Latitude<Input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-6.2" /></label>
          <label className="space-y-1 text-xs font-semibold">Longitude<Input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="106.8" /></label>
          <label className="space-y-1 text-xs font-semibold">Radius (m)<Input inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} /></label>
          <div className="sm:col-span-5 flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={useHere} className="gap-1 text-xs"><LocateFixed className="h-3.5 w-3.5" /> Pakai lokasi saya</Button>
            <Button
              size="sm"
              disabled={busy || !valid}
              onClick={() => run(async () => {
                await hrmApi.createAttendanceLocation({ name: name.trim(), latitude: latN, longitude: lngN, radiusMeters: radiusN });
                setName(""); setLat(""); setLng("");
              }, "Lokasi ditambahkan.")}
              className="text-xs font-bold"
            >Tambah lokasi</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? <p className="p-4 text-xs text-muted-foreground">Memuat…</p> : items.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">Belum ada lokasi. Clock-in tidak dibatasi lokasi.</p>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground border-b"><th className="p-3">Nama</th><th className="p-3">Koordinat</th><th className="p-3">Radius</th><th className="p-3"></th></tr></thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="p-3 font-semibold">{l.name}</td>
                    <td className="p-3 font-mono">{l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}</td>
                    <td className="p-3">{l.radiusMeters} m</td>
                    <td className="p-3 text-right">
                      <button
                        aria-label={`Hapus ${l.name}`}
                        disabled={busy}
                        onClick={() => window.confirm(`Hapus lokasi ${l.name}?`) && run(() => hrmApi.deleteAttendanceLocation(l.id), "Lokasi dihapus.")}
                        className="p-1 rounded text-muted-foreground hover:text-rose-600 cursor-pointer"
                      ><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
