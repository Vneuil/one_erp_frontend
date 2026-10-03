"use client";

import * as React from "react";
import {
  Users2,
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  Building,
  Tag,
  CheckCircle2,
  ArrowUpRight,
  UserCheck,
  Globe,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import { downloadCsv } from "@/lib/utils/csv";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface LeadItem {
  id: string;
  /** The real record id (`id` above is a short display code). */
  recordId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  segment: "Enterprise" | "Distributor" | "B2B Retail" | "SME";
  estimatedValue: number;
  status: "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";
  pic: string;
  createdAt: string;
}

import { crmApi, LeadItem as ApiLead } from "@/lib/api/crm";
import { crmPlusApi, CrmTagItem } from "@/lib/api/crmplus";
import { CrmActivityPanel } from "@/components/crm/activity-panel";
import { useAppStore } from "@/stores/app-store";


export default function LeadsPage() {
  const { currentUser } = useAppStore();
  const [leads, setLeads] = React.useState<LeadItem[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedSegment, setSelectedSegment] = React.useState<string>("all");
  const [tags, setTags] = React.useState<CrmTagItem[]>([]);
  const [tagFilter, setTagFilter] = React.useState<{ id: string; ids: Set<string> } | null>(null);
  const [tagError, setTagError] = React.useState<string | null>(null);

  const pickTag = (id: string | null) => {
    setTagError(null);
    if (!id || tagFilter?.id === id) { setTagFilter(null); return; }
    crmPlusApi.taggedRecords(id, "lead")
      .then((res) => setTagFilter({ id, ids: new Set(res.data ?? []) }))
      .catch(() => setTagError("Gagal memuat prospek untuk tag ini."));
  };
  const [isNewLeadOpen, setIsNewLeadOpen] = React.useState(false);
  const [detailLead, setDetailLead] = React.useState<LeadItem | null>(null);

  // New Lead Form State
  const [newName, setNewName] = React.useState("");
  const [newCompany, setNewCompany] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newSegment, setNewSegment] = React.useState<LeadItem["segment"]>("Enterprise");
  const [newValue, setNewValue] = React.useState(0);
  const [newSource, setNewSource] = React.useState<LeadItem["source"]>("web");

  const applyLeads = (data: ApiLead[] | undefined) => {
    setLeads(
      (data || []).map((l: ApiLead) => ({
        id: l.name.slice(0, 3).toUpperCase() + "-" + l.id.slice(0, 4),
        recordId: l.id,
        name: l.name,
        company: l.company,
        email: l.email || "",
        phone: l.phone || "-",
        source: l.source || "web",
        segment: (l.segment as LeadItem["segment"]) || "Enterprise",
        estimatedValue: l.estimatedValue || 0,
        status: (l.status as LeadItem["status"]) || "New",
        pic: l.pic || "-",
        createdAt: l.createdAt ? l.createdAt.slice(0, 10) : "-",
      }))
    );
    setLoadError(null);
  };

  const fetchLeads = () =>
    crmApi
      .listLeads()
      .then((res) => applyLeads(res.data))
      .catch((err) => {
        console.error("Failed to load leads", err);
        setLoadError("Gagal memuat data prospek dari server.");
      });

  React.useEffect(() => {
    crmApi
      .listLeads()
      .then((res) => applyLeads(res.data))
      .catch((err) => {
        console.error("Failed to load leads", err);
        setLoadError("Gagal memuat data prospek dari server.");
      })
      .finally(() => setIsLoading(false));
    crmPlusApi.tags().then((res) => setTags(res.data ?? [])).catch(() => setTags([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLeads = React.useMemo(() => {
    return leads.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.company.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase()) ||
        item.phone.includes(search);
      const matchSegment = selectedSegment === "all" || item.segment === selectedSegment;
      const matchTag = !tagFilter || tagFilter.ids.has(item.id);
      return matchSearch && matchSegment && matchTag;
    });
  }, [leads, search, selectedSegment, tagFilter]);

  const handleExportLeads = () => {
    downloadCsv(
      "crm-leads.csv",
      ["ID", "Name", "Company", "Email", "Phone", "Source", "Segment", "Estimated Value", "Status", "PIC", "Created At"],
      filteredLeads.map((l) => [
        l.id,
        l.name,
        l.company,
        l.email,
        l.phone,
        l.source,
        l.segment,
        l.estimatedValue,
        l.status,
        l.pic,
        l.createdAt,
      ])
    );
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCompany) return;
    setFormError(null);

    try {
      await crmApi.createLead({
        name: newName,
        company: newCompany,
        email: newEmail,
        phone: newPhone,
        source: newSource,
        segment: newSegment,
        estimatedValue: Number(newValue) || 0,
        status: "New",
        pic: currentUser.name,
      });
      fetchLeads();
      setIsNewLeadOpen(false);
      setNewName("");
      setNewCompany("");
      setNewEmail("");
      setNewPhone("");
      setNewValue(0);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan prospek.");
    }
  };

  const totalPipeline = leads.reduce((acc, curr) => acc + curr.estimatedValue, 0);
  const totalWon = leads.filter((l) => l.status === "Won").reduce((acc, curr) => acc + curr.estimatedValue, 0);

  const columns: Column<LeadItem>[] = [
    {
      key: "id",
      header: "ID Prospek",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.id}</span>
          <div className="text-[11px] text-muted-foreground">{row.createdAt}</div>
        </div>
      ),
    },
    {
      key: "name",
      header: "Nama & Perusahaan",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.name}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Building className="h-3 w-3 text-muted-foreground" />
            {row.company}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Kontak",
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3 text-brand-primary" />
            <span>{row.email}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3 w-3 text-emerald-600" />
            <span>{row.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: "segment",
      header: "Segmentasi & Sumber",
      render: (row) => {
        const sourceBadge = {
          web: { label: "Web Form", icon: Globe, style: "bg-blue-50 text-blue-700 border-blue-200" },
          whatsapp: { label: "WhatsApp", icon: MessageSquare, style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          referral: { label: "Referral", icon: Users2, style: "bg-purple-50 text-purple-700 border-purple-200" },
          exhibition: { label: "Exhibition", icon: Tag, style: "bg-amber-50 text-amber-700 border-amber-200" },
          cold_call: { label: "Cold Call", icon: Phone, style: "bg-slate-100 text-slate-700 border-slate-200" },
        }[row.source] ?? { label: row.source, icon: Globe, style: "bg-slate-100 text-slate-700 border-slate-200" };

        const SourceIcon = sourceBadge.icon;

        return (
          <div className="space-y-1">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
              {row.segment}
            </span>
            <div>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${sourceBadge.style}`}>
                <SourceIcon className="h-2.5 w-2.5" />
                {sourceBadge.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "estimatedValue",
      header: "Estimasi Nilai",
      render: (row) => (
        <div className="font-bold text-xs">
          <MoneyDisplay amount={row.estimatedValue} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const styles: Record<string, string> = {
          New: "bg-slate-100 text-slate-700 border-slate-200",
          Contacted: "bg-blue-50 text-blue-700 border-blue-200",
          Qualified: "bg-purple-50 text-brand-indigo border-purple-200",
          Proposal: "bg-amber-50 text-amber-700 border-amber-200",
          Won: "bg-emerald-50 text-emerald-700 border-emerald-200",
          Lost: "bg-rose-50 text-rose-700 border-rose-200",
        };
        return (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${styles[row.status] || ""}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: "pic",
      header: "PIC Sales",
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserCheck className="h-3.5 w-3.5 text-brand-primary" />
          <span className="font-semibold text-foreground">{row.pic}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users2 className="h-6 w-6 text-brand-primary" />
            <span>Manajemen Prospek & Lead CRM</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola data calon pelanggan, sumber prospek web/WhatsApp, segmentasi bisnis, dan assignment PIC sales.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLeads}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ekspor Data</span>
          </Button>

          <Button
            variant="gradient"
            size="sm"
            onClick={() => setIsNewLeadOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Prospek Baru</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Prospek Aktif</span>
            <div className="text-2xl font-black text-brand-dark">{leads.length} Kontak</div>
            <span className="text-[11px] text-muted-foreground">Semua segmentasi pasar</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Estimasi Nilai Pipeline</span>
            <div className="text-2xl font-black text-brand-indigo">
              <MoneyDisplay amount={totalPipeline} />
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> Potensi Omset Penjualan
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Deal Won (Closing)</span>
            <div className="text-2xl font-black text-emerald-600">
              <MoneyDisplay amount={totalWon} />
            </div>
            <span className="text-[11px] text-muted-foreground">Telah konversi jadi Sales Order</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari prospek, perusahaan, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Segment:
          </span>
          {["all", "Enterprise", "Distributor", "B2B Retail", "SME"].map((seg) => (
            <button
              key={seg}
              onClick={() => setSelectedSegment(seg)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedSegment === seg
                  ? "bg-brand-primary text-white shadow-2xs"
                  : "bg-slate-100 text-muted-foreground hover:text-foreground"
              }`}
            >
              {seg === "all" ? "Semua" : seg}
            </button>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-muted-foreground font-semibold">Tag:</span>
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTag(t.id)}
              aria-pressed={tagFilter?.id === t.id}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${tagFilter?.id === t.id ? "bg-brand-primary text-white" : "bg-slate-100 text-muted-foreground hover:text-foreground"}`}
            >
              {t.name}
            </button>
          ))}
          {tagFilter && <button onClick={() => pickTag(null)} className="text-xs underline text-muted-foreground cursor-pointer">Hapus filter</button>}
          {tagError && <span role="alert" className="text-xs text-rose-700">{tagError}</span>}
        </div>
      )}

      {/* Main Data Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={filteredLeads} columns={columns} onRowClick={(row) => setDetailLead(row)} />
        )}
      </div>

      {/* Detail prospek: aktivitas, tugas, dokumen, tag */}
      <Dialog open={detailLead !== null} onOpenChange={(open) => !open && setDetailLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{detailLead?.name} · {detailLead?.company}</DialogTitle>
          </DialogHeader>
          {detailLead && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>{detailLead.email || "-"}</span>
                <span>{detailLead.phone}</span>
                <span>PIC: {detailLead.pic}</span>
                <span>Status: {detailLead.status}</span>
              </div>
              <CrmActivityPanel parentType="lead" parentId={detailLead.recordId} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Tambah Prospek Baru */}
      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Tambah Calon Pelanggan (Lead) Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Kontak Lengkap *</label>
              <Input
                placeholder="Contoh: Ir. Hendra Saputra"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Perusahaan / Bisnis *</label>
              <Input
                placeholder="Contoh: PT Prima Logistik Indonesia"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="hendra@perusahaan.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Nomor Telepon / WhatsApp</label>
                <Input
                  placeholder="+62 812-xxxx-xxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Segmentasi Bisnis</label>
                <select
                  value={newSegment}
                  onChange={(e) => setNewSegment(e.target.value as LeadItem["segment"])}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Distributor">Distributor</option>
                  <option value="B2B Retail">B2B Retail</option>
                  <option value="SME">SME / UKM</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Sumber Prospek (Lead Source)</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value as LeadItem["source"])}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="web">Form Web</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="referral">Referral Klien</option>
                  <option value="exhibition">Pameran / Expo</option>
                  <option value="cold_call">Direct Call</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Estimasi Nilai Proyek / Order (IDR)</label>
              <Input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewLeadOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Simpan Prospek
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
