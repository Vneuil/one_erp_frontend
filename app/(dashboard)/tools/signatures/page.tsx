"use client";

import * as React from "react";
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Download,
  PenTool,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { downloadCsv } from "@/lib/utils/csv";
import { docflowApi } from "@/lib/api/docflow";
import { useAppStore } from "@/stores/app-store";

interface SignatureDoc {
  id: string;
  docCode: string;
  title: string;
  docType: "Sales Quotation" | "Purchase Order" | "Employee Contract" | "Surat Jalan BAST";
  signers: { name: string; role: string; hasSigned: boolean; requestId?: string }[];
  status: "Pending Your Signature" | "Fully Signed" | "Waiting Others";
  createdAt: string;
}

function mapDocStatus(apiStatus: string): SignatureDoc["status"] {
  if (apiStatus === "signed") return "Fully Signed";
  if (apiStatus === "pending_signature") return "Pending Your Signature";
  return "Waiting Others";
}

export default function SignaturesPage() {
  const { currentUser } = useAppStore();
  const [docs, setDocs] = React.useState<SignatureDoc[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    docflowApi
      .listDocuments()
      .then(async (res) => {
        const mapped = await Promise.all(
          res.data.map(async (d) => {
            let signers: SignatureDoc["signers"] = [];
            try {
              const detail = await docflowApi.getDocument(d.id);
              signers = detail.data.signers.map((s) => ({
                name: s.signerName,
                role: "Signer",
                hasSigned: s.status === "signed",
                requestId: s.id,
              }));
            } catch {
              signers = [];
            }
            return {
              id: d.id,
              docCode: d.fileName.replace(/\.[^.]+$/, ""),
              title: d.title,
              docType: "Sales Quotation" as const,
              signers,
              status: mapDocStatus(d.status),
              createdAt: (d.uploadedAt || d.createdAt || new Date().toISOString()).slice(0, 10),
            };
          })
        );
        setDocs(mapped);
      })
      .catch((err) => {
        console.error("Failed to load signature documents", err);
        setLoadError("Gagal memuat dokumen tanda tangan dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleDownload = async (doc: SignatureDoc) => {
    try {
      const res = await docflowApi.downloadDocument(doc.id);
      if ("blob" in res) {
        const url = URL.createObjectURL(res.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.filename || `${doc.docCode}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download document.";
      setNotice(message);
      return;
    }

    downloadCsv(
      `${doc.docCode}.csv`,
      ["Field", "Value"],
      [
        ["Document Code", doc.docCode],
        ["Title", doc.title],
        ["Type", doc.docType],
        ["Status", doc.status],
        ["Created At", doc.createdAt],
        ...doc.signers.map((s) => [`Signer: ${s.name}`, s.hasSigned ? "Signed" : "Pending"]),
      ]
    );
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const doc = await docflowApi.uploadDocument({
        title: file.name,
        fileName: file.name,
        file,
      });
      const signer = await docflowApi.addSigner(doc.data.id, {
        signerName: currentUser.name,
        signerEmail: currentUser.email,
      });
      setDocs([
        {
          id: doc.data.id,
          docCode: file.name.replace(/\.[^.]+$/, ""),
          title: file.name,
          docType: "Sales Quotation",
          signers: [{ name: currentUser.name, role: "Signer", hasSigned: false, requestId: signer.data.id }],
          status: "Pending Your Signature",
          createdAt: new Date().toISOString().slice(0, 10),
        },
        ...docs,
      ]);
      setNotice(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mengunggah dokumen.");
    }
  };

  // A signature only exists once the server has recorded it; a failed call must
  // never leave a document looking signed.
  const handleSign = async (id: string) => {
    const doc = docs.find((d) => d.id === id);
    const currentSigner = doc?.signers.find((s) => s.name === currentUser.name);
    if (!currentSigner?.requestId) {
      setNotice("Anda bukan penandatangan yang terdaftar untuk dokumen ini.");
      return;
    }
    setNotice(null);
    try {
      await docflowApi.signRequest(currentSigner.requestId);
      const detail = await docflowApi.getDocument(id);
      setDocs((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                signers: detail.data.signers.map((s) => ({
                  name: s.signerName,
                  role: "Signer",
                  hasSigned: s.status === "signed",
                  requestId: s.id,
                })),
                status: mapDocStatus(detail.data.status),
              }
            : d
        )
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mencatat tanda tangan.");
    }
  };

  const columns: Column<SignatureDoc>[] = [
    {
      key: "docCode",
      header: "Kode & Dokumen",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-brand-dark text-xs">{row.docCode}</span>
          <div className="font-bold text-foreground text-xs mt-0.5">{row.title}</div>
          <div className="text-[11px] text-muted-foreground">{row.docType}</div>
        </div>
      ),
    },
    {
      key: "signers",
      header: "Penandatangan",
      render: (row) => (
        <div className="space-y-1 text-xs">
          {row.signers.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${s.hasSigned ? "bg-emerald-500" : "bg-amber-400"}`}
              />
              <span className="font-medium text-foreground">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">({s.role})</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status Alur Tanda Tangan",
      render: (row) => {
        const styles: Record<string, string> = {
          "Pending Your Signature": "bg-purple-50 text-brand-indigo border-purple-200 font-bold",
          "Fully Signed": "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
          "Waiting Others": "bg-amber-50 text-amber-700 border-amber-200",
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
        if (row.status === "Pending Your Signature") {
          return (
            <Button
              size="sm"
              variant="gradient"
              onClick={() => handleSign(row.id)}
              className="h-7 px-2.5 text-[11px] font-bold gap-1 shadow-xs"
            >
              <PenTool className="h-3 w-3" />
              <span>Tandatangani</span>
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload(row)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Download className="h-3 w-3" />
            <span>Unduh PDF</span>
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
            <FileCheck className="h-6 w-6 text-brand-primary" />
            <span>Tanda Tangan Elektronik & Validasi Dokumen (E-Signature)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Alur pengesahan kontrak, PO, penawaran harga, dan surat jalan dengan jejak audit trail & sertifikat kriptografi legal.
          </p>
        </div>

        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelected} />
        <Button
          variant="gradient"
          size="sm"
          onClick={handleUploadClick}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Minta Tanda Tangan Dokumen</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Menunggu Tanda Tangan Anda</span>
            <div className="text-2xl font-black text-brand-indigo">
              {docs.filter((d) => d.status === "Pending Your Signature").length} Dokumen
            </div>
            <span className="text-[11px] text-muted-foreground">Memerlukan otorisasi pimpinan</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Dokumen Sah & Lengkap (Fully Signed)</span>
            <div className="text-2xl font-black text-emerald-600">
              {docs.filter((d) => d.status === "Fully Signed").length} Berkas
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Dilengkapi Audit Trail Digital
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Kepatuhan Hukum & Keabsahan</span>
            <div className="text-2xl font-black text-brand-dark">100% Sah</div>
            <span className="text-[11px] text-muted-foreground">Standar UU ITE & Enkripsi SHA-256</span>
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
          <DataTable data={docs} columns={columns} />
        )}
      </div>
    </div>
  );
}
