"use client";

import * as React from "react";
import { History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { activityLogApi, ActivityLogItem } from "@/lib/api/activity-log";

const METHOD_COLORS: Record<string, string> = {
  POST: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = React.useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const fetchLogs = React.useCallback(() => {
    setIsLoading(true);
    activityLogApi
      .list({ perPage: 100, search: search || undefined })
      .then((res) => setLogs(res.data || []))
      .catch((err) => {
        console.error("Failed to load activity log", err);
        setLoadError("Gagal memuat riwayat aktivitas dari server.");
      })
      .finally(() => setIsLoading(false));
  }, [search]);

  React.useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const columns: Column<ActivityLogItem>[] = [
    {
      key: "createdAt",
      header: "Waktu",
      render: (l) => <span className="text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString("id-ID")}</span>,
    },
    {
      key: "userEmail",
      header: "Pengguna",
      render: (l) => <span className="text-xs font-semibold text-foreground">{l.userEmail || "-"}</span>,
    },
    {
      key: "method",
      header: "Aksi",
      render: (l) => (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${METHOD_COLORS[l.method] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
          {l.method}
        </span>
      ),
    },
    {
      key: "module",
      header: "Modul",
      render: (l) => <span className="text-xs font-medium text-brand-primary capitalize">{l.module}</span>,
    },
    {
      key: "path",
      header: "Endpoint",
      render: (l) => <span className="font-mono text-[11px] text-muted-foreground">{l.path}</span>,
    },
    {
      key: "statusCode",
      header: "Status",
      render: (l) => (
        <span className={`text-xs font-bold ${l.statusCode < 300 ? "text-emerald-600" : "text-rose-600"}`}>{l.statusCode}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        description="Riwayat aktivitas pengguna: siapa mengubah apa, kapan, dan lewat modul mana."
      />

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari email, modul, atau endpoint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {loadError && (
          <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
            <History className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p>Belum ada aktivitas tercatat.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={logs} />
        )}
      </div>
    </div>
  );
}
