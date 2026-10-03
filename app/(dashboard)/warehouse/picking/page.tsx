"use client";

import * as React from "react";
import { Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { warehouseApi, PickWaveItem } from "@/lib/api/warehouse";
import { inventoryApi } from "@/lib/api/inventory";

interface PickList {
  id: string;
  pickListNo: string;
  soNumber: string;
  pickerName: string;
  zone: string;
  itemsToPick: number;
  pickedItems: number;
  status: string;
}

function statusToUi(status: PickWaveItem["status"]): string {
  switch (status) {
    case "completed":
      return "completed";
    case "in_progress":
      return "processing";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function toPickList(w: PickWaveItem): PickList {
  return {
    id: w.id,
    pickListNo: `PCK-${w.id.slice(0, 8)}`,
    soNumber: w.salesOrderId ? `SO-${w.salesOrderId.slice(0, 8)}` : "Manual",
    pickerName: w.assignedTo || "Unassigned",
    zone: w.warehouseName || "-",
    itemsToPick: w.lines.reduce((acc, l) => acc + l.quantityToPick, 0),
    pickedItems: w.lines.reduce((acc, l) => acc + l.quantityPicked, 0),
    status: statusToUi(w.status),
  };
}

export default function PickingPage() {
  const [pickLists, setPickLists] = React.useState<PickList[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [warehouseId, setWarehouseId] = React.useState<string | null>(null);

  React.useEffect(() => {
    warehouseApi
      .listPickWaves({ perPage: 50 })
      .then((res) => {
                  setPickLists((res.data || []).map(toPickList));
      })
      .catch((err) => {
        (console.error("Failed to load data", err), setLoadError("Gagal memuat data dari server."));
      });

    inventoryApi
      .listWarehouses({ perPage: 1 })
      .then((res) => {
                  setWarehouseId((res.data || [])[0].id);
      })
      .catch((err) => {
        console.warn("Failed to fetch warehouses for pick wave generation", err);
      });
  }, []);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const handleGenerateWave = async () => {
    if (isSubmitting) return;
    setError(null);
    setNotice(null);

    if (!warehouseId) {
      setError("Belum ada gudang aktif yang dipilih untuk pick wave.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await warehouseApi.createPickWave({ warehouseId, assignedTo: "Unassigned" });
      if (!res.success || !res.data) {
        throw new Error(res.message || "Gagal membuat pick wave.");
      }
      setPickLists([toPickList(res.data), ...pickLists]);
      setNotice("Pick wave baru berhasil dibuat.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat pick wave. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PickList>[] = [
    {
      key: "pickListNo",
      header: "Pick List No.",
      sortable: true,
      render: (pk) => <span className="font-mono text-xs font-bold text-brand-primary">{pk.pickListNo}</span>,
    },
    {
      key: "soNumber",
      header: "Sales Order",
      render: (pk) => <span className="font-mono text-xs text-brand-indigo">{pk.soNumber}</span>,
    },
    {
      key: "pickerName",
      header: "Assigned Picker",
      render: (pk) => <span className="text-xs font-semibold text-foreground">{pk.pickerName}</span>,
    },
    {
      key: "zone",
      header: "Warehouse Zone",
      render: (pk) => <span className="text-xs text-muted-foreground">{pk.zone}</span>,
    },
    {
      key: "progress",
      header: "Pick Progress",
      align: "center",
      render: (pk) => (
        <span className="text-xs font-bold text-foreground">
          {pk.pickedItems} / {pk.itemsToPick} Items
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (pk) => <StatusBadge status={pk.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Picking Lists"
        description="Fulfill sales orders by generating pick waves, routing pickers, and scanning bin locations."
      >
        <Button
          variant="gradient"
          size="sm"
          disabled={isSubmitting}
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={handleGenerateWave}
        >
          <Plus className="h-3.5 w-3.5" />
          {isSubmitting ? "Membuat Wave..." : "Generate Pick Wave"}
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
        data={pickLists}
        searchKey="pickListNo"
        searchPlaceholder="Search pick list or order..."
      />
    </div>
  );
}
