"use client";

import * as React from "react";
import { projectsApi } from "@/lib/api/projects";
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  UserCheck,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app-store";
import { projectTicketApi, ProjectTicketItem as ApiProjectTicket } from "@/lib/api/projectticket";

interface ServiceTicket {
  id: string;
  ticketNo: string;
  subject: string;
  customer: string;
  category: "Technical" | "Delivery & WMS" | "Billing / Invoice" | "General";
  priority: "Critical" | "High" | "Normal" | "Low";
  slaTargetHours: number;
  slaRemainingHours: number;
  status: "Open" | "In Progress" | "Pending Customer" | "Resolved";
  assignee: string;
  createdAt: string;
}

const toUiPriority = (p: string): ServiceTicket["priority"] => {
  if (p === "Critical") return "Critical";
  if (p === "High") return "High";
  if (p === "Low") return "Low";
  return "Normal";
};

const toBackendPriority = (p: ServiceTicket["priority"]) => (p === "Normal" ? "Medium" : p);

const toUiStatus = (s: string): ServiceTicket["status"] => {
  if (s === "in_progress") return "In Progress";
  if (s === "pending_customer") return "Pending Customer";
  if (s === "resolved") return "Resolved";
  return "Open";
};

const toBackendStatus = (s: ServiceTicket["status"]) => {
  if (s === "In Progress") return "in_progress";
  if (s === "Pending Customer") return "pending_customer";
  if (s === "Resolved") return "resolved";
  return "open";
};

const statusFlow: ServiceTicket["status"][] = ["Open", "In Progress", "Pending Customer", "Resolved"];

const mapTicket = (t: ApiProjectTicket): ServiceTicket => ({
  id: t.id,
  ticketNo: t.ticketNo,
  subject: t.subject,
  customer: t.customerName,
  category: (t.category as ServiceTicket["category"]) || "General",
  priority: toUiPriority(t.priority),
  slaTargetHours: t.slaTargetHours,
  slaRemainingHours: t.slaTargetHours,
  status: toUiStatus(t.status),
  assignee: t.assignedTo,
  createdAt: (t.createdAt || "").replace("T", " ").slice(0, 16),
});

export default function ServiceTicketsPage() {
  const { currentUser } = useAppStore();
  const [tickets, setTickets] = React.useState<ServiceTicket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [projectOptions, setProjectOptions] = React.useState<{ code: string; name: string }[]>([]);
  const [projectCode, setProjectCode] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(false);

  // New Ticket State
  const [subject, setSubject] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [priority, setPriority] = React.useState<ServiceTicket["priority"]>("Normal");
  const [category, setCategory] = React.useState<ServiceTicket["category"]>("Technical");
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    projectTicketApi
      .list()
      .then((res) => {
        setTickets((res.data || []).map(mapTicket));
      })
      .catch((err) => {
        console.error("Failed to load tiket", err);
        setLoadError("Gagal memuat data tiket dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    projectsApi
      .list()
      .then((res) => setProjectOptions((res.data || []).map((p) => ({ code: p.code, name: p.name }))))
      .catch((err) => console.error("Failed to load projects", err));
  }, []);

  const handleAdvanceStatus = async (ticket: ServiceTicket) => {
    const idx = statusFlow.indexOf(ticket.status);
    if (idx === -1 || idx === statusFlow.length - 1) return;
    const nextStatus = statusFlow[idx + 1];

    setActioningId(ticket.id);
    setNotice(null);
    try {
      const res = await projectTicketApi.updateStatus(ticket.id, toBackendStatus(nextStatus));
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? mapTicket(res.data) : t)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mengubah status tiket.");
    } finally {
      setActioningId(null);
    }
  };

  const filtered = tickets.filter(
    (t) =>
      t.ticketNo.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !customer || !projectCode) return;
    setFormError(null);

    const slaTargetHours = priority === "Critical" ? 4 : priority === "High" ? 8 : priority === "Normal" ? 24 : 48;
    try {
      const res = await projectTicketApi.create({
        projectCode,
        subject,
        customerName: customer,
        category,
        priority: toBackendPriority(priority),
        slaTargetHours,
        assignedTo: currentUser.name,
      });
      if (res.data) {
        setTickets((prev) => [mapTicket(res.data), ...prev]);
      }
      setIsNewTicketOpen(false);
      setSubject("");
      setCustomer("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat tiket.");
    }
  };

  const columns: Column<ServiceTicket>[] = [
    {
      key: "ticketNo",
      header: "No. Tiket",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.ticketNo}</span>
          <div className="text-[11px] text-muted-foreground">{row.createdAt}</div>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subjek & Klien",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.subject}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building className="h-3 w-3 text-muted-foreground" />
            <span>{row.customer}</span>
            <span className="text-brand-indigo font-semibold">• {row.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Prioritas",
      render: (row) => {
        const styles: Record<string, string> = {
          Critical: "bg-rose-50 text-rose-700 border-rose-200",
          High: "bg-amber-50 text-amber-700 border-amber-200",
          Normal: "bg-blue-50 text-blue-700 border-blue-200",
          Low: "bg-slate-100 text-slate-700 border-slate-200",
        };
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[row.priority]}`}>
            {row.priority}
          </span>
        );
      },
    },
    {
      key: "slaRemainingHours",
      header: "Target Waktu SLA",
      render: (row) => {
        const isWarning = row.slaRemainingHours < 2 && row.status !== "Resolved";
        return (
          <div className="space-y-0.5 text-xs">
            <div className={`font-bold flex items-center gap-1 ${isWarning ? "text-rose-600" : "text-foreground"}`}>
              <Clock className="h-3 w-3" />
              <span>{row.status === "Resolved" ? "Selesai" : `Sisa ${row.slaRemainingHours} Jam`}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Target SLA: {row.slaTargetHours} Jam</div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const styles: Record<string, string> = {
          Open: "bg-blue-50 text-blue-700 border-blue-200",
          "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
          "Pending Customer": "bg-purple-50 text-brand-indigo border-purple-200",
          Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: "assignee",
      header: "PIC Handler",
      render: (row) => (
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-brand-primary" />
          {row.assignee}
        </span>
      ),
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => {
        if (row.status === "Resolved") {
          return <span className="text-[11px] text-muted-foreground">-</span>;
        }
        const idx = statusFlow.indexOf(row.status);
        const nextStatus = statusFlow[idx + 1];
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={actioningId === row.id}
            onClick={() => handleAdvanceStatus(row)}
            className="h-7 gap-1 text-[11px] border-brand-indigo/30 text-brand-indigo hover:bg-brand-indigo/5"
          >
            Lanjut ke {nextStatus}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-brand-primary" />
            <span>Service Desk, Tiket & Pemenuhan SLA</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola permintaan layanan pelanggan, eskalasi tiket perbaikan teknis/logistik, dan kepatuhan SLA.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewTicketOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Buka Tiket Layanan Baru</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Tiket Terbuka</span>
            <div className="text-2xl font-black text-brand-dark">
              {tickets.filter((t) => t.status !== "Resolved").length} Tiket
            </div>
            <span className="text-[11px] text-muted-foreground">Sedang ditangani tim support</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Tingkat Kepatuhan SLA</span>
            <div className="text-2xl font-black text-emerald-600">98.4%</div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Di Atas Standar Target (95%)
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Rata-Rata Waktu Penyelesaian</span>
            <div className="text-2xl font-black text-brand-indigo">3.2 Jam</div>
            <span className="text-[11px] text-muted-foreground">Dari pelaporan awal hingga resolusi</span>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari no tiket, subjek, klien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {notice && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {notice}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={filtered} columns={columns} />
        )}
      </div>

      {/* Modal Tiket Baru */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Buka Tiket Layanan / Helpdesk Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs text-left">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Proyek *</label>
              <select
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih proyek...</option>
                {projectOptions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Subjek / Masalah *</label>
              <Input
                placeholder="Contoh: Permintaan Ganti Jadwal Pengiriman Surat Jalan"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Klien / Pelanggan *</label>
              <Input
                placeholder="Contoh: PT Sentosa Mandiri Solusindo"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Kategori Layanan</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ServiceTicket["category"])}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="Technical">Teknis & Spesifikasi</option>
                  <option value="Delivery & WMS">Pengiriman & Gudang</option>
                  <option value="Billing / Invoice">Tagihan & Faktur</option>
                  <option value="General">Umum</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Tingkat Prioritas (SLA)</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ServiceTicket["priority"])}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="Critical">Kritis (SLA 4 Jam)</option>
                  <option value="High">Tinggi (SLA 8 Jam)</option>
                  <option value="Normal">Normal (SLA 24 Jam)</option>
                  <option value="Low">Rendah (SLA 48 Jam)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewTicketOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Buat Tiket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
