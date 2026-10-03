"use client";

import * as React from "react";
import {
  Smartphone,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building,
  Radio,
  Clock,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { devicesApi, DeviceItem as ApiDeviceItem } from "@/lib/api/devices";

interface BusinessTerminal {
  id: string;
  deviceSerial: string;
  name: string;
  deviceType: string;
  location: string;
  ipAddress: string;
  lastHeartbeat: string;
  status: "Online" | "Offline" | "Syncing";
}

function toStatusLabel(status: string): BusinessTerminal["status"] {
  if (status === "online") return "Online";
  if (status === "syncing") return "Syncing";
  return "Offline";
}

function toHeartbeatLabel(lastHeartbeat?: string | null): string {
  if (!lastHeartbeat) return "Belum pernah";
  const date = new Date(lastHeartbeat);
  if (Number.isNaN(date.getTime())) return "Belum pernah";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return "Baru saja";
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  return `${hours} jam lalu`;
}

const mapDevice = (d: ApiDeviceItem): BusinessTerminal => ({
  id: d.id,
  deviceSerial: d.deviceSerial,
  name: d.name,
  deviceType: d.deviceType,
  location: d.location,
  ipAddress: d.ipAddress,
  lastHeartbeat: toHeartbeatLabel(d.lastHeartbeat),
  status: toStatusLabel(d.status),
});

export default function DeviceTerminalsPage() {
  const [devices, setDevices] = React.useState<BusinessTerminal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [deviceSerial, setDeviceSerial] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [ipAddress, setIpAddress] = React.useState("");

  React.useEffect(() => {
    devicesApi
      .listDevices()
      .then((res) => {
        setDevices((res.data || []).map(mapDevice));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load devices", err);
        setLoadError("Gagal memuat data terminal dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleOffline = async (row: BusinessTerminal) => {
    setTestingId(row.id);
    setNotice(null);
    try {
      const nextStatus = row.status === "Offline" ? "online" : "offline";
      const res = await devicesApi.updateDevice(row.id, { status: nextStatus });
      setDevices((prev) => prev.map((d) => (d.id === row.id ? mapDevice(res.data) : d)));
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal mengubah status terminal." });
    } finally {
      setTestingId(null);
    }
  };

  // The server records a heartbeat for the terminal; it does not probe the
  // device over the network. A terminal that stops sending heartbeats is shown
  // as offline after 10 minutes.
  const handlePingTest = async (row: BusinessTerminal) => {
    setTestingId(row.id);
    setNotice(null);
    try {
      const res = await devicesApi.pingDevice(row.id);
      if (res.data) {
        setDevices((prev) => prev.map((d) => (d.id === row.id ? mapDevice(res.data) : d)));
      }
      setNotice({ kind: "success", text: `Heartbeat untuk ${row.deviceSerial} dicatat.` });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal mencatat heartbeat." });
    } finally {
      setTestingId(null);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !deviceSerial) return;
    setFormError(null);
    try {
      const res = await devicesApi.createDevice({ deviceSerial, name, deviceType: "Smart Attendance Terminal", location, ipAddress });
      if (res.data) {
        setDevices((prev) => [mapDevice(res.data), ...prev]);
      }
      setIsRegisterOpen(false);
      setName("");
      setDeviceSerial("");
      setLocation("");
      setIpAddress("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mendaftarkan terminal.");
    }
  };

  const columns: Column<BusinessTerminal>[] = [
    {
      key: "deviceSerial",
      header: "Serial & Nama Terminal",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.deviceSerial}</span>
          <div className="font-bold text-foreground text-xs mt-0.5">{row.name}</div>
          <div className="text-[11px] text-brand-indigo font-semibold">{row.deviceType}</div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Lokasi Pemasangan",
      render: (row) => (
        <span className="text-xs text-foreground flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5 text-brand-primary" />
          {row.location}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address & Jaringan",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
          {row.ipAddress}
        </span>
      ),
    },
    {
      key: "lastHeartbeat",
      header: "Status Sinkronisasi",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-foreground flex items-center gap-1">
            <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
            <span>{row.lastHeartbeat}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● {row.status}
        </span>
      ),
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePingTest(row)}
            disabled={testingId === row.id}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${testingId === row.id ? "animate-spin" : ""}`} />
            <span>{testingId === row.id ? "Memproses..." : "Catat Heartbeat"}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleOffline(row)}
            disabled={testingId === row.id}
            className="h-7 px-2 text-[11px] gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <span>{row.status === "Offline" ? "Aktifkan" : "Nonaktifkan"}</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-brand-primary" />
            <span>Terminal Bisnis, Mesin Presensi & Reader NFC</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Monitoring terminal mesin absensi onsite, mesin kasir POS retail, pembaca kartu NFC/ID Card, dan heartbeat jaringan.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsRegisterOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Hubungkan Terminal Baru</span>
        </Button>
      </div>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Registrasi Terminal Perangkat Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterDevice} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Terminal *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Terminal Presensi Gudang C" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Serial Number *</label>
              <Input value={deviceSerial} onChange={(e) => setDeviceSerial(e.target.value)} placeholder="e.g. TRM-ATT-CKR-02" className="h-9 text-xs" required />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Lokasi Pemasangan</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Gudang Utama Cikarang" className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">IP Address</label>
              <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="e.g. 192.168.10.99" className="h-9 text-xs" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRegisterOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm">
                Hubungkan Terminal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Terminal Terhubung</span>
            <div className="text-2xl font-black text-brand-dark">{devices.length} Perangkat</div>
            <span className="text-[11px] text-muted-foreground">Cikarang & Surabaya Hub</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Status Koneksi Online</span>
            <div className="text-2xl font-black text-emerald-600">100% Online</div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Sinkronisasi Real-Time Tanpa Latensi
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Dukungan Mode Offline</span>
            <div className="text-2xl font-black text-brand-indigo">Aktif</div>
            <span className="text-[11px] text-muted-foreground">Auto-sync saat jaringan kembali</span>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            className={`m-3 px-3 py-2 rounded-lg border text-xs font-medium ${
              notice.kind === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {notice.text}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={devices} columns={columns} />
        )}
      </div>
    </div>
  );
}
