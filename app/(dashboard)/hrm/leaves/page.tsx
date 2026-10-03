"use client";

import { useIsOwnDocument } from "@/lib/hooks/use-own-document";
import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Building,
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
import { leaveApi, LeaveRequestItem as ApiLeaveRequestItem } from "@/lib/api/leave";
import { hrmApi, EmployeeItem } from "@/lib/api/hrm";

interface LeaveRequest {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "Pending Approval" | "Approved" | "Rejected";
  approvedBy?: string;
}

const LEAVE_TYPES = [
  { value: "Cuti Tahunan", label: "Cuti Tahunan (Potong Kuota)" },
  { value: "Cuti Sakit", label: "Cuti Sakit (Surat Dokter)" },
  { value: "Cuti Menikah", label: "Cuti Menikah" },
  { value: "Cuti Melahirkan", label: "Cuti Melahirkan" },
  { value: "Izin Khusus", label: "Izin Keperluan Khusus / Duka" },
] as const;

/** Inclusive number of calendar days between two YYYY-MM-DD dates (0 when invalid). */
const calendarDays = (start: string, end: string): number => {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 86_400_000) + 1;
};

const todayJakarta = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

const toUiStatus = (status: string): LeaveRequest["status"] => {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending Approval";
};

const mapLeave = (l: ApiLeaveRequestItem): LeaveRequest => ({
  id: l.id,
  employeeId: l.employeeId,
  name: l.employeeName,
  department: l.department,
  type: l.type,
  startDate: l.startDate,
  endDate: l.endDate,
  totalDays: l.totalDays,
  reason: l.reason,
  status: toUiStatus(l.status),
  approvedBy: l.approvedBy || undefined,
});

export default function LeavesPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("hrm");
  const isOwn = useIsOwnDocument();
  const { currentUser } = useAppStore();
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [isNewLeaveOpen, setIsNewLeaveOpen] = React.useState(false);
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);

  // Form State
  const [employeeId, setEmployeeId] = React.useState("");
  const [type, setType] = React.useState<string>("Cuti Tahunan");
  const [startDate, setStartDate] = React.useState(todayJakarta);
  const [endDate, setEndDate] = React.useState(todayJakarta);
  const [totalDays, setTotalDays] = React.useState(0); // 0 = use the full date range
  const [reason, setReason] = React.useState("");

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  React.useEffect(() => {
    leaveApi
      .listLeaves()
      .then((res) => {
        setLeaves((res.data || []).map(mapLeave));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load leave requests", err);
        setLoadError("Gagal memuat data cuti dari server.");
      })
      .finally(() => setIsLoading(false));

    hrmApi
      .listEmployees({ perPage: 200 })
      .then((res) => {
        const items = res.data || [];
        setEmployees(items);
        // Self-service default: pre-select the employee record matching the
        // logged-in user's own email, mirroring the server-locked pattern
        // used elsewhere (e.g. PurchaseRequest.RequestedBy).
        const self = items.find((e) => e.email && e.email === currentUser.email);
        setEmployeeId(self?.id || items[0]?.id || "");
      })
      .catch((err) => {
        console.error("Failed to load employees", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (id: string, action: "approve" | "reject") => {
    if (busyId) return;
    setBusyId(id);
    setNotice(null);
    try {
      const res =
        action === "approve"
          ? await leaveApi.approveLeave(id, { approvedBy: currentUser.name })
          : await leaveApi.rejectLeave(id, { approvedBy: currentUser.name });
      setLeaves((prev) => prev.map((l) => (l.id === id ? mapLeave(res.data) : l)));
      // Approving annual leave changes the employee's balance; refresh it.
      hrmApi.listEmployees({ perPage: 200 }).then((r) => setEmployees(r.data || [])).catch(() => {});
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal memproses pengajuan cuti.");
    } finally {
      setBusyId(null);
    }
  };
  const handleApprove = (id: string) => decide(id, "approve");
  const handleReject = (id: string) => decide(id, "reject");

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !employeeId) return;
    setFormError(null);

    try {
      const res = await leaveApi.createLeave({
        employeeId,
        type,
        startDate,
        endDate,
        totalDays: totalDays > 0 ? totalDays : undefined,
        reason,
      });
      setLeaves((prev) => [mapLeave(res.data), ...prev]);
      setIsNewLeaveOpen(false);
      setReason("");
      setTotalDays(0);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mengirim pengajuan.");
    }
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: "id",
      header: "ID & Pemohon",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.id}</span>
          <div className="font-bold text-foreground text-xs mt-0.5">{row.name}</div>
          <div className="text-[11px] text-muted-foreground">{row.department}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Jenis Cuti / Izin",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-brand-indigo border border-purple-200">
          {row.type}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Periode & Hari",
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-semibold text-foreground">
            {row.startDate} s/d {row.endDate}
          </div>
          <div className="text-[11px] text-muted-foreground font-bold">{row.totalDays} Hari Kerja</div>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Alasan",
      render: (row) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">{row.reason}</span>
      ),
    },
    {
      key: "status",
      header: "Status Persetujuan",
      render: (row) => {
        const styles: Record<string, string> = {
          "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
          Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
      key: "actions",
      header: "Otorisasi",
      render: (row) => {
        // A request raised for the signed-in user's own employee record cannot be decided by them.
        const ownRequest = employees.some((e) => e.id === row.employeeId && isOwn(e.email));
        if (row.status === "Pending Approval" && mayApprove && !ownRequest) {
          return (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="gradient"
                onClick={() => handleApprove(row.id)}
                disabled={busyId === row.id}
                className="h-7 px-2 text-[11px] font-bold"
              >
                Setujui
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(row.id)}
                disabled={busyId === row.id}
                className="h-7 px-2 text-[11px] text-rose-600 border-rose-200"
              >
                Tolak
              </Button>
            </div>
          );
        }
        return (
          <span className="text-[11px] text-muted-foreground">
            Oleh: {row.approvedBy || "-"}
          </span>
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
            <CalendarDays className="h-6 w-6 text-brand-primary" />
            <span>Manajemen Cuti & Perizinan Karyawan</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Pengajuan cuti tahunan, izin sakit, alur persetujuan bertingkat atasan, dan monitoring kuota cuti.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewLeaveOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Ajukan Cuti / Izin</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Sisa Kuota Cuti Tahunan Anda</span>
            <div className="text-2xl font-black text-brand-dark">
              {(() => {
                const self = employees.find((e) => e.email && e.email === currentUser.email);
                if (!self) return "-";
                return `${(self.leaveQuotaDays ?? 12) - (self.leaveUsedDays ?? 0)} Hari`;
              })()}
            </div>
            <span className="text-[11px] text-muted-foreground">
              Dari total hak {employees.find((e) => e.email === currentUser.email)?.leaveQuotaDays ?? 12} hari/tahun
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Pengajuan Menunggu Approval</span>
            <div className="text-2xl font-black text-amber-600">
              {leaves.filter((l) => l.status === "Pending Approval").length} Pengajuan
            </div>
            <span className="text-[11px] text-muted-foreground">Memerlukan tindakan atasan</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Cuti Terpakai Bulan Ini</span>
            <div className="text-2xl font-black text-emerald-600">
              {leaves
                .filter((l) => l.status === "Approved" && l.startDate.startsWith(todayJakarta().slice(0, 7)))
                .reduce((sum, l) => sum + l.totalDays, 0)}{" "}
              Hari
            </div>
            <span className="text-[11px] text-muted-foreground">Cuti disetujui yang dimulai bulan ini</span>
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
          <DataTable data={leaves} columns={columns} />
        )}
      </div>

      {/* Modal Ajukan Cuti */}
      <Dialog open={isNewLeaveOpen} onOpenChange={setIsNewLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Pengajuan Cuti / Izin Karyawan</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLeave} className="space-y-3.5 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">Karyawan *</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="">Pilih karyawan...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.department}
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <p className="text-[11px] text-muted-foreground">
                  Sisa kuota cuti: {(selectedEmployee.leaveQuotaDays ?? 12) - (selectedEmployee.leaveUsedDays ?? 0)} dari{" "}
                  {selectedEmployee.leaveQuotaDays ?? 12} hari/tahun
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Jenis Cuti / Izin *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {lt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Tanggal Mulai</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Tanggal Selesai</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Jumlah Hari Kerja</label>
              <Input
                type="number"
                min={0}
                max={calendarDays(startDate, endDate)}
                value={totalDays || ""}
                placeholder={`${calendarDays(startDate, endDate)} (seluruh rentang tanggal)`}
                onChange={(e) => setTotalDays(Number(e.target.value))}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Kosongkan untuk memakai seluruh rentang. Isi lebih kecil bila ada akhir pekan/libur.
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Alasan Pengajuan *</label>
              <textarea
                rows={3}
                placeholder="Jelaskan keperluan atau delegasi tugas selama cuti..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg border border-border bg-white text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewLeaveOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Kirim Pengajuan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
