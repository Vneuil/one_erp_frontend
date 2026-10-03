"use client";

import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  Receipt,
  Plus,
  XCircle,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { MoneyDisplay } from "@/components/shared/money-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app-store";
import {
  reimbursementApi,
  ReimbursementClaim as ApiReimbursementClaim,
} from "@/lib/api/reimbursement";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";
import { hropsApi, EvidenceItem } from "@/lib/api/hrops";

interface ReimbursementItem {
  id: string;
  claimNo: string;
  requesterEmail?: string;
  employeeName: string;
  department: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  receiptAttached: boolean;
  status: "Pending Approval" | "Approved" | "Paid" | "Rejected";
}

// Categories are stored as free strings in the backend; the UI uses the same
// strings for display and creation (no lossy translation layer).
const CATEGORIES = ["Transportasi", "Makan Klien / Meeting", "Perjalanan Dinas", "ATK / Medis", "Lainnya"] as const;

const toUiStatus = (status: string): ReimbursementItem["status"] => {
  if (status === "approved") return "Approved";
  if (status === "paid") return "Paid";
  if (status === "rejected") return "Rejected";
  return "Pending Approval";
};

const mapClaim = (c: ApiReimbursementClaim): ReimbursementItem => ({
  id: c.id,
  claimNo: c.claimNo,
  requesterEmail: c.requesterEmail,
  employeeName: c.employeeName,
  department: c.department,
  category: c.category || "Lainnya",
  amount: c.amount,
  description: c.description,
  date: c.date,
  receiptAttached: c.receiptAttached,
  status: toUiStatus(c.status),
});

export default function ReimbursementsPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("hrm");
  const isOwn = useIsOwnDocument();
  const [evidenceFor, setEvidenceFor] = React.useState<ReimbursementItem | null>(null);
  const [evidence, setEvidence] = React.useState<EvidenceItem[]>([]);
  const [evTitle, setEvTitle] = React.useState("");
  const [evRef, setEvRef] = React.useState("");
  const [evAmount, setEvAmount] = React.useState(0);
  const [evBusy, setEvBusy] = React.useState(false);
  const [evError, setEvError] = React.useState<string | null>(null);

  const openEvidence = async (row: ReimbursementItem) => {
    setEvidenceFor(row);
    setEvidence([]);
    setEvError(null);
    try {
      setEvidence((await hropsApi.evidence(row.id)).data || []);
    } catch (e) {
      setEvError(e instanceof Error ? e.message : "Gagal memuat bukti.");
    }
  };

  const addEvidence = async () => {
    if (!evidenceFor) return;
    setEvBusy(true);
    setEvError(null);
    try {
      await hropsApi.addEvidence({ claimId: evidenceFor.id, title: evTitle, fileRef: evRef, amount: evAmount || undefined });
      setEvidence((await hropsApi.evidence(evidenceFor.id)).data || []);
      setEvTitle("");
      setEvRef("");
      setEvAmount(0);
      reimbursementApi.listClaims().then((res) => setClaims((res.data || []).map(mapClaim))).catch(() => {});
    } catch (e) {
      setEvError(e instanceof Error ? e.message : "Gagal menambah bukti.");
    } finally {
      setEvBusy(false);
    }
  };
  const { currentUser } = useAppStore();
  const [claims, setClaims] = React.useState<ReimbursementItem[]>([]);
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isNewClaimOpen, setIsNewClaimOpen] = React.useState(false);
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  // Form State
  const [category, setCategory] = React.useState<string>(CATEGORIES[0]);
  const [amount, setAmount] = React.useState(0);
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    reimbursementApi
      .listClaims()
      .then((res) => {
        setClaims((res.data || []).map(mapClaim));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load reimbursement claims", err);
        setLoadError("Gagal memuat data klaim dari server.");
      })
      .finally(() => setIsLoading(false));

    hrmApi
      .listEmployees({ perPage: 500 })
      .then((res) => setEmployees(res.data || []))
      .catch((err) => console.error("Failed to load employees", err));
  }, []);

  // Approve / reject / pay all move money and post accounting entries, so a
  // failed call must never look like it succeeded: only the server's response
  // changes the row.
  const act = async (
    id: string,
    call: (id: string) => Promise<{ data: ApiReimbursementClaim }>,
    confirmText?: string
  ) => {
    if (actioningId) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setActioningId(id);
    setNotice(null);
    try {
      const res = await call(id);
      setClaims((prev) => prev.map((c) => (c.id === id ? mapClaim(res.data) : c)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal memproses klaim.");
    } finally {
      setActioningId(null);
    }
  };
  const handleApprove = (id: string) =>
    act(id, reimbursementApi.approveClaim, "Setujui klaim ini? Beban dan hutang reimbursement akan dibukukan otomatis.");
  const handleReject = (id: string) => act(id, reimbursementApi.rejectClaim, "Tolak klaim ini?");
  const handleMarkPaid = (id: string) =>
    act(id, reimbursementApi.markPaid, "Tandai klaim sudah dibayar? Pengeluaran kas akan dibukukan otomatis.");

  // The claimant is the employee whose HRM email matches the logged-in user.
  const me = employees.find((e) => e.email && e.email.toLowerCase() === (currentUser.email || "").toLowerCase());

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !(amount > 0)) return;
    setFormError(null);
    try {
      const res = await reimbursementApi.createClaim({
        employeeName: me?.name || currentUser.name,
        department: me?.department || "",
        category,
        amount: Number(amount),
        description,
        // Receipt upload is not available yet, so never claim one is attached.
        receiptAttached: false,
      });
      if (res.data) {
        setClaims((prev) => [mapClaim(res.data), ...prev]);
      }
      setIsNewClaimOpen(false);
      setDescription("");
      setAmount(0);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mengirim klaim.");
    }
  };

  const totalPending = claims.filter((c) => c.status === "Pending Approval").reduce((acc, curr) => acc + curr.amount, 0);
  const totalApproved = claims.filter((c) => c.status === "Approved" || c.status === "Paid").reduce((acc, curr) => acc + curr.amount, 0);

  const columns: Column<ReimbursementItem>[] = [
    {
      key: "claimNo",
      header: "No. Klaim & Tanggal",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.claimNo}</span>
          <div className="text-[11px] text-muted-foreground">{row.date}</div>
        </div>
      ),
    },
    {
      key: "employeeName",
      header: "Karyawan & Divisi",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.employeeName}</div>
          <div className="text-[11px] text-muted-foreground">{row.department}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategori & Keterangan",
      render: (row) => (
        <div className="space-y-0.5 text-xs max-w-xs">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
            {row.category}
          </span>
          <p className="text-muted-foreground truncate">{row.description}</p>
        </div>
      ),
    },
    {
      key: "receiptAttached",
      header: "Bukti",
      render: (row) => (
        <button onClick={() => openEvidence(row)} className={`text-[11px] font-semibold underline cursor-pointer ${row.receiptAttached ? "text-emerald-700" : "text-rose-600"}`}>
          {row.receiptAttached ? "Lihat bukti" : "Tanpa bukti"}
        </button>
      ),
    },
    {
      key: "amount",
      header: "Nominal Klaim",
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          <MoneyDisplay amount={row.amount} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const styles: Record<string, string> = {
          "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
          Approved: "bg-blue-50 text-blue-700 border-blue-200",
          Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
          Rejected: "bg-rose-50 text-rose-700 border-rose-200",
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[row.status]}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => {
        const disabled = actioningId === row.id;
        if (row.status === "Pending Approval" && mayApprove && !isOwn(row.requesterEmail)) {
          return (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="gradient"
                disabled={disabled}
                onClick={() => handleApprove(row.id)}
                className="h-7 px-2.5 text-[11px] font-bold"
              >
                Setujui Klaim
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => handleReject(row.id)}
                className="h-7 px-2.5 text-[11px] font-bold text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Tolak
              </Button>
            </div>
          );
        }
        if (row.status === "Approved" && mayApprove && !isOwn(row.requesterEmail)) {
          return (
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => handleMarkPaid(row.id)}
              className="h-7 px-2.5 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <Banknote className="h-3 w-3 mr-1" />
              Tandai Dibayar
            </Button>
          );
        }
        return <span className="text-[11px] text-muted-foreground">Telah Diverifikasi</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-brand-primary" />
            <span>Klaim Reimbursement & Biaya Operasional</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Pengajuan pengembalian biaya perjalanan dinas, bensin tol, konsumsi meeting klien, dan bukti struk.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewClaimOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Ajukan Klaim Reimburse</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Klaim Menunggu Approval</span>
            <div className="text-2xl font-black text-amber-600">
              <MoneyDisplay amount={totalPending} />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {claims.filter((c) => c.status === "Pending Approval").length} Pengajuan
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Klaim Disetujui / Dibayarkan</span>
            <div className="text-2xl font-black text-emerald-600">
              <MoneyDisplay amount={totalApproved} />
            </div>
            <span className="text-[11px] text-muted-foreground">Seluruh klaim yang dimuat</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Klaim Ditolak</span>
            <div className="text-2xl font-black text-rose-600">
              {claims.filter((c) => c.status === "Rejected").length} Klaim
            </div>
            <span className="text-[11px] text-muted-foreground">
              <MoneyDisplay amount={claims.filter((c) => c.status === "Rejected").reduce((s, c) => s + c.amount, 0)} />
            </span>
          </CardContent>
        </Card>
      </div>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {notice}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
        ) : (
          <DataTable data={claims} columns={columns} />
        )}
      </div>

      {/* Modal Ajukan Reimbursement */}
      <Dialog open={evidenceFor !== null} onOpenChange={(o) => !o && setEvidenceFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bukti klaim {evidenceFor?.claimNo}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            {evError && <p role="alert" className="text-rose-700">{evError}</p>}
            <ul className="space-y-1.5">
              {evidence.length === 0 && <li className="text-muted-foreground">Belum ada bukti terlampir.</li>}
              {evidence.map((e) => (
                <li key={e.id} className="rounded border border-border p-2">
                  <div className="font-semibold">{e.title}{e.amount > 0 && <span className="font-normal"> · <MoneyDisplay amount={e.amount} /></span>}</div>
                  {/^https?:\/\//.test(e.fileRef) ? <a href={e.fileRef} target="_blank" rel="noreferrer" className="underline break-all text-[11px]">{e.fileRef}</a> : <span className="text-[11px] text-muted-foreground break-all">{e.fileRef}</span>}
                </li>
              ))}
            </ul>
            {evidenceFor?.status === "Pending Approval" && (
              <div className="space-y-2 border-t border-border pt-2">
                <Input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Judul (mis. Struk taksi 12 Sep)" className="h-8 text-xs" />
                <Input value={evRef} onChange={(e) => setEvRef(e.target.value)} placeholder="ID atau tautan berkas di ONE Drive" className="h-8 text-xs" />
                <Input type="number" min={0} value={evAmount || ""} onChange={(e) => setEvAmount(Number(e.target.value))} placeholder="Nominal di bukti (opsional)" className="h-8 text-xs" />
                <Button size="sm" disabled={evBusy || !evTitle.trim() || !evRef.trim()} onClick={addEvidence} className="h-8 text-xs font-bold">Lampirkan</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewClaimOpen} onOpenChange={setIsNewClaimOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Form Pengajuan Reimbursement</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateClaim} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            {!me && !isLoading && (
              <p className="text-[11px] text-amber-700">
                Akun Anda belum terhubung ke data karyawan (email tidak cocok); klaim akan dicatat atas nama akun tanpa departemen.
              </p>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Kategori Pengeluaran *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Nominal Pengeluaran (IDR) *</label>
              <Input
                type="number"
                min={1}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Deskripsi / Rincian Pengeluaran *</label>
              <textarea
                rows={3}
                placeholder="Jelaskan keperluan dinas atau pertemuan terkait..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg border border-border bg-white text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewClaimOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Kirim Pengajuan Klaim
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
