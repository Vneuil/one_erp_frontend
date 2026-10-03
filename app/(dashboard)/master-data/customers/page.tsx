"use client";

import * as React from "react";
import { Plus, Download, Mail, Phone, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";

interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  creditLimit: number;
  status: string;
}

import { customersApi, CustomerItem } from "@/lib/api/customers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/utils/csv";

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    code: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    city: "",
    creditLimit: 0,
  });

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    code: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    city: "",
  });

  const fetchCustomers = () => {
    customersApi
      .list()
      .then((res) => {
                  const mapped: Customer[] = (res.data || []).map((c: CustomerItem) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            contactPerson: c.segment || "-",
            email: c.email || "-",
            phone: c.phone || "-",
            city: c.address || "-",
            creditLimit: 0,
            status: c.status?.toLowerCase() === "active" ? "active" : "inactive",
          }));
          setCustomers(mapped);
      })
      .catch((err) => {
        console.error("Failed to load pelanggan", err);
        setLoadError("Gagal memuat data pelanggan dari server.");
      })
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customersApi.create({
        code: formData.code,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.city,
        segment: formData.contactPerson || "Enterprise B2B",
      });
      setIsAddOpen(false);
      fetchCustomers();
    } catch (err) {
      alert("Gagal menambahkan pelanggan: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const openEditCustomer = (c: Customer) => {
    setEditingId(c.id);
    setEditFormData({
      code: c.code,
      name: c.name,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      city: c.city,
    });
    setIsEditOpen(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const res = await customersApi.update(editingId, {
        code: editFormData.code,
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        address: editFormData.city,
        segment: editFormData.contactPerson || "Enterprise B2B",
      });
      const updated = res.data;
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                code: updated?.code ?? editFormData.code,
                name: updated?.name ?? editFormData.name,
                contactPerson: editFormData.contactPerson || c.contactPerson,
                email: updated?.email ?? editFormData.email,
                phone: updated?.phone ?? editFormData.phone,
                city: updated?.address ?? editFormData.city,
              }
            : c
        )
      );
      setIsEditOpen(false);
      setEditingId(null);
    } catch (err) {
      alert("Gagal memperbarui pelanggan: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus pelanggan ini?")) return;
    try {
      await customersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Gagal menghapus pelanggan: " + (err instanceof Error ? err.message : "Kesalahan server"));
    }
  };

  const handleExport = () => {
    downloadCsv(
      "customers.csv",
      ["Code", "Name", "Contact Person", "Email", "Phone", "City", "Credit Limit", "Status"],
      customers.map((c) => [c.code, c.name, c.contactPerson, c.email, c.phone, c.city, c.status])
    );
  };

  const columns: Column<Customer>[] = [
    {
      key: "code",
      header: "Customer Code",
      sortable: true,
      render: (c) => <span className="font-mono text-xs font-bold text-brand-primary">{c.code}</span>,
    },
    {
      key: "name",
      header: "Customer Name",
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{c.name}</p>
          <span className="text-[11px] text-muted-foreground">{c.contactPerson}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Contact Info",
      render: (c) => (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</div>
          <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</div>
        </div>
      ),
    },
    {
      key: "city",
      header: "City / Region",
      render: (c) => (
        <span className="text-xs text-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" /> {c.city}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "id",
      header: "Aksi",
      render: (c) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openEditCustomer(c)}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteCustomer(c.id)}
            className="h-7 px-2 text-[11px] gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" />
            <span>Hapus</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory"
        description="Master record of business clients, accounts receivable terms, and billing information."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Button
          onClick={() => setIsAddOpen(true)}
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" /> Add Customer
        </Button>
      </PageHeader>

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
          <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder="Search customer by name or code..."
      />
        )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kode Pelanggan</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Kosongkan untuk dibuat otomatis"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nama Perusahaan / Klien *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. PT Maju Bersama Makmur"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="purchasing@company.com"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telepon</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62 21 8972100"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kota / Lokasi</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Jakarta Barat"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold">
                Simpan Pelanggan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pelanggan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kode Pelanggan</label>
              <Input
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Nama Perusahaan / Klien *</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email</label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telepon</label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Kota / Lokasi</label>
              <Input
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="font-semibold">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
