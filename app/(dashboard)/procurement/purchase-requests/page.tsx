"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { procurementApi, PurchaseRequestLineInput } from "@/lib/api/procurement";
import { productsApi, ProductItem } from "@/lib/api/products";
import { hrmApi } from "@/lib/api/hrm";
import { useAppStore } from "@/stores/app-store";

interface PurchaseRequest {
  id: string;
  prNumber: string;
  department: string;
  requestedBy: string;
  requestDate: string;
  requiredDate: string;
  itemCount: number;
  status: string;
}

export default function PurchaseRequestsPage() {
  const { currentUser } = useAppStore();
  const [prs, setPrs] = React.useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [department, setDepartment] = React.useState("");
  const [requiredDate, setRequiredDate] = React.useState("");
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [prLines, setPrLines] = React.useState<PurchaseRequestLineInput[]>([]);
  const [lineProductId, setLineProductId] = React.useState("");
  const [lineQty, setLineQty] = React.useState("1");
  const [lineNotes, setLineNotes] = React.useState("");

  React.useEffect(() => {
    productsApi
      .list({ perPage: 200 })
      .then((res) => setProducts(res.data || []))
      .catch((err) => console.warn("Failed to load products for PR line items", err));
    // Department is auto-filled (and locked) from the logged-in user's own
    // HRM employee record - matched by email, since there is no direct
    // user->employee link in the auth session itself.
    hrmApi
      .listEmployees({ perPage: 500 })
      .then((res) => {
        const match = (res.data || []).find(
          (e) => e.email.toLowerCase() === currentUser.email.toLowerCase()
        );
        setDepartment(match?.department || "");
      })
      .catch((err) => console.warn("Failed to load employee record for department autofill", err));
  }, [currentUser.email]);

  const handleAddLine = () => {
    if (!lineProductId) return;
    const qty = Number(lineQty) || 1;
    setPrLines((prev) => {
      const existing = prev.find((l) => l.productId === lineProductId);
      if (existing) {
        return prev.map((l) =>
          l.productId === lineProductId ? { ...l, quantity: l.quantity + qty, notes: lineNotes || l.notes } : l
        );
      }
      return [...prev, { productId: lineProductId, quantity: qty, notes: lineNotes }];
    });
    setLineProductId("");
    setLineQty("1");
    setLineNotes("");
  };

  const handleRemoveLine = (productId: string) => {
    setPrLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const handleSubmitPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) {
      alert("Department tidak ditemukan di data karyawan HRM untuk akun Anda. Hubungi admin untuk menautkan akun ini ke data karyawan sebelum mengajukan Purchase Request.");
      return;
    }
    if (!requiredDate) {
      alert("Isi Required Date terlebih dahulu.");
      return;
    }
    if (prLines.length === 0) {
      alert("Tambahkan minimal 1 item barang ke Purchase Request.");
      return;
    }

    try {
      const created = await procurementApi.createPurchaseRequest({
        department,
        neededByDate: requiredDate,
        lines: prLines,
      });
      // createPurchaseRequest only saves it as a "draft" - it still has to be
      // explicitly submitted so it leaves draft status and becomes visible
      // to approvers, matching what the "Submit Request" button promises.
      const res = await procurementApi.submitPurchaseRequest(created.data.id);
      const pr = res.data;
      setPrs([
        {
          id: pr.id,
          prNumber: pr.requestNo,
          department: pr.department,
          requestedBy: pr.requestedBy || currentUser.name,
          requestDate: pr.createdAt ? pr.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          requiredDate: pr.neededByDate,
          itemCount: pr.lines?.length || prLines.length,
          status: pr.status,
        },
        ...prs,
      ]);
    } catch (err) {
      console.warn("Failed to create purchase request via API", err);
      alert((err as Error).message || "Gagal mengirim Purchase Request. Coba lagi.");
      return;
    }

    setIsNewOpen(false);
    setRequiredDate("");
    setPrLines([]);
    alert("Purchase request submitted.");
  };

  React.useEffect(() => {
    procurementApi
      .listPurchaseRequests()
      .then((res) => {
                  setPrs(
            (res.data || []).map((pr) => ({
              id: pr.id,
              prNumber: pr.requestNo,
              department: pr.department,
              requestedBy: pr.requestedBy,
              requestDate: pr.createdAt ? pr.createdAt.slice(0, 10) : "-",
              requiredDate: pr.neededByDate,
              itemCount: pr.lines?.length || 0,
              status: pr.status,
            }))
          );
      })
      .catch((err) => {
        console.error("Failed to load purchase request", err);
        setLoadError("Gagal memuat data purchase request dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const columns: Column<PurchaseRequest>[] = [
    {
      key: "prNumber",
      header: "PR Number",
      sortable: true,
      render: (pr) => <span className="font-mono text-xs font-bold text-brand-primary">{pr.prNumber}</span>,
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      render: (pr) => <span className="text-xs font-semibold text-foreground">{pr.department}</span>,
    },
    {
      key: "requestedBy",
      header: "Requested By",
      render: (pr) => <span className="text-xs text-muted-foreground">{pr.requestedBy}</span>,
    },
    {
      key: "requestDate",
      header: "Date Requested",
      render: (pr) => <span className="text-xs text-muted-foreground">{pr.requestDate}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      align: "center",
      render: (pr) => <span className="text-xs font-semibold">{pr.itemCount} SKUs</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (pr) => <StatusBadge status={pr.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Purchase Requests (PR)"
        description="Internal requisition tickets submitted by production, maintenance, or warehouse teams."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Submit Purchase Request
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
        data={prs}
        searchKey="prNumber"
        searchPlaceholder="Search PR number..."
      />
        )}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Submit Purchase Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPR} className="min-w-0 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Department</label>
              <Input
                value={department || "Tidak ditemukan di data karyawan HRM"}
                disabled
                readOnly
                aria-invalid={!department}
                className={!department ? "border-rose-300 text-rose-700" : undefined}
              />
              {!department && (
                <p className="text-[11px] text-rose-600">
                  Akun Anda belum tertaut ke data karyawan HRM, sehingga Purchase Request tidak dapat diajukan. Hubungi admin.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Requested By</label>
              <Input value={currentUser.name} disabled readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Required Date</label>
              <Input type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Barang</label>

              <div className="rounded-lg border border-border bg-slate-50/60 p-3 space-y-3">
                {prLines.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Belum ada item. Pilih produk di bawah lalu klik &quot;Tambah&quot;.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border bg-white overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-border">
                        {prLines.map((l) => {
                          const product = products.find((p) => p.id === l.productId);
                          return (
                            <tr key={l.productId}>
                              <td className="py-2 px-3">
                                <div>{product?.name || l.productId}</div>
                                {l.notes && <div className="text-[10px] text-muted-foreground">{l.notes}</div>}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">{l.quantity}x</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(l.productId)}
                                  className="text-rose-600 hover:underline text-[11px] font-medium"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 sm:flex">
                    <select
                      value={lineProductId}
                      onChange={(e) => setLineProductId(e.target.value)}
                      className="col-span-2 flex h-10 w-full flex-1 min-w-0 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:border-brand-primary"
                    >
                      <option value="">Pilih produk...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      value={lineQty}
                      onChange={(e) => setLineQty(e.target.value)}
                      className="w-16 shrink-0 bg-white"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="h-10 text-xs shrink-0 bg-white">
                      Tambah
                    </Button>
                  </div>
                  <Input
                    placeholder="Catatan item (opsional)"
                    value={lineNotes}
                    onChange={(e) => setLineNotes(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
