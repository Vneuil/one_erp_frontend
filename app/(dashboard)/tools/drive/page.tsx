"use client";

import * as React from "react";
import {
  FileText,
  Upload,
  Download,
  Plus,
  Search,
  HardDrive,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { collaborationApi } from "@/lib/api/collaboration";
import { useAppStore } from "@/stores/app-store";

interface DriveFile {
  id: string;
  name: string;
  folder?: string;
  size: string;
  sizeBytes: number;
  type: "pdf" | "xlsx" | "docx" | "png";
  uploader: string;
  updatedAt: string;
}

function inferType(name: string): DriveFile["type"] {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "xlsx" ? "xlsx" : ext === "docx" ? "docx" : ext === "png" ? "png" : "pdf";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Visual reference only for the usage bar; the server enforces no quota.
const QUOTA_BYTES = 1024 * 1024 * 1024 * 1024;

export default function CloudDrivePage() {
  const { currentUser } = useAppStore();
  const [files, setFiles] = React.useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [folderIdByName, setFolderIdByName] = React.useState<Record<string, string>>({});
  const [showFolderForm, setShowFolderForm] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [creatingFolder, setCreatingFolder] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    Promise.all([collaborationApi.listFolders(), collaborationApi.listFiles()])
      .then(([folderRes, filesRes]) => {
        const idToName: Record<string, string> = {};
        const nameToId: Record<string, string> = {};
        // Folders can nest: label each one by its full path ("Legal / Kontrak") so names stay unique.
        const byId = new Map((folderRes.data || []).map((f) => [f.id, f]));
        const pathOf = (id: string, depth = 0): string => {
          const f = byId.get(id);
          if (!f) return "";
          const parent = f.parentFolderId && depth < 20 ? pathOf(f.parentFolderId, depth + 1) : "";
          return parent ? `${parent} / ${f.name}` : f.name;
        };
        (folderRes.data || []).forEach((f) => {
          const label = pathOf(f.id);
          idToName[f.id] = label;
          nameToId[label] = f.id;
        });
        setFolderIdByName(nameToId);
        setFiles(
          (filesRes.data || []).map((f) => ({
            id: f.id,
            name: f.name,
            folder: f.folderId ? idToName[f.folderId] : undefined,
            size: formatSize(f.sizeBytes),
            sizeBytes: f.sizeBytes,
            type: inferType(f.name),
            uploader: f.uploadedBy,
            updatedAt: (f.createdAt || new Date().toISOString()).slice(0, 10),
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to load drive files", err);
        setLoadError("Gagal memuat file dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleDeleteFolder = async () => {
    const id = folderIdByName[selectedFolder];
    if (!id || !window.confirm(`Hapus folder "${selectedFolder}"? Folder harus kosong.`)) return;
    setNotice(null);
    try {
      await collaborationApi.deleteFolder(id);
      setFolderIdByName((prev) => {
        const next = { ...prev };
        delete next[selectedFolder];
        return next;
      });
      setSelectedFolder("all");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menghapus folder.");
    }
  };

  const handleDeleteFile = async (row: DriveFile) => {
    if (!window.confirm(`Hapus berkas "${row.name}"?`)) return;
    setNotice(null);
    try {
      await collaborationApi.deleteFile(row.id);
      setFiles((prev) => prev.filter((f) => f.id !== row.id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menghapus berkas.");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const leaf = newFolderName.trim();
    if (!leaf) return;
    // A folder made while another one is open becomes its subfolder.
    const parentLabel = selectedFolder !== "all" && folderIdByName[selectedFolder] ? selectedFolder : null;
    const name = parentLabel ? `${parentLabel} / ${leaf}` : leaf;
    if (folderIdByName[name]) {
      setNotice(`Folder "${name}" sudah ada.`);
      return;
    }
    setNotice(null);
    setCreatingFolder(true);
    try {
      const res = await collaborationApi.createFolder({ name: leaf, parentFolderId: parentLabel ? folderIdByName[parentLabel] : undefined });
      setFolderIdByName((prev) => ({ ...prev, [name]: res.data.id }));
      setSelectedFolder(name);
      setNewFolderName("");
      setShowFolderForm(false);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal membuat folder.");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDownload = async (file: DriveFile) => {
    try {
      const res = await collaborationApi.downloadFile(file.id);
      if ("blob" in res) {
        const url = URL.createObjectURL(res.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.filename || file.name;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
      const blob = new Blob([res.data.content], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to download file.";
      setNotice(message);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Upload into the folder currently being viewed; with no folder selected (or none
    // existing yet, as in a fresh company) the file goes to the drive root.
    const targetFolder = selectedFolder !== "all" && folderIdByName[selectedFolder] ? selectedFolder : undefined;
    setNotice(null);
    try {
      const res = await collaborationApi.uploadFile({
        folderId: targetFolder ? folderIdByName[targetFolder] : undefined,
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
        uploadedBy: currentUser.name,
        file,
      });
      const f = res.data;
      setFiles((prev) => [
        {
          id: f.id,
          name: f.name,
          folder: targetFolder,
          size: formatSize(f.sizeBytes),
          sizeBytes: f.sizeBytes,
          type: inferType(f.name),
          uploader: f.uploadedBy,
          updatedAt: (f.createdAt || new Date().toISOString()).slice(0, 10),
        },
        ...prev,
      ]);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mengunggah file.");
    }
  };

  const usedBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

  const filtered = files.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchFolder = selectedFolder === "all" || f.folder === selectedFolder;
    return matchSearch && matchFolder;
  });

  const columns: Column<DriveFile>[] = [
    {
      key: "name",
      header: "Nama File Dokumen",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-tint text-brand-primary flex items-center justify-center shrink-0">
            {row.type === "pdf" ? (
              <FileText className="h-4 w-4" />
            ) : row.type === "xlsx" ? (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            ) : (
              <FileCode className="h-4 w-4 text-blue-600" />
            )}
          </div>
          <div>
            <div className="font-bold text-foreground text-xs">{row.name}</div>
            <div className="text-[10px] text-muted-foreground">{row.folder ?? "Root"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "size",
      header: "Ukuran File",
      render: (row) => <span className="font-mono text-xs">{row.size}</span>,
    },
    {
      key: "uploader",
      header: "Diupload Oleh",
      render: (row) => <span className="text-xs font-medium">{row.uploader}</span>,
    },
    {
      key: "updatedAt",
      header: "Terakhir Diperbarui",
      render: (row) => <span className="text-xs text-muted-foreground">{row.updatedAt}</span>,
    },
    {
      key: "id",
      header: "Aksi",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload(row)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Download className="h-3 w-3" />
            <span>Unduh</span>
          </Button>
          <Button size="sm" variant="ghost" aria-label={`Hapus ${row.name}`} onClick={() => handleDeleteFile(row)} className="h-7 px-2 text-[11px] text-rose-600">
            Hapus
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
            <HardDrive className="h-6 w-6 text-brand-primary" />
            <span>ONE Cloud Drive & Manajemen Berkas</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Penyimpanan awan terpusat terintegrasi untuk arsip akta legalitas, SOP, katalog produk, dan laporan audit.
          </p>
        </div>

        <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        <Button
          variant="gradient"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Unggah Berkas Baru</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFolderForm((v) => !v)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Folder Baru</span>
        </Button>
        </div>
      </div>

      {showFolderForm && (
        <form onSubmit={handleCreateFolder} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-border">
          <Input
            autoFocus
            placeholder="Nama folder, mis. Legal & Kontrak"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="h-8 text-xs max-w-xs"
          />
          <Button type="submit" size="sm" disabled={creatingFolder || !newFolderName.trim()} className="h-8 text-xs">
            {creatingFolder ? "Membuat..." : "Buat"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowFolderForm(false)} className="h-8 text-xs">
            Batal
          </Button>
        </form>
      )}

      {/* Storage Meter */}
      <Card className="border-border shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-foreground">Kapasitas Cloud Storage Perusahaan</span>
            <div className="text-xs text-muted-foreground">
              Terpakai <strong className="text-brand-dark">{formatSize(usedBytes)}</strong> dari {files.length} berkas
            </div>
          </div>
          <div className="w-full sm:w-64 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary rounded-full" style={{ width: `${Math.min(100, (usedBytes / QUOTA_BYTES) * 100)}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Folder Chips & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari berkas dokumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["all", ...Object.keys(folderIdByName)].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFolder(f)}
              className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedFolder === f
                  ? "bg-brand-primary text-white"
                  : "bg-slate-100 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "Semua Folder" : f}
            </button>
          ))}
          {selectedFolder !== "all" && (
            <button onClick={handleDeleteFolder} className="px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap text-rose-600 hover:bg-rose-50 cursor-pointer">
              Hapus folder ini
            </button>
          )}
        </div>
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
          <DataTable data={filtered} columns={columns} />
        )}
      </div>
    </div>
  );
}
