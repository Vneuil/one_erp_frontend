"use client";

import { useNavigationAccess } from "@/providers/navigation-access";
import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { manufacturingApi } from "@/lib/api/manufacturing";

interface ProductionOrder {
  id: string;
  moNumber: string;
  bomCode: string;
  productName: string;
  targetQty: number;
  startDate: string;
  dueDate: string;
  line: string;
  status: string;
}

function mapOrder(o: import("@/lib/api/manufacturing").ProductionOrderItem): ProductionOrder {
  return {
    id: o.id,
    moNumber: `MO-${o.id.slice(0, 8).toUpperCase()}`,
    bomCode: o.bomName,
    productName: o.productName || o.bomName,
    targetQty: o.quantityToProduce,
    startDate: o.plannedDate || "-",
    dueDate: o.plannedDate || "-",
    line: o.warehouseName,
    status: o.status === "planned" ? "pending" : o.status,
  };
}

export default function ProductionOrdersPage() {
  const { canApprove } = useNavigationAccess();
  const mayApprove = canApprove("manufacturing");
  const [orders, setOrders] = React.useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    manufacturingApi
      .listProductionOrders()
      .then((res) => {
        setOrders((res.data || []).map(mapOrder));
        setLoadError(null);
      })
      .catch((err) => {
        console.error("Failed to load production orders", err);
        setLoadError("Gagal memuat order produksi dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Only the server's response changes an order; a failed call is reported, never simulated.
  const act = async (
    order: ProductionOrder,
    call: (id: string) => Promise<{ data: import("@/lib/api/manufacturing").ProductionOrderItem }>,
    success: string
  ) => {
    if (busyId) return;
    setBusyId(order.id);
    setNotice(null);
    try {
      const res = await call(order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? mapOrder(res.data) : o)));
      setNotice({ kind: "success", text: success });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Gagal memproses order produksi." });
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = (order: ProductionOrder) =>
    act(order, manufacturingApi.releaseProductionOrder, `${order.moNumber} dirilis ke lantai produksi.`);

  const handleCancel = (order: ProductionOrder) => {
    if (order.status === "completed" || order.status === "cancelled") return;
    if (!confirm(`Cancel ${order.moNumber}? This cannot be undone.`)) return;
    return act(order, manufacturingApi.cancelProductionOrder, `${order.moNumber} dibatalkan.`);
  };

  const columns: Column<ProductionOrder>[] = [
    {
      key: "moNumber",
      header: "MO Number",
      sortable: true,
      render: (m) => <span className="font-mono text-xs font-bold text-brand-primary">{m.moNumber}</span>,
    },
    {
      key: "productName",
      header: "Product to Produce",
      sortable: true,
      render: (m) => (
        <div>
          <p className="font-semibold text-xs text-foreground">{m.productName}</p>
          <span className="font-mono text-[11px] text-muted-foreground">{m.bomCode}</span>
        </div>
      ),
    },
    {
      key: "targetQty",
      header: "Target Qty",
      align: "center",
      render: (m) => <span className="text-xs font-bold">{m.targetQty} Units</span>,
    },
    {
      key: "line",
      header: "Work Center / Line",
      render: (m) => <span className="text-xs text-muted-foreground">{m.line}</span>,
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (m) => <span className="text-xs font-medium text-foreground">{m.dueDate}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (m) => <StatusBadge status={m.status} />,
    },
    {
      key: "id",
      header: "Actions",
      align: "center",
      render: (m) =>
        m.status === "completed" || m.status === "cancelled" ? (
          <span className="text-[11px] text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            {mayApprove && (m.status === "pending" || m.status === "planned") && (
              <Button
                variant="gradient"
                size="sm"
                className="h-7 px-2 text-[11px] font-semibold"
                disabled={busyId === m.id}
                onClick={() => handleRelease(m)}
              >
                Release
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
              disabled={busyId === m.id}
              onClick={() => handleCancel(m)}
            >
              Cancel
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing Work Orders (MO)"
        description="Schedule production runs, release raw material allocations, and monitor assembly lines."
      >
      </PageHeader>

      {loadError && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}
      {notice && (
        <div
          role={notice.kind === "error" ? "alert" : "status"}
          className={`px-3 py-2 rounded-lg border text-xs font-medium ${
            notice.kind === "error" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
      <DataTable
        columns={columns}
        data={orders}
        searchKey="moNumber"
        searchPlaceholder="Search MO or product..."
      />
      )}
    </div>
  );
}
