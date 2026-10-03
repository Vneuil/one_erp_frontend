"use client";

import * as React from "react";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { warehouseApi, PackingSessionItem, PickWaveItem } from "@/lib/api/warehouse";

interface PackingOrder {
  id: string;
  packingSlipNo: string;
  pickListNo: string;
  customerName: string;
  boxCount: number;
  weightKg: number;
  packerName: string;
  status: string;
}

function statusToUi(status: PackingSessionItem["status"]): string {
  switch (status) {
    case "completed":
      return "completed";
    case "packing":
      return "processing";
    default:
      return "pending";
  }
}

function toPackingOrder(s: PackingSessionItem): PackingOrder {
  return {
    id: s.id,
    packingSlipNo: `PCK-SLP-${s.id.slice(0, 8)}`,
    pickListNo: `PCK-${s.pickWaveId.slice(0, 8)}`,
    customerName: "Unassigned",
    boxCount: s.packageCount,
    weightKg: 0,
    packerName: "Unassigned",
    status: statusToUi(s.status),
  };
}

export default function PackingPage() {
  const [packingOrders, setPackingOrders] = React.useState<PackingOrder[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pickWaveId, setPickWaveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    warehouseApi
      .listPackingSessions({ perPage: 50 })
      .then((res) => {
                  setPackingOrders((res.data || []).map(toPackingOrder));
      })
      .catch((err) => {
        (console.error("Failed to load data", err), setLoadError("Gagal memuat data dari server."));
      });

    warehouseApi
      .listPickWaves({ perPage: 20 })
      .then((res) => {
        const ready = (res.data || []).find(
          (w: PickWaveItem) => w.status === "completed" || w.status === "in_progress"
        );
        if (ready) setPickWaveId(ready.id);
      })
      .catch((err) => {
        console.warn("Failed to fetch pick waves for packing session", err);
      });
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleStartStation = async () => {
    if (isSubmitting) return;
    setError(null);
    setNotice(null);

    if (!pickWaveId) {
      setError("Belum ada picking wave yang siap diproses untuk packing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await warehouseApi.createPackingSession({ pickWaveId });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuka sesi packing.");
      }
      setPackingOrders([toPackingOrder(res.data), ...packingOrders]);
      setNotice("Sesi packing station baru berhasil dibuka.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka packing station. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PackingOrder>[] = [
    {
      key: "packingSlipNo",
      header: "Packing Slip",
      sortable: true,
      render: (p) => <span className="font-mono text-xs font-bold text-brand-primary">{p.packingSlipNo}</span>,
    },
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      render: (p) => <span className="text-xs font-semibold text-foreground">{p.customerName}</span>,
    },
    {
      key: "pickListNo",
      header: "Pick List Ref",
      render: (p) => <span className="font-mono text-xs text-muted-foreground">{p.pickListNo}</span>,
    },
    {
      key: "packageSpecs",
      header: "Package Specs",
      render: (p) => (
        <span className="text-xs text-muted-foreground">
          {p.boxCount} Boxes • {p.weightKg} KG
        </span>
      ),
    },
    {
      key: "packerName",
      header: "Packer PIC",
      render: (p) => <span className="text-xs font-medium text-foreground">{p.packerName}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusBadge status={p.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packing Station & Parcels"
        description="Verify picked items, pack into shipping parcels, generate shipping labels, and record gross weight."
      >
        <Button
          variant="gradient"
          size="sm"
          disabled={isSubmitting}
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={handleStartStation}
        >
          <Plus className="h-3.5 w-3.5" />
          {isSubmitting ? "Membuka Station..." : "Start Packing Station"}
        </Button>
      </PageHeader>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          {notice}
        </div>
      )}

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      <DataTable
        columns={columns}
        data={packingOrders}
        searchKey="packingSlipNo"
        searchPlaceholder="Search packing slip number..."
      />
    </div>
  );
}
