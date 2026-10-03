"use client";

import * as React from "react";
import { Plus, Trash2, Pencil, Wallet, Users, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  pricingApi,
  PaymentTermItem,
  CustomerTypeItem,
  TaxRateItem,
} from "@/lib/api/pricing";

export default function PricingTermsPage() {
  const [paymentTerms, setPaymentTerms] = React.useState<PaymentTermItem[]>([]);
  const [customerTypes, setCustomerTypes] = React.useState<CustomerTypeItem[]>([]);
  const [taxRates, setTaxRates] = React.useState<TaxRateItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [ptName, setPtName] = React.useState("");
  const [ptDays, setPtDays] = React.useState(30);
  const [ctName, setCtName] = React.useState("");
  const [trName, setTrName] = React.useState("");
  const [trRate, setTrRate] = React.useState(11);

  const [editingPaymentTerm, setEditingPaymentTerm] = React.useState<PaymentTermItem | null>(null);
  const [editPtName, setEditPtName] = React.useState("");
  const [editPtDays, setEditPtDays] = React.useState(30);
  const [editPtError, setEditPtError] = React.useState<string | null>(null);
  const [isEditPtSubmitting, setIsEditPtSubmitting] = React.useState(false);

  const [editingCustomerType, setEditingCustomerType] = React.useState<CustomerTypeItem | null>(null);
  const [editCtName, setEditCtName] = React.useState("");
  const [editCtError, setEditCtError] = React.useState<string | null>(null);
  const [isEditCtSubmitting, setIsEditCtSubmitting] = React.useState(false);

  const [editingTaxRate, setEditingTaxRate] = React.useState<TaxRateItem | null>(null);
  const [editTrName, setEditTrName] = React.useState("");
  const [editTrRate, setEditTrRate] = React.useState(11);
  const [editTrIsDefault, setEditTrIsDefault] = React.useState(false);
  const [editTrError, setEditTrError] = React.useState<string | null>(null);
  const [isEditTrSubmitting, setIsEditTrSubmitting] = React.useState(false);

  const loadData = React.useCallback(() => {
    setIsLoading(true);
    Promise.all([pricingApi.listPaymentTerms(), pricingApi.listCustomerTypes(), pricingApi.listTaxRates()])
      .then(([ptRes, ctRes, trRes]) => {
        setPaymentTerms(ptRes.data || []);
        setCustomerTypes(ctRes.data || []);
        setTaxRates(trRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load pricing & terms", err);
        setLoadError("Gagal memuat data harga & ketentuan dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPaymentTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptName.trim()) return;
    try {
      await pricingApi.createPaymentTerm(ptName.trim(), ptDays);
      setPtName("");
      setPtDays(30);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambah termin pembayaran.");
    }
  };

  const handleDeletePaymentTerm = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus termin pembayaran ini?")) return;
    try {
      await pricingApi.deletePaymentTerm(id);
      setPaymentTerms((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus termin pembayaran.");
    }
  };

  const openEditPaymentTerm = (p: PaymentTermItem) => {
    setEditingPaymentTerm(p);
    setEditPtName(p.name);
    setEditPtDays(p.days);
    setEditPtError(null);
  };

  const handleUpdatePaymentTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentTerm || !editPtName.trim()) return;
    setIsEditPtSubmitting(true);
    setEditPtError(null);
    try {
      await pricingApi.updatePaymentTerm(editingPaymentTerm.id, editPtName.trim(), editPtDays);
      setPaymentTerms((prev) =>
        prev.map((p) => (p.id === editingPaymentTerm.id ? { ...p, name: editPtName.trim(), days: editPtDays } : p))
      );
      setEditingPaymentTerm(null);
    } catch (err) {
      setEditPtError(err instanceof Error ? err.message : "Gagal memperbarui termin pembayaran.");
    } finally {
      setIsEditPtSubmitting(false);
    }
  };

  const handleAddCustomerType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ctName.trim()) return;
    try {
      await pricingApi.createCustomerType(ctName.trim());
      setCtName("");
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambah jenis pelanggan.");
    }
  };

  const handleDeleteCustomerType = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus jenis pelanggan ini?")) return;
    try {
      await pricingApi.deleteCustomerType(id);
      setCustomerTypes((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus jenis pelanggan.");
    }
  };

  const openEditCustomerType = (c: CustomerTypeItem) => {
    setEditingCustomerType(c);
    setEditCtName(c.name);
    setEditCtError(null);
  };

  const handleUpdateCustomerType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomerType || !editCtName.trim()) return;
    setIsEditCtSubmitting(true);
    setEditCtError(null);
    try {
      await pricingApi.updateCustomerType(editingCustomerType.id, editCtName.trim());
      setCustomerTypes((prev) =>
        prev.map((c) => (c.id === editingCustomerType.id ? { ...c, name: editCtName.trim() } : c))
      );
      setEditingCustomerType(null);
    } catch (err) {
      setEditCtError(err instanceof Error ? err.message : "Gagal memperbarui jenis pelanggan.");
    } finally {
      setIsEditCtSubmitting(false);
    }
  };

  const handleAddTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trName.trim()) return;
    try {
      await pricingApi.createTaxRate(trName.trim(), trRate, taxRates.length === 0);
      setTrName("");
      setTrRate(11);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menambah pajak.");
    }
  };

  const handleDeleteTaxRate = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus tarif pajak ini?")) return;
    try {
      await pricingApi.deleteTaxRate(id);
      setTaxRates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus pajak.");
    }
  };

  const openEditTaxRate = (t: TaxRateItem) => {
    setEditingTaxRate(t);
    setEditTrName(t.name);
    setEditTrRate(t.rate);
    setEditTrIsDefault(t.isDefault);
    setEditTrError(null);
  };

  const handleUpdateTaxRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaxRate || !editTrName.trim()) return;
    setIsEditTrSubmitting(true);
    setEditTrError(null);
    try {
      await pricingApi.updateTaxRate(editingTaxRate.id, editTrName.trim(), editTrRate, editTrIsDefault);
      setTaxRates((prev) =>
        prev.map((t) =>
          t.id === editingTaxRate.id
            ? { ...t, name: editTrName.trim(), rate: editTrRate, isDefault: editTrIsDefault }
            : t
        )
      );
      setEditingTaxRate(null);
    } catch (err) {
      setEditTrError(err instanceof Error ? err.message : "Gagal memperbarui pajak.");
    } finally {
      setIsEditTrSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Harga & Ketentuan"
        description="Termin pembayaran, jenis pelanggan, dan tarif pajak yang dipakai di seluruh transaksi Penjualan & Pembelian."
      />

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Wallet className="h-3.5 w-3.5 text-brand-primary" />
                <span>Termin Pembayaran</span>
              </div>
              <form onSubmit={handleAddPaymentTerm} className="space-y-2">
                <Input value={ptName} onChange={(e) => setPtName(e.target.value)} placeholder="Nama (mis. Net 30)" className="h-8 text-xs" />
                <div className="flex items-center gap-2">
                  <Input type="number" value={ptDays} onChange={(e) => setPtDays(Number(e.target.value))} placeholder="Hari" className="h-8 text-xs" />
                  <Button type="submit" size="sm" variant="gradient" className="h-8 gap-1 text-xs font-bold shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {paymentTerms.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Belum ada termin.</p>}
                {paymentTerms.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs">
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{p.days} hari</span>
                      <button onClick={() => openEditPaymentTerm(p)} className="text-muted-foreground hover:text-brand-primary cursor-pointer" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeletePaymentTerm(p.id)} className="text-muted-foreground hover:text-rose-600 cursor-pointer" title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Users className="h-3.5 w-3.5 text-brand-primary" />
                <span>Jenis Pelanggan</span>
              </div>
              <form onSubmit={handleAddCustomerType} className="flex items-center gap-2">
                <Input value={ctName} onChange={(e) => setCtName(e.target.value)} placeholder="Mis. Enterprise B2B" className="h-8 text-xs" />
                <Button type="submit" size="sm" variant="gradient" className="h-8 gap-1 text-xs font-bold shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </Button>
              </form>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {customerTypes.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Belum ada jenis pelanggan.</p>}
                {customerTypes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs">
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditCustomerType(c)} className="text-muted-foreground hover:text-brand-primary cursor-pointer" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCustomerType(c.id)} className="text-muted-foreground hover:text-rose-600 cursor-pointer" title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Percent className="h-3.5 w-3.5 text-brand-primary" />
                <span>Tarif Pajak</span>
              </div>
              <form onSubmit={handleAddTaxRate} className="space-y-2">
                <Input value={trName} onChange={(e) => setTrName(e.target.value)} placeholder="Nama (mis. PPN 11%)" className="h-8 text-xs" />
                <div className="flex items-center gap-2">
                  <Input type="number" step="0.1" value={trRate} onChange={(e) => setTrRate(Number(e.target.value))} placeholder="Persen" className="h-8 text-xs" />
                  <Button type="submit" size="sm" variant="gradient" className="h-8 gap-1 text-xs font-bold shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Tambah
                  </Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {taxRates.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Belum ada tarif pajak.</p>}
                {taxRates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/70 bg-slate-50/40 text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {t.name}
                      {t.isDefault && <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-tint text-brand-primary font-bold">Default</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{t.rate}%</span>
                      <button onClick={() => openEditTaxRate(t)} className="text-muted-foreground hover:text-brand-primary cursor-pointer" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDeleteTaxRate(t.id)} className="text-muted-foreground hover:text-rose-600 cursor-pointer" title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={Boolean(editingPaymentTerm)} onOpenChange={(open) => !open && setEditingPaymentTerm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Termin Pembayaran</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePaymentTerm} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama *</label>
              <Input value={editPtName} onChange={(e) => setEditPtName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Hari</label>
              <Input type="number" value={editPtDays} onChange={(e) => setEditPtDays(Number(e.target.value))} />
            </div>
            {editPtError && <p className="text-rose-600 font-semibold">{editPtError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingPaymentTerm(null)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditPtSubmitting}>
                {isEditPtSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingCustomerType)} onOpenChange={(open) => !open && setEditingCustomerType(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Jenis Pelanggan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCustomerType} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama *</label>
              <Input value={editCtName} onChange={(e) => setEditCtName(e.target.value)} required />
            </div>
            {editCtError && <p className="text-rose-600 font-semibold">{editCtError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingCustomerType(null)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditCtSubmitting}>
                {isEditCtSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingTaxRate)} onOpenChange={(open) => !open && setEditingTaxRate(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Tarif Pajak</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTaxRate} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nama *</label>
              <Input value={editTrName} onChange={(e) => setEditTrName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Persen</label>
              <Input type="number" step="0.1" value={editTrRate} onChange={(e) => setEditTrRate(Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="edit-taxrate-default"
                type="checkbox"
                checked={editTrIsDefault}
                onChange={(e) => setEditTrIsDefault(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <label htmlFor="edit-taxrate-default" className="text-xs font-medium text-foreground">
                Default
              </label>
            </div>
            {editTrError && <p className="text-rose-600 font-semibold">{editTrError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTaxRate(null)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" disabled={isEditTrSubmitting}>
                {isEditTrSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
