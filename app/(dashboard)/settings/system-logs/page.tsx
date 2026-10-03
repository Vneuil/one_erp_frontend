"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { systemLogsApi, SystemLogEntry } from "@/lib/api/system-logs";

const AUTO_REFRESH_MS = 15000;

export default function SystemLogsPage() {
  const [entries, setEntries] = React.useState<SystemLogEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const fetchLogs = React.useCallback(() => {
    systemLogsApi
      .list({ limit: 200 })
      .then((res) => {
        setEntries(res.data?.entries || []);
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load system logs", err);
        setLoadError(
          err instanceof Error
            ? err.message
            : "Gagal memuat backend logs. Pastikan akun Anda memiliki role admin."
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    setIsLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const columns: Column<SystemLogEntry>[] = [
    {
      key: "time",
      header: "Waktu",
      render: (e) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(e.time).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
          {e.status}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (e) => <span className="text-xs font-semibold text-foreground">{e.method}</span>,
    },
    {
      key: "path",
      header: "Endpoint",
      render: (e) => <span className="font-mono text-[11px] text-muted-foreground">{e.path}</span>,
    },
    {
      key: "userEmail",
      header: "Pengguna",
      render: (e) => <span className="text-xs text-foreground">{e.userEmail || "-"}</span>,
    },
    {
      key: "message",
      header: "Pesan Error",
      render: (e) => (
        <button
          type="button"
          onClick={() => setExpandedId((current) => (current === e.id ? null : e.id))}
          className="text-left text-xs text-rose-700 hover:underline line-clamp-1 max-w-md"
          title="Klik untuk lihat detail lengkap"
        >
          {e.message}
        </button>
      ),
    },
  ];

  const expandedEntry = entries.find((e) => e.id === expandedId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backend Logs"
        description="Error 500 dan panic terbaru dari server, untuk debugging langsung tanpa akses shell. Hanya menampilkan error dari perusahaan Anda sendiri."
      >
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "gradient" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh Aktif" : "Auto-refresh Mati"}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold" onClick={fetchLogs}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </PageHeader>

      {expandedEntry && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-xs p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <ServerCrash className="h-3.5 w-3.5" /> Detail Error
            </span>
            <button
              type="button"
              onClick={() => setExpandedId(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Tutup
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">Waktu</span>
            <span>{new Date(expandedEntry.time).toLocaleString("id-ID")}</span>
            <span className="text-muted-foreground">Endpoint</span>
            <span className="font-mono">{expandedEntry.method} {expandedEntry.path}</span>
            <span className="text-muted-foreground">Status</span>
            <span>{expandedEntry.status}</span>
            <span className="text-muted-foreground">Pengguna</span>
            <span>{expandedEntry.userEmail || "-"}</span>
            {expandedEntry.requestId && (
              <>
                <span className="text-muted-foreground">Request ID</span>
                <span className="font-mono">{expandedEntry.requestId}</span>
              </>
            )}
          </div>
          <pre className="mt-2 p-3 rounded-lg bg-slate-950 text-slate-100 text-[11px] whitespace-pre-wrap break-all">
            {expandedEntry.message}
          </pre>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        {loadError && (
          <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : entries.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p>Tidak ada error server tercatat. Bagus!</p>
          </div>
        ) : (
          <DataTable columns={columns} data={entries} />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Catatan: log ini disimpan sementara di memori server (maksimal 500 entri terbaru, per proses backend) - bukan
        pengganti log lengkap di server. Kalau server di-restart atau di-deploy ulang, log di halaman ini akan kosong lagi.
      </p>
    </div>
  );
}
