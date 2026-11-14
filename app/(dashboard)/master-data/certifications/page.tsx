"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, Award, CheckCircle2 } from "lucide-react";
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
  const [isAdding, setIsAdding] = React.useState(false);

  // Modal Edit
  const [editingCert, setEditingCert] = React.useState<CertificationItem | null>(null);
  const [editCode, setEditCode] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = React.useState(false);

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    setIsAdding(true);
    try {
      await certificationsApi.create({
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewCode("");
      setNewName("");
      setNewDescription("");
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
    setEditError(null);
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
        description="Kelola standar sertifikasi produk (EU, USDA, COR, SNI, Fairtrade, Halal, Kosher, dll.) yang digunakan pada Master Produk."
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
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-medium text-foreground">Kode Sertifikasi *</label>
                <Input
                  placeholder="mis. EU, USDA, COR, HALAL"
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
              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs font-medium text-foreground">Deskripsi / Ruang Lingkup</label>
                <Input
                  placeholder="mis. Standar Uni Eropa"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={isAdding || !newCode.trim() || !newName.trim()}
                  className="w-full gap-1.5 h-10 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isAdding ? "Menyimpan..." : "Tambah"}
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
                Total {certifications.length} sertifikasi acuan untuk katalog produk
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
                  className="p-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                      {cert.code}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{cert.name}</p>
                      {cert.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{cert.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(cert)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                      onClick={() => handleDelete(cert.id, cert.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCert(null)}
                disabled={isEditSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditSubmitting}>
                {isEditSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

