"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
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
import { MoneyDisplay } from "@/components/shared/money-display";
import { contractsApi, ContractItem as ApiContractItem } from "@/lib/api/contracts";

interface ContractItem {
  id: string;
  contractNo: string;
  title: string;
  partyType: "Customer (Penjualan)" | "Vendor (Pengadaan)";
  partyName: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: "Active" | "Expiring Soon" | "Expired" | "Draft";
}

const toBackendPartyType = (partyType: ContractItem["partyType"]) =>
  partyType === "Customer (Penjualan)" ? "customer" : "vendor";

const toUiPartyType = (partyType: string): ContractItem["partyType"] =>
  partyType === "vendor" ? "Vendor (Pengadaan)" : "Customer (Penjualan)";

const toUiStatus = (status: string, needsAttention: boolean): ContractItem["status"] => {
  if (status === "active") return needsAttention ? "Expiring Soon" : "Active";
  if (status === "expired" || status === "terminated") return "Expired";
  if (status === "renewed") return "Active";
  return "Draft";
};

const mapContract = (c: ApiContractItem): ContractItem => ({
  id: c.id,
  contractNo: c.contractNumber,
  title: c.title,
  partyType: toUiPartyType(c.partyType),
  partyName: c.partyName,
  contractValue: c.contractValue,
  startDate: c.startDate,
  endDate: c.endDate,
  status: toUiStatus(c.status, c.needsAttention),
});

export default function ContractsPage() {
  const [contracts, setContracts] = React.useState<ContractItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [partyType, setPartyType] = React.useState<ContractItem["partyType"]>("Customer (Penjualan)");
  const [partyName, setPartyName] = React.useState("");
  const [contractValue, setContractValue] = React.useState(0);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    contractsApi
      .listContracts()
      .then((res) => {
        setContracts((res.data || []).map(mapContract));
      })
      .catch((err) => {
        console.error("Failed to load kontrak", err);
        setLoadError("Gagal memuat data kontrak dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleRenew = async (id: string) => {
    setActioningId(id);
    try {
      const res = await contractsApi.renewContract(id);
      setContracts((prev) => [mapContract(res.data), ...prev]);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal memperpanjang kontrak.");
    } finally {
      setActioningId(null);
    }
  };

  const handleTerminate = async (id: string) => {
    setActioningId(id);
    try {
      const res = await contractsApi.updateContractStatus(id, "terminated");
      setContracts((prev) => prev.map((c) => (c.id === id ? mapContract(res.data) : c)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mengakhiri kontrak.");
    } finally {
      setActioningId(null);
    }
  };

  const totalValue = contracts.reduce((acc, curr) => acc + curr.contractValue, 0);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !partyName || !startDate || !endDate) return;
    setFormError(null);
    try {
      const res = await contractsApi.createContract({
        title,
        partyType: toBackendPartyType(partyType),
        partyName,
        contractValue,
        startDate,
        endDate,
      });
      if (res.data) {
        setContracts((prev) => [mapContract(res.data), ...prev]);
      }
      setIsNewOpen(false);
      setTitle("");
      setPartyName("");
      setContractValue(0);
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan kontrak.");
    }
  };

  const columns: Column<ContractItem>[] = [
    {
      key: "contractNo",
      header: "No. Kontrak & Judul",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.contractNo}</span>
          <div className="font-bold text-foreground text-xs mt-0.5">{row.title}</div>
          <div className="text-[11px] text-brand-indigo font-medium">{row.partyType}</div>
        </div>
      ),
    },
    {
      key: "partyName",
      header: "Pihak Terkait (Customer/Vendor)",
      render: (row) => (
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Building className="h-3.5 w-3.5 text-brand-primary" />
          {row.partyName}
        </span>
      ),
    },
    {
      key: "contractValue",
      header: "Nilai Total Kontrak",
      render: (row) => (
        <span className="font-black text-xs text-brand-dark">
          <MoneyDisplay amount={row.contractValue} />
        </span>
      ),
    },
    {
      key: "endDate",
      header: "Masa Berlaku",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-foreground">{row.startDate} s/d {row.endDate}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status Kontrak",
      render: (row) => {
        const styles: Record<string, string> = {
          Active: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          "Expiring Soon": "bg-amber-50 text-amber-700 border-amber-200 font-bold animate-pulse",
          Expired: "bg-rose-50 text-rose-700 border-rose-200",
          Draft: "bg-slate-100 text-slate-700 border-slate-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${styles[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => {
        if (row.status === "Active" || row.status === "Expiring Soon") {
          return (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={actioningId === row.id}
                onClick={() => handleRenew(row.id)}
                className="h-7 gap-1 text-[11px] border-brand-indigo/30 text-brand-indigo hover:bg-brand-indigo/5"
              >
                Perpanjang
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actioningId === row.id}
                onClick={() => handleTerminate(row.id)}
                className="h-7 gap-1 text-[11px] border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                Akhiri
              </Button>
            </div>
          );
        }
        return <span className="text-[11px] text-muted-foreground">-</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-primary" />
            <span>Manajemen Siklus Kontrak (Contract Lifecycle)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola perjanjian kontrak customer & vendor, termin pembayaran, masa berlaku, dan reminder perpanjangan otomatis.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Buat Kontrak Baru</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Nilai Kontrak Portofolio</span>
            <div className="text-2xl font-black text-brand-dark">
              <MoneyDisplay amount={totalValue} />
            </div>
            <span className="text-[11px] text-muted-foreground">3 Kontrak Aktif Berjalan</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Kontrak Segera Jatuh Tempo</span>
            <div className="text-2xl font-black text-amber-600">
              {contracts.filter((c) => c.status === "Expiring Soon").length} Kontrak
            </div>
            <span className="text-[11px] text-muted-foreground">Perlu negosiasi perpanjangan Q4</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Tingkat Kepatuhan Termin</span>
            <div className="text-2xl font-black text-emerald-600">100% On Schedule</div>
            <span className="text-[11px] text-muted-foreground">Sinkron dengan modul Invoice & SPK</span>
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
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {notice}
          </div>
        )}
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={contracts} columns={columns} />
        )}
      </div>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Kontrak Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateContract} className="space-y-3">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Judul Kontrak</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Tipe Pihak</label>
              <select
                value={partyType}
                onChange={(e) => setPartyType(e.target.value as ContractItem["partyType"])}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
              >
                <option>Customer (Penjualan)</option>
                <option>Vendor (Pengadaan)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Nama Pihak</label>
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Nilai Kontrak</label>
              <Input type="number" value={contractValue} onChange={(e) => setContractValue(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Mulai</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Berakhir</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Simpan Kontrak
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
