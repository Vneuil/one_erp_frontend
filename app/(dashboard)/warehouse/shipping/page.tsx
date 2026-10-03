"use client";

import * as React from "react";
import { Plus, Truck, Download } from "lucide-react";
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
import { warehouseApi, ShipmentItem, PickWaveItem } from "@/lib/api/warehouse";

interface Shipment {
  id: string;
  trackingNumber: string;
  carrier: string;
  destination: string;
  dispatchTime: string;
  estArrival: string;
  status: string;
}


function statusToUi(status: ShipmentItem["status"]): string {
  switch (status) {
    case "delivered":
      return "completed";
    case "dispatched":
      return "processing";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function toShipment(s: ShipmentItem): Shipment {
  return {
    id: s.id,
    trackingNumber: s.trackingNumber || `EXP-${s.id.slice(0, 8)}`,
    carrier: s.carrier || "-",
    destination: s.destinationAddress || "-",
    dispatchTime: s.dispatchedAt || (s.createdAt ? s.createdAt.slice(0, 16).replace("T", " ") : "-"),
    estArrival: "-",
    status: statusToUi(s.status),
  };
}

export default function ShippingPage() {
  const [shipments, setShipments] = React.useState<Shipment[]>([]);
  const [pickWaveId, setPickWaveId] = React.useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [carrier, setCarrier] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    warehouseApi
      .listShipments({ perPage: 50 })
      .then((res) => {
                  setShipments((res.data || []).map(toShipment));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Gagal memuat pengiriman.");
      });

    warehouseApi
      .listPickWaves({ perPage: 20 })
      .then((res) => {
        const completed = (res.data || []).find((w: PickWaveItem) => w.status === "completed");
        if (completed) setPickWaveId(completed.id);
      })
      .catch((err) => {
        console.warn("Failed to fetch pick waves for shipment booking", err);
      });
  }, []);

  const handleBookDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !carrier.trim() || !destination.trim()) return;
    setError(""); setNotice("");
    if (!pickWaveId) { setError("Belum ada picking selesai untuk pengiriman."); return; }
    setBusy(true);
    try {
      const res = await warehouseApi.createShipment({ pickWaveId, carrier: carrier.trim(), destinationAddress: destination.trim() });
      if (!res.success) throw new Error(res.message);
      setShipments((previous) => [toShipment(res.data), ...previous]);
      setIsNewOpen(false); setCarrier(""); setDestination("");
      setNotice("Pengiriman berhasil disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan pengiriman. Silakan coba lagi.");
    } finally { setBusy(false); }
  };

  const columns: Column<Shipment>[] = [
    {
      key: "trackingNumber",
      header: "Waybill / AWB No.",
      sortable: true,
      render: (s) => <span className="font-mono text-xs font-bold text-brand-primary">{s.trackingNumber}</span>,
    },
    {
      key: "carrier",
      header: "Carrier",
      sortable: true,
      render: (s) => (
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-muted-foreground" /> {s.carrier}
        </span>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      render: (s) => <span className="text-xs text-muted-foreground">{s.destination}</span>,
    },
    {
      key: "dispatchTime",
      header: "Dispatch Time",
      render: (s) => <span className="text-xs text-muted-foreground">{s.dispatchTime}</span>,
    },
    {
      key: "estArrival",
      header: "Est. Arrival",
      render: (s) => <span className="text-xs font-medium text-foreground">{s.estArrival}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge status={s.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outbound Shipping & Manifest"
        description="Monitor freight dispatches, assign transport carriers, and track delivery progress."
      >
        <Button
          variant="gradient"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => setIsNewOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Book Carrier Dispatch
        </Button>
      </PageHeader>

      {error && !isNewOpen && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      <DataTable
        columns={columns}
        data={shipments}
        searchKey="trackingNumber"
        searchPlaceholder="Search tracking number..."
      />

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Carrier Dispatch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBookDispatch} className="space-y-3">
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            {!pickWaveId && <p className="text-sm">Selesaikan picking terlebih dahulu.</p>}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Carrier</label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Destination</label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button disabled={busy || !pickWaveId} type="submit" variant="gradient" className="text-xs font-semibold">
                Book Dispatch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
