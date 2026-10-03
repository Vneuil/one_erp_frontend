"use client";

import * as React from "react";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  Building,
  Briefcase,
  FileText,
  Calendar,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/utils/csv";
import { hrmApi, EmployeeItem as ApiEmp, TrainingHistoryItem } from "@/lib/api/hrm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface EmployeeItem {
  id: string;
  nip: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  contractType: "Permanent" | "Contract (PKWT)" | "Probation";
  joinDate: string;
  status: "Active" | "On Leave" | "Resigned";
  baseSalary: number;
  ptkpStatus: string;
  managerId: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("all");
  const [isNewEmpOpen, setIsNewEmpOpen] = React.useState(false);
  const [detailEmployee, setDetailEmployee] = React.useState<EmployeeItem | null>(null);
  const [edit, setEdit] = React.useState<{ name: string; email: string; phone: string; department: string; role: string; status: string; baseSalary: number; ptkpStatus: string; managerId: string } | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editBusy, setEditBusy] = React.useState(false);
  const [trainingHistory, setTrainingHistory] = React.useState<TrainingHistoryItem[]>([]);
  const [trainingLoading, setTrainingLoading] = React.useState(false);

  // Form State
  const [name, setName] = React.useState("");
  const [department, setDepartment] = React.useState("Operations & Supply Chain");
  const [role, setRole] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nip, setNip] = React.useState("");
  const [baseSalary, setBaseSalary] = React.useState(0);
  const [ptkpStatus, setPtkpStatus] = React.useState("TK/0");
  const [hasNpwp, setHasNpwp] = React.useState(true);
  const [contractType, setContractType] = React.useState<EmployeeItem["contractType"]>("Permanent");

  const fetchEmployees = () => {
    hrmApi
      .listEmployees()
      .then((res) => {
                  const mapped: EmployeeItem[] = (res.data || []).map((e: ApiEmp) => ({
            id: e.id,
            nip: e.nip,
            name: e.name,
            department: e.department,
            role: e.role,
            email: e.email || "",
            phone: e.phone || "-",
            contractType: (e.contractType as EmployeeItem["contractType"]) || "Permanent",
            joinDate: e.joinDate || "2026-01-01",
            status: (e.status as EmployeeItem["status"]) || "Active",
            baseSalary: e.baseSalary ?? 0,
            ptkpStatus: e.ptkpStatus ?? "TK/0",
            managerId: e.managerId ?? "",
          }));
          setEmployees(mapped);
          setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load employees", err);
        setLoadError("Gagal memuat data karyawan dari server.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    fetchEmployees();
  }, []);

  const openEmployeeDetail = (emp: EmployeeItem) => {
    setDetailEmployee(emp);
    setTrainingHistory([]);
    setTrainingLoading(true);
    hrmApi
      .getTrainingHistory(emp.id)
      .then((res) => setTrainingHistory(res.data || []))
      .catch((err) => console.warn("Failed to load training history", err))
      .finally(() => setTrainingLoading(false));
  };

  const startEdit = (emp: EmployeeItem) => {
    setEditError(null);
    setEdit({ name: emp.name, email: emp.email, phone: emp.phone === "-" ? "" : emp.phone, department: emp.department, role: emp.role, status: emp.status, baseSalary: emp.baseSalary, ptkpStatus: emp.ptkpStatus, managerId: emp.managerId });
  };

  const saveEdit = async () => {
    if (!detailEmployee || !edit) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await hrmApi.updateEmployee(detailEmployee.id, edit);
      setDetailEmployee({ ...detailEmployee, ...edit, phone: edit.phone || "-", status: edit.status as EmployeeItem["status"] });
      setEdit(null);
      fetchEmployees();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setEditBusy(false);
    }
  };

  const removeEmployee = async () => {
    if (!detailEmployee || !window.confirm(`Hapus karyawan ${detailEmployee.name}? Untuk karyawan yang berhenti, lebih baik ubah statusnya.`)) return;
    setEditError(null);
    try {
      await hrmApi.deleteEmployee(detailEmployee.id);
      setDetailEmployee(null);
      fetchEmployees();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menghapus karyawan.");
    }
  };

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.nip.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === "all" || e.department === selectedDept;
    return matchSearch && matchDept;
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !nip.trim()) return;
    setFormError(null);

    try {
      await hrmApi.createEmployee({
        nip: nip.trim(),
        name,
        department,
        role,
        email,
        phone,
        contractType,
        baseSalary,
        ptkpStatus,
        hasNpwp,
      });
      fetchEmployees();
      setIsNewEmpOpen(false);
      setNip("");
      setName("");
      setRole("");
      setEmail("");
      setPhone("");
      setBaseSalary(0);
      setPtkpStatus("TK/0");
      setHasNpwp(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan karyawan.");
    }
  };

  const columns: Column<EmployeeItem>[] = [
    {
      key: "nip",
      header: "NIP & Karyawan",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.nip}</span>
          <div className="font-bold text-foreground text-xs mt-0.5">{row.name}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3 text-brand-primary" />
            <span>{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Departemen & Jabatan",
      render: (row) => (
        <div>
          <span className="font-semibold text-xs text-foreground">{row.department}</span>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Briefcase className="h-3 w-3 text-muted-foreground" />
            <span>{row.role}</span>
          </div>
        </div>
      ),
    },
    {
      key: "contractType",
      header: "Status Kontrak",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
          {row.contractType}
        </span>
      ),
    },
    {
      key: "joinDate",
      header: "Tanggal Bergabung",
      render: (row) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {row.joinDate}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status Kepegawaian",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            row.status === "Active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          ● {row.status}
        </span>
      ),
    },
    {
      key: "id",
      header: "Detail",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openEmployeeDetail(row)}
          className="h-7 px-2 text-[11px] font-bold"
        >
          Lihat Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-brand-primary" />
            <span>Direktori Karyawan & Organisasi (HRM)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola data staf, NIP, departemen, jabatan kerja, status kontrak PKWT/Tetap, dan arsip dokumen kepegawaian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                "employee-recap.csv",
                ["NIP", "Nama", "Departemen", "Jabatan", "Email", "Telepon", "Tipe Kontrak", "Tanggal Masuk", "Status"],
                employees.map((e) => [e.nip, e.name, e.department, e.role, e.email, e.phone, e.contractType, e.joinDate, e.status])
              )
            }
            className="h-9 gap-1.5 text-xs border-border"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ekspor Karyawan</span>
          </Button>

          <Button
            variant="gradient"
            size="sm"
            onClick={() => setIsNewEmpOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Karyawan Baru</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Karyawan Aktif</span>
            <div className="text-2xl font-black text-brand-dark">{employees.length} Personel</div>
            <span className="text-[11px] text-muted-foreground">5 Departemen Operasional</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Karyawan Tetap (PKWTT)</span>
            <div className="text-2xl font-black text-brand-indigo">
              {employees.filter((e) => e.contractType === "Permanent").length} Orang
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">Retensi Organisasi 100%</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Kontrak & Probation</span>
            <div className="text-2xl font-black text-foreground">
              {employees.filter((e) => e.contractType !== "Permanent").length} Orang
            </div>
            <span className="text-[11px] text-muted-foreground">Review evaluasi berkala</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIP, email, jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            {["all", "Executive Management", "Operations & Supply Chain", "Finance & Accounting", "Sales & Marketing", "Manufacturing & Production"].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDept(d)}
                className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDept === d
                    ? "bg-brand-primary text-white"
                    : "bg-slate-100 text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === "all" ? "Semua Divisi" : d}
              </button>
            ))}
          </div>
        </div>

        {loadError && (
          <div role="alert" className="m-3 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {loadError}
          </div>
        )}
        <DataTable data={filtered} columns={columns} />
      </div>

      {/* Modal Tambah Karyawan */}
      <Dialog open={isNewEmpOpen} onOpenChange={setIsNewEmpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Registrasi Karyawan Baru</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs text-left">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-foreground">NIP *</label>
              <Input
                placeholder="Contoh: EMP-010"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Nama Lengkap Karyawan *</label>
              <Input
                placeholder="Contoh: Hendra Saputra"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Departemen</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="Operations & Supply Chain">Operations & Supply Chain</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Sales & Marketing">Sales & Marketing</option>
                  <option value="Manufacturing & Production">Manufacturing & Production</option>
                  <option value="Executive Management">Executive Management</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Jabatan / Role *</label>
                <Input
                  placeholder="Contoh: Staff Gudang WMS"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Email Kantor</label>
                <Input
                  type="email"
                  placeholder="hendra@one-erp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Nomor Telepon</label>
                <Input
                  placeholder="+62 812-xxxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Gaji Pokok (Rp)</label>
                <Input
                  type="number"
                  min={0}
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Status PTKP (PPh 21)</label>
                <select
                  value={ptkpStatus}
                  onChange={(e) => setPtkpStatus(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  {["TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 font-medium text-foreground">
              <input type="checkbox" checked={hasNpwp} onChange={(e) => setHasNpwp(e.target.checked)} />
              <span>Karyawan memiliki NPWP</span>
            </label>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Jenis Hubungan Kerja (Kontrak)</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value as EmployeeItem["contractType"])}
                className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
              >
                <option value="Permanent">Karyawan Tetap (PKWTT)</option>
                <option value="Contract (PKWT)">Kontrak Waktu Tertentu (PKWT)</option>
                <option value="Probation">Masa Percobaan (Probation)</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewEmpOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Simpan Karyawan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Detail / Training History */}
      <Dialog open={Boolean(detailEmployee)} onOpenChange={(open) => !open && setDetailEmployee(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-brand-primary" />
              <span>{detailEmployee?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {detailEmployee && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-border">
                <div>
                  <span className="text-muted-foreground">NIP</span>
                  <div className="font-semibold text-foreground">{detailEmployee.nip}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Departemen</span>
                  <div className="font-semibold text-foreground">{detailEmployee.department}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Jabatan</span>
                  <div className="font-semibold text-foreground">{detailEmployee.role}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Kontrak</span>
                  <div className="font-semibold text-foreground">{detailEmployee.contractType}</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  Riwayat Pelatihan (Training History)
                </p>
                {trainingLoading ? (
                  <p className="text-muted-foreground">Memuat riwayat pelatihan...</p>
                ) : trainingHistory.length === 0 ? (
                  <p className="text-muted-foreground">Belum ada riwayat pelatihan/kursus LMS untuk karyawan ini.</p>
                ) : (
                  <div className="space-y-1.5">
                    {trainingHistory.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-border bg-white"
                      >
                        <div>
                          <div className="font-semibold text-foreground">Course ID: {t.courseId}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Terdaftar: {t.enrolledDate || "-"}
                            {t.completedDate ? ` • Selesai: ${t.completedDate}` : ""}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {t.status === "completed" ? "Selesai" : `${t.progressPercent}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {editError && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{editError}</div>}
          {edit && (
            <div className="grid grid-cols-2 gap-2 text-xs border rounded-lg p-3">
              {(["name", "email", "phone", "department", "role", "status"] as const).map((k) => (
                <label key={k} className="space-y-1 font-semibold capitalize">{k}
                  <Input value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} className="h-8 text-xs" />
                </label>
              ))}
              <label className="space-y-1 font-semibold">Gaji pokok
                <Input type="number" min={0} value={edit.baseSalary} onChange={(e) => setEdit({ ...edit, baseSalary: Number(e.target.value) })} className="h-8 text-xs" />
              </label>
              <label className="space-y-1 font-semibold">Status PTKP
                <Input value={edit.ptkpStatus} onChange={(e) => setEdit({ ...edit, ptkpStatus: e.target.value })} className="h-8 text-xs" />
              </label>
              <label className="space-y-1 font-semibold col-span-2">Atasan langsung
                <select value={edit.managerId} onChange={(e) => setEdit({ ...edit, managerId: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                  <option value="">Tidak ada (puncak struktur)</option>
                  {employees.filter((x) => x.id !== detailEmployee?.id).map((x) => <option key={x.id} value={x.id}>{x.name} — {x.role}</option>)}
                </select>
              </label>
              <div className="col-span-2 flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setEdit(null)} className="h-8 text-xs">Batal</Button>
                <Button size="sm" disabled={editBusy} onClick={saveEdit} className="h-8 text-xs font-bold">{editBusy ? "Menyimpan…" : "Simpan"}</Button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            {detailEmployee && !edit && (
              <>
                <Button variant="outline" size="sm" onClick={() => startEdit(detailEmployee)} className="h-9 text-xs">Ubah</Button>
                <Button variant="outline" size="sm" onClick={removeEmployee} className="h-9 text-xs text-rose-600">Hapus</Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailEmployee(null)}
              className="h-9 text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
