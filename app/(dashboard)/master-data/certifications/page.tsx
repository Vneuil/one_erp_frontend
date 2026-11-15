"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, Award, CheckCircle2, Upload, FileText, X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { useConfirm, useAlert } from "@/components/shared/confirm-modal";
import { certificationsApi, CertificationItem } from "@/lib/api/products";

export default function CertificationsPage() {
  const confirm = useConfirm();
  const alert = useAlert();
  const [certifications, setCertifications] = React.useState<CertificationItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Quick inline add
  const [newCode, setNewCode] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newAttachment, setNewAttachment] = React.useState("");
  const [newAttachmentName, setNewAttachmentName] = React.useState("");
  const [isUploadingNew, setIsUploadingNew] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const newFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Modal Edit
  const [editingCert, setEditingCert] = React.useState<CertificationItem | null>(null);
  const [editCode, setEditCode] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editAttachment, setEditAttachment] = React.useState("");
  const [editAttachmentName, setEditAttachmentName] = React.useState("");
  const [isUploadingEdit, setIsUploadingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);
  const editFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Download state
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    certificationsApi
      .list()
      .then((res) => {
        setCertifications(res.data || []);
      })
      .catch((err) => {
        console.error("Failed to load certifications", err);
        setLoadError("Gagal memuat master data sertifikasi dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileUpload = async (
    file: File,
    onSuccess: (key: string, name: string) => void,
    setLoadingState: (loading: boolean) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      await alert({
        title: "Ukuran File Terlalu Besar",
        message: "Maksimal ukuran file bukti sertifikasi adalah 10 MB.",
        variant: "destructive",
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLoadingState(true);
    try {
      const res = await certificationsApi.uploadAttachment(file);
      if (res.data) {
        onSuccess(res.data.key, res.data.filename);
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengunggah Bukti Sertifikasi",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah dokumen.",
        variant: "destructive",
      });
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setLoadingState(false);
    }
  };

  const handleDownloadAttachment = async (cert: CertificationItem) => {
    if (!cert.attachment) return;

    if (cert.attachment.startsWith("http://") || cert.attachment.startsWith("https://")) {
      window.open(cert.attachment, "_blank", "noopener,noreferrer");
      return;
    }

    setDownloadingId(cert.id);
    try {
      const res = await certificationsApi.downloadAttachment(cert.id);
      if ("blob" in res) {
        const url = URL.createObjectURL(res.blob);
        const link = document.createElement("a");
        link.href = url;
        const fallbackName = cert.attachmentName || `${cert.code}-bukti-sertifikasi`;
        link.download = res.filename || fallbackName;
        link.target = "_blank";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        await alert({
          title: "Gagal Mengunduh Bukti",
          message: "Tidak dapat mengunduh bukti sertifikasi dari server.",
          variant: "destructive",
        });
      }
    } catch (err) {
      await alert({
        title: "Gagal Mengunduh Bukti",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh file bukti.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setIsAdding(true);
    try {
      await certificationsApi.create({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        attachment: newAttachment.trim() || undefined,
        attachmentName: newAttachmentName.trim() || undefined,
      });
      setNewCode("");
      setNewName("");
      setNewDescription("");
      setNewAttachment("");
      setNewAttachmentName("");
      if (newFileInputRef.current) newFileInputRef.current.value = "";
      loadData();
    } catch (err) {
      await alert({
        title: "Gagal Menambah Sertifikasi",
        message: err instanceof Error ? err.message : "Gagal menambah sertifikasi.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Hapus Sertifikasi",
      message: `Yakin ingin menghapus sertifikasi "${name}"?`,
      variant: "destructive",
      confirmText: "Hapus",
    });
    if (!ok) return;
    try {
      await certificationsApi.remove(id);
      loadData();
    } catch (err) {
      await alert({
        title: "Gagal Menghapus Sertifikasi",
        message: err instanceof Error ? err.message : "Gagal menghapus sertifikasi.",
        variant: "destructive",
      });
    }
  };

  const handleOpenEdit = (c: CertificationItem) => {
    setEditingCert(c);
    setEditCode(c.code);
    setEditName(c.name);
    setEditDescription(c.description || "");
    setEditAttachment(c.attachment || "");
    setEditAttachmentName(c.attachmentName || "");
    setEditError(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCert) return;
    if (!editCode.trim() || !editName.trim()) {
      setEditError("Kode dan Nama sertifikasi wajib diisi.");
      return;
    }
    setIsEditSubmitting(true);
    setEditError(null);
    try {
      await certificationsApi.update(editingCert.id, {
        code: editCode.trim().toUpperCase(),
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        attachment: editAttachment.trim() || "",
        attachmentName: editAttachmentName.trim() || "",
      });
      setEditingCert(null);
      loadData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Master Sertifikasi"
        description="Kelola standar sertifikasi produk (EU, USDA, COR, SNI, Fairtrade, Halal, Kosher, dll.) beserta dokumen bukti sertifikasinya yang digunakan pada Master Produk."
      />

      {loadError && (
        <p role="alert" className="text-sm text-rose-700">
          {loadError}
        </p>
      )}

      {/* Quick Add Form */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-brand-primary" />
              Tambah Sertifikasi Baru
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-medium text-foreground">Kode Sertifikasi *</label>
                <Input
                  placeholder="mis. EU, USDA, HALAL"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs font-medium text-foreground">Nama Sertifikasi *</label>
                <Input
                  placeholder="mis. EU Organic Standard"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={150}
                  required
                />
              </div>
              <div className="sm:col-span-5 space-y-1">
                <label className="text-xs font-medium text-foreground">Deskripsi / Ruang Lingkup</label>
                <Input
                  placeholder="mis. Standar Uni Eropa untuk Produk Organik"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Bukti Sertifikasi Upload & Submit Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1 border-t border-border/50">
              <div className="sm:col-span-8 space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  Bukti Sertifikasi (Dokumen / Sertifikat Resmi)
                </label>
                <input
                  type="file"
                  ref={newFileInputRef}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleFileUpload(
                        f,
                        (key, name) => {
                          setNewAttachment(key);
                          setNewAttachmentName(name);
                        },
                        setIsUploadingNew,
                        newFileInputRef
                      );
                    }
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  {!newAttachment ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => newFileInputRef.current?.click()}
                      disabled={isUploadingNew || isAdding}
                      className="h-9 text-xs font-medium gap-1.5 border-dashed border-border hover:border-brand-primary"
                    >
                      {isUploadingNew ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Mengunggah bukti...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          Upload Bukti Sertifikasi (PDF / Foto)
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-md text-xs">
                      <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium max-w-[240px] truncate">
                        {newAttachmentName || "File Bukti Terunggah"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewAttachment("");
                          setNewAttachmentName("");
                          if (newFileInputRef.current) newFileInputRef.current.value = "";
                        }}
                        className="text-emerald-700 hover:text-rose-600 p-0.5 rounded-full transition-colors"
                        title="Hapus file bukti"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Format didukung: PDF, PNG, JPG, DOCX (Maks 10MB)
                  </span>
                </div>
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={isAdding || isUploadingNew || !newCode.trim() || !newName.trim()}
                  className="w-full sm:w-auto min-w-[140px] gap-1.5 h-10 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isAdding ? "Menyimpan..." : "Tambah Sertifikasi"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Certifications Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Daftar Sertifikasi Terdaftar</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total {certifications.length} standar sertifikasi beserta bukti pendukung
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {isLoading && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Memuat data sertifikasi...
              </div>
            )}

            {!isLoading && certifications.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Belum ada data sertifikasi.
              </div>
            )}

            {!isLoading &&
              certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                      {cert.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{cert.name}</p>
                      {cert.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{cert.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Bukti Sertifikasi & Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {cert.attachment ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadAttachment(cert)}
                        disabled={downloadingId === cert.id}
                        className="h-8 text-xs gap-1.5 text-blue-700 bg-blue-50/60 border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                        title="Unduh / Buka Dokumen Bukti Sertifikasi"
                      >
                        {downloadingId === cert.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                        )}
                        <span className="max-w-[150px] truncate">
                          {cert.attachmentName || "Bukti Sertifikat"}
                        </span>
                        <Download className="h-3 w-3 opacity-60 ml-0.5" />
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/70 italic px-2 py-1">
                        Belum ada bukti
                      </span>
                    )}

                    <div className="flex items-center gap-1 border-l border-border pl-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(cert)}
                        title="Edit Sertifikasi"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleDelete(cert.id, cert.name)}
                        title="Hapus Sertifikasi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={!!editingCert} onOpenChange={(open) => !open && setEditingCert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sertifikasi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <p role="alert" className="text-sm text-rose-700">
                {editError}
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Kode Sertifikasi *</label>
              <Input
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nama Sertifikasi *</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={150}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Deskripsi</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            {/* Bukti Sertifikasi in Edit Modal */}
            <div className="space-y-1.5 pt-1 border-t border-border">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                Bukti Sertifikasi
              </label>

              <input
                type="file"
                ref={editFileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleFileUpload(
                      f,
                      (key, name) => {
                        setEditAttachment(key);
                        setEditAttachmentName(name);
                      },
                      setIsUploadingEdit,
                      editFileInputRef
                    );
                  }
                }}
              />

              {editAttachment ? (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-brand-primary shrink-0" />
                    <span className="text-xs font-medium truncate text-foreground">
                      {editAttachmentName || "File Bukti Terlampir"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={() => {
                        if (editingCert) {
                          handleDownloadAttachment({
                            ...editingCert,
                            attachment: editAttachment,
                            attachmentName: editAttachmentName,
                          });
                        }
                      }}
                      title="Lihat Dokumen"
                    >
                      <Download className="h-3 w-3" />
                      Lihat
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-brand-primary"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploadingEdit}
                      title="Ganti File"
                    >
                      Ganti
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                      onClick={() => {
                        setEditAttachment("");
                        setEditAttachmentName("");
                        if (editFileInputRef.current) editFileInputRef.current.value = "";
                      }}
                      title="Hapus Bukti"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploadingEdit}
                    className="w-full h-10 text-xs font-medium gap-2 border-dashed border-border hover:border-brand-primary"
                  >
                    {isUploadingEdit ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mengunggah file bukti...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Dokumen Bukti Sertifikasi
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Mendukung file PDF, PNG, JPG, DOCX (Maks. 10 MB)
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCert(null)}
                disabled={isEditSubmitting || isUploadingEdit}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="gradient"
                size="sm"
                disabled={isEditSubmitting || isUploadingEdit}
              >
                {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
