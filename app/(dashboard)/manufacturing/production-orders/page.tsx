"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { errText, today, useReport } from "@/components/reports/report-ui";
import { inventoryApi } from "@/lib/api/inventory";
import { manufacturingApi, ProductionOrderItem } from "@/lib/api/manufacturing";

const select = "w-full h-9 px-2 rounded-lg border border-border bg-white text-xs";

export default function ProductionOrdersPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("manufacturing");
  const [reload, setReload] = React.useState(0);
  const list = useReport(`orders|${reload}`, () => manufacturingApi.listProductionOrders({ perPage: 100 }).then((r) => r.data || []));
  const masters = useReport("masters", async () => {
    const [b, w] = await Promise.all([manufacturingApi.listBOMs({ perPage: 100 }), inventoryApi.listWarehouses({ perPage: 100 })]);
    return { boms: (b.data || []).filter((x) => x.isActive), warehouses: w.data || [] };
  });
  const [notice, setNotice] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [bomId, setBomId] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState("");
  const [qty, setQty] = React.useState(0);
  const [plannedDate, setPlannedDate] = React.useState(today());
  const [mode, setMode] = React.useState<"backflush" | "issued">("backflush");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const bom = masters.data?.boms.find((b) => b.id === bomId);

  // Only the server's response changes an order; a failed call is reported, never simulated.
  const act = async (order: ProductionOrderItem, call: (id: string) => Promise<unknown>, success: string) => {
    if (busyId) return;
    setBusyId(order.id);
    setNotice(null);
    try {
      await call(order.id);
      setNotice({ kind: "success", text: success });
      setReload((n) => n + 1);
    } catch (err) {
      setNotice({ kind: "error", text: errText(err, "Gagal memproses order produksi.") });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = (order: ProductionOrderItem) => {
    if (!confirm(`Batalkan ${order.orderNumber}? Tindakan ini tidak bisa dibatalkan.`)) return;
    return act(order, manufacturingApi.cancelProductionOrder, `${order.orderNumber} dibatalkan.`);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await manufacturingApi.createProductionOrder({ bomId, warehouseId, quantityToProduce: qty, plannedDate, materialMode: mode });
      setIsNewOpen(false);
      setBomId("");
      setQty(0);
      setNotice({ kind: "success", text: `${res.data.orderNumber} dibuat.` });
      setReload((n) => n + 1);
    } catch (err) {
      setFormError(errText(err, "Gagal membuat order produksi."));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<ProductionOrderItem>[] = [
    { key: "orderNumber", header: "MO Number", sortable: true, render: (m) => <span className="font-mono text-xs font-bold text-brand-primary">{m.orderNumber}</span> },
    {
      key: "productName",
      header: "Product to Produce",
      sortable: true,
      render: (m) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{m.productName || m.bomName}</p>
          <span className="text-[11px] text-muted-foreground">{m.steps?.length ? m.steps.map((s) => s.name).join(" → ") : "Tanpa proses"}</span>
        </div>
      ),
    },
    { key: "quantityToProduce", header: "Progress", align: "center", render: (m) => <span className="text-xs font-bold">{m.quantityCompleted} / {m.quantityToProduce}</span> },
    { key: "warehouseName", header: "Warehouse", render: (m) => <span className="text-xs text-muted-foreground">{m.warehouseName}</span> },
    { key: "materialMode", header: "Material", render: (m) => <span className="text-xs">{m.materialMode === "issued" ? "Diambil lebih dulu" : "Otomatis saat selesai"}</span> },
    { key: "plannedDate", header: "Planned", render: (m) => <span className="text-xs font-medium text-foreground">{m.plannedDate || "-"}</span> },
    { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status === "planned" ? "pending" : m.status} /> },
    {
      key: "id",
      header: "Actions",
      align: "center",
      render: (m) =>
        m.status === "completed" || m.status === "cancelled" ? (
          <span className="text-[11px] text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            {mayApprove && m.status === "planned" && (
              <Button variant="gradient" size="sm" className="h-7 px-2 text-[11px] font-semibold" disabled={busyId === m.id} onClick={() => act(m, manufacturingApi.releaseProductionOrder, `${m.orderNumber} dirilis ke lantai produksi.`)}>Release</Button>
            )}
            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] font-semibold text-rose-600 border-rose-200 hover:bg-rose-50" disabled={busyId === m.id} onClick={() => handleCancel(m)}>Cancel</Button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Manufacturing Work Orders (MO)" description="Jadwalkan order produksi, rilis ke lantai produksi, dan pantau kemajuannya. Rute proses mengikuti BOM yang dipilih.">
        <Button variant="gradient" size="sm" className="h-9 gap-1.5 text-xs font-semibold" onClick={() => { setFormError(null); setIsNewOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> New Order
        </Button>
      </PageHeader>

      {list.error && <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{list.error}</div>}
      {notice && (
        <div role={notice.kind === "error" ? "alert" : "status"} className={`px-3 py-2 rounded-lg border text-xs font-medium ${notice.kind === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>{notice.text}</div>
      )}

      {list.loading ? <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div> : <DataTable columns={columns} data={list.data ?? []} searchKey="orderNumber" searchPlaceholder="Search MO or product..." />}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Order Produksi Baru</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3 text-xs">
            {formError && <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">{formError}</div>}
            {masters.error && <div role="alert" className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">{masters.error}</div>}
            <label className="space-y-1 font-semibold block">BOM *
              <select value={bomId} onChange={(e) => setBomId(e.target.value)} className={select} required>
                <option value="">Pilih BOM...</option>
                {masters.data?.boms.map((b) => <option key={b.id} value={b.id}>{b.productName || b.name} ({b.version})</option>)}
              </select>
            </label>
            {bom && <p className="text-[11px] text-muted-foreground">Rute: {bom.processes?.length ? bom.processes.map((p) => p.name).join(" → ") : "tanpa proses (produksi dicatat langsung selesai)"}</p>}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 font-semibold">Jumlah *<Input type="number" min={1} value={qty || ""} onChange={(e) => setQty(Math.floor(Number(e.target.value)))} required /></label>
              <label className="space-y-1 font-semibold">Tanggal rencana<Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} /></label>
            </div>
            <label className="space-y-1 font-semibold block">Gudang *
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={select} required>
                <option value="">Pilih gudang...</option>
                {masters.data?.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 font-semibold block">Pengambilan material
              <select value={mode} onChange={(e) => setMode(e.target.value as "backflush" | "issued")} className={select}>
                <option value="backflush">Otomatis saat unit diselesaikan</option>
                <option value="issued">Diambil lebih dulu (Transaksi Stock → Pengambilan Bahan)</option>
              </select>
            </label>
            {mode === "issued" && <p className="text-[11px] text-muted-foreground">Material harus diambil lewat dokumen Pengambilan Bahan yang dihubungkan ke order ini. Unit hanya bisa diselesaikan sebanyak yang materialnya sudah diambil, dan nilainya dipindahkan dari Barang dalam Proses ke Persediaan.</p>}
            <DialogFooter>
              <Button type="submit" variant="gradient" className="text-xs font-semibold" disabled={saving || !bomId || !warehouseId || qty <= 0}>{saving ? "Menyimpan..." : "Buat Order"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
