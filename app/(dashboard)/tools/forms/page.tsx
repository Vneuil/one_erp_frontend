"use client";

import * as React from "react";
import {
  FileCode,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Eye,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { docflowApi, FormResponseItem } from "@/lib/api/docflow";
import { useAppStore } from "@/stores/app-store";

interface DynamicForm {
  id: string;
  title: string;
  category: "HR & Internal" | "Sales & Customer Survey" | "Operations & Safety" | "Finance Request";
  submissionsCount: number;
  status: "Published" | "Draft" | "Archived";
  createdAt: string;
  link: string;
}

export default function DynamicFormsPage() {
  const { currentUser } = useAppStore();
  const [forms, setForms] = React.useState<DynamicForm[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [responsesForm, setResponsesForm] = React.useState<DynamicForm | null>(null);
  const [liveResponses, setLiveResponses] = React.useState<FormResponseItem[] | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newCategory, setNewCategory] = React.useState<DynamicForm["category"]>("HR & Internal");

  React.useEffect(() => {
    docflowApi
      .listForms()
      .then((res) => {
        const mapped: DynamicForm[] = res.data.map((f) => ({
          id: f.id,
          title: f.title,
          category: "HR & Internal",
          submissionsCount: f.responseCount,
          status: f.status === "published" ? "Published" : f.status === "draft" ? "Draft" : "Archived",
          createdAt: (f.createdAt || "").slice(0, 10) || "-",
          link: "",
        }));
        setForms(mapped);
      })
      .catch((err) => {
        console.error("Failed to load forms", err);
        setLoadError("Gagal memuat formulir dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    if (!responsesForm) {
      setLiveResponses(null);
      return;
    }
    docflowApi
      .listResponses(responsesForm.id)
      .then((res) => setLiveResponses(res.data))
      .catch(() => setLiveResponses(null));
  }, [responsesForm]);

  // There is no public form page in the app yet, so there is no real link to hand out.
  const handleCopyLink = async (_form: DynamicForm) => {
    setNotice("Halaman publik untuk mengisi formulir belum tersedia, jadi belum ada tautan yang bisa dibagikan.");
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setFormError(null);
    try {
      const res = await docflowApi.createForm({
        title: newTitle,
        description: newCategory,
        createdBy: currentUser.name,
      });
      setForms([
        {
          id: res.data.id,
          title: res.data.title,
          category: newCategory,
          submissionsCount: res.data.responseCount,
          status: "Draft",
          createdAt: new Date().toISOString().slice(0, 10),
          link: "",
        },
        ...forms,
      ]);
      setIsBuilderOpen(false);
      setNewTitle("");
      setNewCategory("HR & Internal");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal membuat formulir.");
    }
  };

  const columns: Column<DynamicForm>[] = [
    {
      key: "title",
      header: "Judul Formulir",
      render: (row) => (
        <div>
          <span className="font-bold text-foreground text-xs">{row.title}</span>
          <div className="text-[11px] text-muted-foreground">{row.category}</div>
        </div>
      ),
    },
    {
      key: "submissionsCount",
      header: "Total Respon Terkumpul",
      render: (row) => (
        <span className="text-xs font-bold text-brand-dark bg-brand-tint px-2 py-0.5 rounded">
          {row.submissionsCount} Respon
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Tanggal Dibuat",
      render: (row) => <span className="text-xs text-muted-foreground">{row.createdAt}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● {row.status}
        </span>
      ),
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setResponsesForm(responsesForm?.id === row.id ? null : row)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Eye className="h-3 w-3" />
            <span>Respon</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCopyLink(row)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Share2 className="h-3 w-3" />
            <span>Bagikan</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileCode className="h-6 w-6 text-brand-primary" />
            <span>Formulir Dinamis & Kuesioner (ONE Dynamic Forms)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Buat form digital kustom untuk inspeksi K3, pengajuan internal, survei pelanggan, dan integrasi persetujuan.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsBuilderOpen((v) => !v)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Buat Formulir Baru</span>
        </Button>
      </div>

      {isBuilderOpen && (
        <Card className="border-brand-primary/40">
          <CardContent className="p-4">
            <form onSubmit={handleCreateForm} className="space-y-3">
            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Judul Formulir</label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Kategori</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as DynamicForm["category"])}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm"
                >
                  <option>HR & Internal</option>
                  <option>Sales & Customer Survey</option>
                  <option>Operations & Safety</option>
                  <option>Finance Request</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setIsBuilderOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="gradient" size="sm" className="text-xs font-semibold">
                  Simpan Formulir
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {responsesForm && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Respon: {responsesForm.title}</p>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setResponsesForm(null)}>
                Tutup
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {responsesForm.submissionsCount} respon terkumpul sejak {responsesForm.createdAt}.
            </p>
            {liveResponses && liveResponses.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {liveResponses.map((r) => (
                  <div key={r.id} className="p-2 bg-slate-50 rounded-lg border border-border text-[11px]">
                    <div className="font-semibold text-foreground">{r.submittedBy}</div>
                    <div className="text-muted-foreground">{r.answers}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <DataTable data={forms} columns={columns} />
        )}
      </div>
    </div>
  );
}
