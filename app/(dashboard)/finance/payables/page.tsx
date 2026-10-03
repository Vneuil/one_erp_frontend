"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, PayableItem, AgingReport } from "@/lib/api/finance";
import { downloadCsv } from "@/lib/utils/csv";
import { describeSource } from "@/lib/utils/finance-source";

export default function PayablesPage() {
  const [payables, setPayables] = React.useState<PayableItem[]>([]);
  const [agingReport, setAgingReport] = React.useState<AgingReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([financeApi.listPayables(), financeApi.apAging()])
      .then(([listRes, agingRes]) => {
        setPayables(listRes.data || []);
        setAgingReport(agingRes.data || null);
      })
      .catch((err) => {
        console.error("Failed to load payables", err);
        setLoadError("Gagal memuat data hutang dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleExportSchedule = () => {
    downloadCsv(
      "ap-schedule-report.csv",
      ["Supplier", "Invoice No", "Source", "Due Date", "Payment Terms", "Outstanding", "Status"],
      payables.map((p) => [p.vendorName, p.invoiceNo, describeSource(p.sourceDoc).label, p.dueDate, p.paymentTerms, p.outstanding, p.status])
    );
  };

  const columns: Column<PayableItem>[] = [
    {
      key: "vendorName",
      header: "Supplier / Creditor",
      sortable: true,
      render: (p) => <span className="text-xs font-semibold text-foreground">{p.vendorName}</span>,
    },
    {
      key: "invoiceNo",
      header: "Vendor Invoice Ref",
      render: (p) => <span className="font-mono text-xs font-bold text-brand-primary">{p.invoiceNo}</span>,
    },
    {
      key: "sourceDoc",
      header: "Source",
      render: (p) => {
        const src = describeSource(p.sourceDoc);
        return (
          <span className={`text-xs ${src.auto ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            {src.label}
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due Date",
      render: (p) => <span className="text-xs font-medium text-foreground">{p.dueDate}</span>,
    },
    {
      key: "paymentTerms",
      header: "Terms",
      render: (p) => <span className="text-xs text-muted-foreground">{p.paymentTerms}</span>,
    },
    {
      key: "outstanding",
      header: "Payable Balance",
      align: "right",
      sortable: true,
      render: (p) => <MoneyDisplay amount={p.outstanding} className="text-xs font-bold" />,
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
        title="Accounts Payable (AP) Schedule"
        description="Forecast vendor cash commitments, schedule disbursements, and track payment terms."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportSchedule}>
          <Download className="h-3.5 w-3.5" /> AP Schedule Report
        </Button>
      </PageHeader>

      {agingReport && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {agingReport.buckets.map((b) => (
            <Card key={b.bucket} className="border-border shadow-2xs">
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">{b.bucket}</span>
                <div className={`text-lg font-black ${b.bucket.includes("+") || b.bucket.includes("Over") ? "text-rose-600" : "text-brand-dark"}`}>
                  <MoneyDisplay amount={b.amount} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loadError && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Memuat data...</div>
      ) : (
        <DataTable
          columns={columns}
          data={payables}
          searchKey="vendorName"
          searchPlaceholder="Search vendor name..."
        />
      )}
    </div>
  );
}
