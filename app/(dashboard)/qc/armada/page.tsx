"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Truck,
  Plus,
  Printer,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Info,
  User,
  Car,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { errText, useReport } from "@/components/reports/report-ui";
import {
  qcApi,
  ArmadaCheckItem,
  CreateArmadaCheckInput,
  UpdateArmadaCheckInput,
} from "@/lib/api/qc";

const selectCls =
  "w-full h-9 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:ring-1 focus:ring-primary";

export default function SupplierArmadaPage() {
  const searchParams = useSearchParams();
  const initialLbmNo = searchParams.get("lbmNo") || "";
  const initialGrId = searchParams.get("goodsReceiptId") || "";

  const [reload, setReload] = React.useState(0);
  const [filterDate, setFilterDate] = React.useState("");
  const [filterLbm, setFilterLbm] = React.useState(initialLbmNo);
  const [searchKeyword, setSearchKeyword] = React.useState("");

  const { data: rawChecks, loading, error } = useReport(
    `qc-armada|${reload}|${filterDate}|${filterLbm}`,
    () =>
      qcApi
        .listArmadaChecks({
          date: filterDate || undefined,
          lbmNo: filterLbm || undefined,
        })
        .then((r) => r.data || [])
  );
  const checks: ArmadaCheckItem[] = rawChecks ?? [];

  // Filter in memory for search
  const filteredChecks = React.useMemo(() => {
    if (!searchKeyword.trim()) return checks;
    const q = searchKeyword.toLowerCase();
    return checks.filter(
      (c) =>
        c.driverName.toLowerCase().includes(q) ||
        (c.licensePlate && c.licensePlate.toLowerCase().includes(q)) ||
        (c.companyOrigin && c.companyOrigin.toLowerCase().includes(q)) ||
        (c.cargoDesc && c.cargoDesc.toLowerCase().includes(q)) ||
        (c.lbmNo && c.lbmNo.toLowerCase().includes(q))
    );
  }, [checks, searchKeyword]);

  // Statistics
  const totalArmada = checks.length;
  const clearedArmada = checks.filter((c) => c.overallStatus === "cleared").length;
  const flaggedArmada = checks.filter((c) => c.overallStatus === "flagged").length;
  const rejectedArmada = checks.filter((c) => c.overallStatus === "rejected").length;

  // Dialog State (Create / Edit)
  const [isOpen, setIsOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ArmadaCheckItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Detail View Modal
  const [viewItem, setViewItem] = React.useState<ArmadaCheckItem | null>(null);

  // Form State
  const [formData, setFormData] = React.useState<CreateArmadaCheckInput>({
    goodsReceiptId: initialGrId || undefined,
    lbmNo: initialLbmNo,
    checkDate: new Date().toISOString().slice(0, 10),
    driverName: "",
    idNumber: "",
    birthPlace: "",
    birthDate: "",
    gender: "Laki-laki",
    address: "",
    religion: "Islam",
    maritalStatus: "Menikah",
    idExpiry: "Seumur Hidup",
    companyOrigin: "",
    cargoDesc: "Bahan Baku Gula Kelapa",
    licensePlate: "",
    vehicleType: "Truk Engkel",
    cabinSafe: true,
    undercarriageSafe: true,
    cargoAreaSafe: true,
    floorClean: true,
    wallRightClean: true,
    wallLeftClean: true,
    ceilingClean: true,
    doorClean: true,
    qcName: "Adin (QC Inspector)",
    qaName: "Mario (QA Spv)",
    notes: "",
  });

  const handleOpenCreate = () => {
    setEditTarget(null);
    setFormData({
      goodsReceiptId: initialGrId || undefined,
      lbmNo: filterLbm || "",
      checkDate: new Date().toISOString().slice(0, 10),
      driverName: "",
      idNumber: "",
      birthPlace: "Banyumas",
      birthDate: "1988-05-12",
      gender: "Laki-laki",
      address: "",
      religion: "Islam",
      maritalStatus: "Menikah",
      idExpiry: "Seumur Hidup",
      companyOrigin: "",
      cargoDesc: "Bahan Baku Gula Kelapa",
      licensePlate: "",
      vehicleType: "Truk Engkel",
      cabinSafe: true,
      undercarriageSafe: true,
      cargoAreaSafe: true,
      floorClean: true,
      wallRightClean: true,
      wallLeftClean: true,
      ceilingClean: true,
      doorClean: true,
      qcName: "Adin (QC Inspector)",
      qaName: "Mario (QA Spv)",
      notes: "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (item: ArmadaCheckItem) => {
    setEditTarget(item);
    setFormData({
      goodsReceiptId: item.goodsReceiptId,
      lbmNo: item.lbmNo || "",
      checkDate: item.checkDate,
      driverName: item.driverName,
      idNumber: item.idNumber || "",
      birthPlace: item.birthPlace || "",
      birthDate: item.birthDate || "",
      gender: item.gender || "Laki-laki",
      address: item.address || "",
      religion: item.religion || "Islam",
      maritalStatus: item.maritalStatus || "Menikah",
      idExpiry: item.idExpiry || "",
      companyOrigin: item.companyOrigin || "",
      cargoDesc: item.cargoDesc || "",
      licensePlate: item.licensePlate || "",
      vehicleType: item.vehicleType || "Truk",
      cabinSafe: item.cabinSafe,
      undercarriageSafe: item.undercarriageSafe,
      cargoAreaSafe: item.cargoAreaSafe,
      floorClean: item.floorClean,
      wallRightClean: item.wallRightClean,
      wallLeftClean: item.wallLeftClean,
      ceilingClean: item.ceilingClean,
      doorClean: item.doorClean,
      qcName: item.qcName || "",
      qaName: item.qaName || "",
      notes: item.notes || "",
    });
    setFormError(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.driverName.trim()) {
      setFormError("Nama pengemudi wajib diisi");
      return;
    }
    if (!formData.licensePlate?.trim()) {
      setFormError("Nomor polisi kendaraan wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editTarget) {
        await qcApi.updateArmadaCheck(editTarget.id, formData);
      } else {
        await qcApi.createArmadaCheck(formData);
      }
      setIsOpen(false);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      setFormError(errText(err, "Gagal menyimpan checklist armada supplier"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus catatan checklist armada ini?")) return;
    try {
      await qcApi.deleteArmadaCheck(id);
      setReload((p) => p + 1);
    } catch (err: unknown) {
      alert(errText(err, "Gagal menghapus data"));
    }
  };

  // Cetak Dokumen Resmi QC-007-CAS. 02 Per-Armada
  const handlePrintSingleCheck = (item: ArmadaCheckItem) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Gagal membuka jendela cetak. Izinkan popup browser.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Form QC-007-CAS. 02 - Checklist Armada Supplier</title>
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 9pt; color: #000; margin: 0; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .company { font-weight: bold; font-size: 13pt; text-transform: uppercase; }
          .title { text-align: center; font-size: 12pt; font-weight: bold; margin: 10px 0 15px; }
          .section-title { font-weight: bold; font-size: 9.5pt; background: #f1f5f9; padding: 4px 8px; border-left: 3px solid #000; margin: 12px 0 6px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          table.data-table td { padding: 4px 6px; vertical-align: top; }
          .label { width: 28%; color: #333; font-weight: 500; }
          .val { width: 72%; font-weight: 600; }
          table.grid-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          table.grid-table th, table.grid-table td { border: 1px solid #333; padding: 5px 8px; font-size: 8.5pt; }
          table.grid-table th { background: #f8fafc; text-align: left; }
          .check-ok { color: #15803d; font-weight: bold; }
          .check-bad { color: #b91c1c; font-weight: bold; }
          .catatan-box { font-size: 8pt; border: 1px solid #777; padding: 8px; background: #fafafa; margin-top: 15px; border-radius: 4px; }
          .signatures { display: flex; justify-content: space-around; margin-top: 30px; }
          .sig-box { width: 180px; text-align: center; }
          .sig-line { margin-top: 55px; border-bottom: 1px solid #000; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">CV. Manna Anugerah Sejahtera</div>
            <div style="font-size: 8pt; color: #444;">Food Safety & Quality Assurance System</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 10pt;">form-QC-007-CAS. 02</div>
            <div style="font-size: 8pt;">Checklist Armada Supplier (CAS)</div>
          </div>
        </div>

        <div class="title">CHECKLIST ARMADA SUPPLIER (CAS)</div>

        <div class="section-title">1. IDENTITAS PENGEMUDI</div>
        <table class="data-table">
          <tr>
            <td class="label">KTP / SIM No.</td>
            <td class="val">: ${item.idNumber || "-"}</td>
          </tr>
          <tr>
            <td class="label">Nama Lengkap</td>
            <td class="val">: ${item.driverName}</td>
          </tr>
          <tr>
            <td class="label">TTL</td>
            <td class="val">: ${item.birthPlace || "-"}, ${item.birthDate || "-"}</td>
          </tr>
          <tr>
            <td class="label">Jenis Kelamin</td>
            <td class="val">: ${item.gender || "-"}</td>
          </tr>
          <tr>
            <td class="label">Alamat</td>
            <td class="val">: ${item.address || "-"}</td>
          </tr>
          <tr>
            <td class="label">Agama</td>
            <td class="val">: ${item.religion || "-"}</td>
          </tr>
          <tr>
            <td class="label">Status</td>
            <td class="val">: ${item.maritalStatus || "-"}</td>
          </tr>
          <tr>
            <td class="label">Masa Berlaku</td>
            <td class="val">: ${item.idExpiry || "-"}</td>
          </tr>
        </table>

        <div class="section-title">2. IDENTITAS KENDARAAN</div>
        <table class="data-table">
          <tr>
            <td class="label">Asal Perusahaan</td>
            <td class="val">: ${item.companyOrigin || "-"}</td>
          </tr>
          <tr>
            <td class="label">Barang yang dibawa</td>
            <td class="val">: ${item.cargoDesc || "-"} ${item.lbmNo ? `(Ref LBM: ${item.lbmNo})` : ""}</td>
          </tr>
          <tr>
            <td class="label">Nomor Polisi Kendaraan</td>
            <td class="val">: ${item.licensePlate || "-"}</td>
          </tr>
          <tr>
            <td class="label">Jenis Armada</td>
            <td class="val">: ${item.vehicleType || "-"}</td>
          </tr>
        </table>

        <div class="section-title">3. PEMERIKSAAN BARANG / BAHAN MENCURIGAKAN</div>
        <table class="grid-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>Area Pemeriksaan</th>
              <th style="width: 140px; text-align: center;">Hasil Pemeriksaan</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td>Ruang Kemudi</td>
              <td style="text-align: center;" class="${item.cabinSafe ? "check-ok" : "check-bad"}">${item.cabinSafe ? "✓ Aman" : "✗ Ada Barang Mencurigakan"}</td>
              <td>Bebas dari bahan kimia / komoditas asing</td>
            </tr>
            <tr>
              <td style="text-align: center;">2</td>
              <td>Bagian Bawah Kendaraan</td>
              <td style="text-align: center;" class="${item.undercarriageSafe ? "check-ok" : "check-bad"}">${item.undercarriageSafe ? "✓ Aman" : "✗ Ada Barang Mencurigakan"}</td>
              <td>Bebas dari tetesan oli / kontaminan</td>
            </tr>
            <tr>
              <td style="text-align: center;">3</td>
              <td>Bagian Dalam Kendaraan (Bak / Box)</td>
              <td style="text-align: center;" class="${item.cargoAreaSafe ? "check-ok" : "check-bad"}">${item.cargoAreaSafe ? "✓ Aman" : "✗ Ada Barang Mencurigakan"}</td>
              <td>Hanya berisi muatan yang tertulis di surat jalan</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">4. KEBERSIHAN KENDARAAN</div>
        <table class="grid-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>Bagian Kendaraan</th>
              <th style="width: 140px; text-align: center;">Kondisi Kebersihan</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td>Lantai Kendaraan</td>
              <td style="text-align: center;" class="${item.floorClean ? "check-ok" : "check-bad"}">${item.floorClean ? "✓ Bersih" : "✗ Tidak Bersih"}</td>
              <td>Bebas tumpahan cairan / sisa kotoran padat</td>
            </tr>
            <tr>
              <td style="text-align: center;">2</td>
              <td>Dinding Kanan</td>
              <td style="text-align: center;" class="${item.wallRightClean ? "check-ok" : "check-bad"}">${item.wallRightClean ? "✓ Bersih" : "✗ Tidak Bersih"}</td>
              <td>Bebas debu tebal / serangga / kontaminasi</td>
            </tr>
            <tr>
              <td style="text-align: center;">3</td>
              <td>Dinding Kiri</td>
              <td style="text-align: center;" class="${item.wallLeftClean ? "check-ok" : "check-bad"}">${item.wallLeftClean ? "✓ Bersih" : "✗ Tidak Bersih"}</td>
              <td>Kering dan layak angkut pangan</td>
            </tr>
            <tr>
              <td style="text-align: center;">4</td>
              <td>Atap (Terpal / Plafon)</td>
              <td style="text-align: center;" class="${item.ceilingClean ? "check-ok" : "check-bad"}">${item.ceilingClean ? "✓ Bersih" : "✗ Tidak Bersih"}</td>
              <td>Rapat, tidak bocor, tidak ada kotoran</td>
            </tr>
            <tr>
              <td style="text-align: center;">5</td>
              <td>Pintu Kendaraan</td>
              <td style="text-align: center;" class="${item.doorClean ? "check-ok" : "check-bad"}">${item.doorClean ? "✓ Bersih" : "✗ Tidak Bersih"}</td>
              <td>Dapat menutup rapat dan tersegel</td>
            </tr>
          </tbody>
        </table>

        <div class="catatan-box">
          <strong>Catatan Kepatuhan:</strong><br/>
          &bull; <strong>Barang mencurigakan:</strong> Barang/komoditas yang tidak mendukung kedatangan bahan baku (bahan kimia dan bahan yang tidak ditulis dalam surat pengantar).<br/>
          &bull; <strong>Kebersihan:</strong> Meliputi kondisi kendaraan tidak terdapat kotoran berupa cairan atau padatan yang dapat mengontaminasi produk pangan.<br/>
          ${item.notes ? `&bull; <strong>Catatan Khusus Pemeriksa:</strong> ${item.notes}` : ""}
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div>Dibuat Oleh,</div>
            <div style="font-size: 8pt; color: #555; margin-top: 2px;">Tgl: ${item.checkDate}</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; margin-top: 4px;">QC (${item.qcName || "Staff QC"})</div>
          </div>
          <div class="sig-box">
            <div>Diverifikasi Oleh,</div>
            <div style="font-size: 8pt; color: #555; margin-top: 2px;">Tgl: ${item.checkDate}</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; margin-top: 4px;">QA (${item.qaName || "Staff QA"})</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const columns: Column<ArmadaCheckItem>[] = [
    {
      key: "checkDate",
      header: "Tanggal / Ref LBM",
      render: (item: ArmadaCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">{item.checkDate}</div>
          {item.lbmNo ? (
            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border">
              LBM: {item.lbmNo}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "licensePlate",
      header: "Armada & Plat",
      render: (item: ArmadaCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-mono font-bold text-slate-900">{item.licensePlate}</div>
          <div className="text-[11px] text-muted-foreground capitalize">{item.vehicleType || "Truk"}</div>
        </div>
      ),
    },
    {
      key: "driverName",
      header: "Pengemudi & Asal",
      render: (item: ArmadaCheckItem) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-800">{item.driverName}</div>
          <div className="text-[11px] text-muted-foreground">{item.companyOrigin || "-"}</div>
        </div>
      ),
    },
    {
      key: "cargoDesc",
      header: "Muatan",
      render: (item: ArmadaCheckItem) => (
        <div className="text-xs text-slate-700 max-w-[160px] truncate" title={item.cargoDesc}>
          {item.cargoDesc || "-"}
        </div>
      ),
    },
    {
      key: "safetyCleanliness",
      header: "Keamanan & Kebersihan",
      render: (item: ArmadaCheckItem) => {
        const isSafe = item.cabinSafe && item.undercarriageSafe && item.cargoAreaSafe;
        const isClean =
          item.floorClean &&
          item.wallRightClean &&
          item.wallLeftClean &&
          item.ceilingClean &&
          item.doorClean;
        return (
          <div className="text-[11px] space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[10px]">Aman:</span>
              {isSafe ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Bebas Barang Asing
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                  <XCircle className="h-3 w-3" /> Ada Bahan Mencurigakan
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-[10px]">Bersih:</span>
              {isClean ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Sanitasi Bersih
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" /> Perlu Pembersihan
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "overallStatus",
      header: "Status Kelayakan",
      render: (item: ArmadaCheckItem) => {
        let badgeCls = "bg-emerald-50 text-emerald-700 border-emerald-200";
        let label = "Cleared (Layak Masuk)";
        if (item.overallStatus === "flagged") {
          badgeCls = "bg-amber-50 text-amber-700 border-amber-200";
          label = "Flagged (Catatan)";
        } else if (item.overallStatus === "rejected") {
          badgeCls = "bg-rose-50 text-rose-700 border-rose-200";
          label = "Rejected (Tolak Masuk)";
        }
        return (
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeCls}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Aksi",
      render: (item: ArmadaCheckItem) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
            onClick={() => setViewItem(item)}
            title="Lihat Detail Form CAS"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
            onClick={() => handlePrintSingleCheck(item)}
            title="Cetak Formulir CAS (QC-007)"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-900"
            onClick={() => handleOpenEdit(item)}
            title="Edit Checklist"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-900"
            onClick={() => handleDelete(item.id)}
            title="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Checklist Armada Supplier (CAS)"
        description="Dokumen QC-007-CAS. 02 — Verifikasi keamanan muatan, deteksi barang mencurigakan, dan sanitasi armada pengangkut sebelum bongkar."
      >
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            Checklist Armada Baru
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Armada Diperiksa</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{totalArmada}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-emerald-200 bg-emerald-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 font-medium">Cleared (Aman & Bersih)</p>
              <h3 className="text-xl font-bold text-emerald-700 mt-1">{clearedArmada}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-amber-200 bg-amber-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-800 font-medium">Flagged (Catatan Sanitasi)</p>
              <h3 className="text-xl font-bold text-amber-700 mt-1">{flaggedArmada}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-rose-200 bg-rose-50/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-800 font-medium">Rejected (Ditolak Masuk)</p>
              <h3 className="text-xl font-bold text-rose-700 mt-1">{rejectedArmada}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dokumen Acuan Card */}
      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <Info className="h-4 w-4 text-indigo-600" />
          <span>Pedoman Inspeksi Armada Masuk (QC-007-CAS. 02):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-700">
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-rose-700">Barang / Bahan Mencurigakan:</strong> Barang/komoditas yang tidak mendukung kedatangan bahan baku (khususnya bahan kimia beracun, insektisida, pestisida, atau muatan liar yang tidak tertera pada surat pengantar).
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <strong className="text-emerald-700">Standar Kebersihan Armada:</strong> Bebas dari genangan cairan (oli, air kotor, bahan bakar) dan bebas kotoran padat yang dapat mengontaminasi produk pangan pangan selama bongkar muat.
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Tanggal:</span>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Ref LBM:</span>
            <Input
              placeholder="Cth: LBM-001-1126"
              value={filterLbm}
              onChange={(e) => setFilterLbm(e.target.value)}
              className="h-8 w-40 text-xs font-mono"
            />
          </div>

          {(filterDate || filterLbm) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setFilterDate("");
                setFilterLbm("");
              }}
            >
              Reset Filter
            </Button>
          )}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Cari supir / plat nomor..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={filteredChecks}
        isLoading={loading}
      />

      {/* Dialog: Form CAS (Multi-Section) */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-600" />
              {editTarget ? "Edit Checklist Armada Supplier" : "Checklist Armada Supplier (Form QC-007-CAS. 02)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Bagian 1: Identitas Pengemudi */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <User className="h-4 w-4 text-slate-500" />
                <span>1. Identitas Pengemudi (KTP / SIM)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">No. KTP / SIM</label>
                  <Input
                    placeholder="3302xxxxxxxxxxxx"
                    value={formData.idNumber || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, idNumber: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nama Lengkap *</label>
                  <Input
                    placeholder="Nama supir..."
                    value={formData.driverName}
                    onChange={(e) => setFormData((p) => ({ ...p, driverName: e.target.value }))}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Jenis Kelamin</label>
                  <select
                    className={selectCls}
                    value={formData.gender || "Laki-laki"}
                    onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Tempat Lahir</label>
                  <Input
                    placeholder="Kota lahir..."
                    value={formData.birthPlace || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, birthPlace: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Tanggal Lahir</label>
                  <Input
                    type="date"
                    value={formData.birthDate || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, birthDate: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Agama</label>
                  <Input
                    placeholder="Islam / Kristen / etc"
                    value={formData.religion || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, religion: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Status Perkawinan</label>
                  <select
                    className={selectCls}
                    value={formData.maritalStatus || "Menikah"}
                    onChange={(e) => setFormData((p) => ({ ...p, maritalStatus: e.target.value }))}
                  >
                    <option value="Menikah">Menikah</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Alamat Sesuai KTP</label>
                  <Input
                    placeholder="Alamat domisili..."
                    value={formData.address || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Masa Berlaku KTP/SIM</label>
                  <Input
                    placeholder="Seumur Hidup / YYYY-MM-DD"
                    value={formData.idExpiry || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, idExpiry: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 2: Identitas Kendaraan */}
            <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Car className="h-4 w-4 text-slate-500" />
                <span>2. Identitas Kendaraan & Muatan</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Nomor Polisi *</label>
                  <Input
                    placeholder="Cth: R 1234 AB"
                    value={formData.licensePlate || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, licensePlate: e.target.value.toUpperCase() }))}
                    required
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Jenis Armada</label>
                  <select
                    className={selectCls}
                    value={formData.vehicleType || "Truk Engkel"}
                    onChange={(e) => setFormData((p) => ({ ...p, vehicleType: e.target.value }))}
                  >
                    <option value="Pickup">Pickup</option>
                    <option value="Truk Engkel">Truk Engkel</option>
                    <option value="Truk Double">Truk Double</option>
                    <option value="Box / Wingbox">Box / Wingbox</option>
                    <option value="Tronton">Tronton</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Asal Perusahaan</label>
                  <Input
                    placeholder="Supplier / Ekspedisi..."
                    value={formData.companyOrigin || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, companyOrigin: e.target.value }))}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Ref LBM (Jika Ada)</label>
                  <Input
                    placeholder="LBM-001-1126"
                    value={formData.lbmNo || ""}
                    onChange={(e) => setFormData((p) => ({ ...p, lbmNo: e.target.value }))}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Barang / Komoditas yang Dibawa</label>
                <Input
                  placeholder="Cth: Gula Kelapa Semut / Kelapa Butir / Kemasan Sak"
                  value={formData.cargoDesc || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, cargoDesc: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Bagian 3: Barang Mencurigakan */}
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-3 bg-white">
              <div className="border-b pb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <span>3. Pemeriksaan Barang / Bahan Mencurigakan</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">Pilih &quot;Aman&quot; jika bebas kontaminan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Ruang Kemudi</span>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.cabinSafe === true}
                        onChange={() => setFormData((p) => ({ ...p, cabinSafe: true }))}
                        className="text-emerald-600"
                      />
                      <span className="text-emerald-700 font-semibold">✓ Aman</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.cabinSafe === false}
                        onChange={() => setFormData((p) => ({ ...p, cabinSafe: false }))}
                        className="text-rose-600"
                      />
                      <span className="text-rose-600 font-semibold">✗ Ada Temuan</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Bagian Bawah Kendaraan</span>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.undercarriageSafe === true}
                        onChange={() => setFormData((p) => ({ ...p, undercarriageSafe: true }))}
                        className="text-emerald-600"
                      />
                      <span className="text-emerald-700 font-semibold">✓ Aman</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.undercarriageSafe === false}
                        onChange={() => setFormData((p) => ({ ...p, undercarriageSafe: false }))}
                        className="text-rose-600"
                      />
                      <span className="text-rose-600 font-semibold">✗ Ada Temuan</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Bagian Dalam / Bak Box</span>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.cargoAreaSafe === true}
                        onChange={() => setFormData((p) => ({ ...p, cargoAreaSafe: true }))}
                        className="text-emerald-600"
                      />
                      <span className="text-emerald-700 font-semibold">✓ Aman</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.cargoAreaSafe === false}
                        onChange={() => setFormData((p) => ({ ...p, cargoAreaSafe: false }))}
                        className="text-rose-600"
                      />
                      <span className="text-rose-600 font-semibold">✗ Ada Temuan</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 4: Kebersihan Kendaraan */}
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-3 bg-white">
              <div className="border-b pb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>4. Kebersihan Fisik Kendaraan</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">Tidak boleh ada cairan oli/kotoran padat</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { key: "floorClean", label: "Lantai" },
                  { key: "wallRightClean", label: "Dinding Kanan" },
                  { key: "wallLeftClean", label: "Dinding Kiri" },
                  { key: "ceilingClean", label: "Atap / Plafon" },
                  { key: "doorClean", label: "Pintu Box" },
                ].map((item) => {
                  const val = formData[item.key as keyof CreateArmadaCheckInput] as boolean;
                  return (
                    <div key={item.key} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-800 block truncate">{item.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            [item.key]: !val,
                          }))
                        }
                        className={`w-full py-1 text-[11px] font-semibold rounded border transition-colors ${
                          val
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}
                      >
                        {val ? "✓ Bersih" : "✗ Kotor"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bagian 5: Verifikasi & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Dibuat Oleh (QC Inspector)</label>
                <Input
                  value={formData.qcName || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, qcName: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Diverifikasi Oleh (QA)</label>
                <Input
                  value={formData.qaName || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, qaName: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Catatan Tambahan Pemeriksa</label>
              <Input
                placeholder="Cth: Armada bersih, muatan terpal rapat, supir membawa surat jalan lengkap..."
                value={formData.notes || ""}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? "Menyimpan..." : editTarget ? "Perbarui Checklist" : "Simpan Checklist CAS"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: View Detail */}
      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Rincian Form QC-007-CAS. 02</span>
                <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border">
                  {viewItem.licensePlate}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pengemudi:</span>
                  <span className="font-bold text-slate-900">{viewItem.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. KTP/SIM:</span>
                  <span className="font-mono">{viewItem.idNumber || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asal Perusahaan:</span>
                  <span>{viewItem.companyOrigin || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Muatan:</span>
                  <span>{viewItem.cargoDesc || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ref LBM:</span>
                  <span className="font-mono">{viewItem.lbmNo || "-"}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-2.5 space-y-1.5">
                <div className="font-bold text-slate-800">Status Keamanan Muatan:</div>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-center">
                  <div className={`p-1.5 rounded border ${viewItem.cabinSafe ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Kemudi: {viewItem.cabinSafe ? "Aman" : "Temuan"}
                  </div>
                  <div className={`p-1.5 rounded border ${viewItem.undercarriageSafe ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Bawah: {viewItem.undercarriageSafe ? "Aman" : "Temuan"}
                  </div>
                  <div className={`p-1.5 rounded border ${viewItem.cargoAreaSafe ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Dalam: {viewItem.cargoAreaSafe ? "Aman" : "Temuan"}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-2.5 space-y-1.5">
                <div className="font-bold text-slate-800">Status Kebersihan Fisik:</div>
                <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                  <div className={`p-1 rounded border ${viewItem.floorClean ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Lantai
                  </div>
                  <div className={`p-1 rounded border ${viewItem.wallRightClean ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Dinding Ka
                  </div>
                  <div className={`p-1 rounded border ${viewItem.wallLeftClean ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Dinding Ki
                  </div>
                  <div className={`p-1 rounded border ${viewItem.ceilingClean ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Atap
                  </div>
                  <div className={`p-1 rounded border ${viewItem.doorClean ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                    Pintu
                  </div>
                </div>
              </div>

              {viewItem.notes && (
                <div className="text-[11px] text-slate-700 bg-amber-50/60 border border-amber-200 p-2 rounded">
                  <strong>Catatan:</strong> {viewItem.notes}
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handlePrintSingleCheck(viewItem)}
              >
                <Printer className="h-3.5 w-3.5" /> Cetak Form
              </Button>
              <Button variant="default" size="sm" onClick={() => setViewItem(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
