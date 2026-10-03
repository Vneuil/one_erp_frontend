"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, ReceivableItem, AgingReport } from "@/lib/api/finance";
import { downloadCsv } from "@/lib/utils/csv";
import { describeSource } from "@/lib/utils/finance-source";

export default function ReceivablesPage() {
  const [receivables, setReceivables] = React.useState<ReceivableItem[]>([]);
  const [agingReport, setAgingReport] = React.useState<AgingReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([financeApi.listReceivables(), financeApi.arAging()])
      .then(([listRes, agingRes]) => {
        setReceivables(listRes.data || []);
        setAgingReport(agingRes.data || null);
      })
      .catch((err) => {
        console.error("Failed to load receivables", err);
        setLoadError("Gagal memuat data piutang dari server.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleExportAging = () => {
    downloadCsv(
      "ar-aging-report.csv",
      ["Customer", "Invoice No", "Source", "Due Date", "Aging Bucket", "Outstanding", "Status"],
      receivables.map((r) => [r.customerName, r.invoiceNo, describeSource(r.sourceDoc).label, r.dueDate, r.aging, r.outstanding, r.status])
    );
  };

  const columns: Column<ReceivableItem>[] = [
    {
      key: "customerName",
      header: "Customer Debtor",
      sortable: true,
      render: (r) => <span className="text-xs font-semibold text-foreground">{r.customerName}</span>,
    },
    {
      key: "invoiceNo",
      header: "Invoice Reference",
      render: (r) => <span className="font-mono text-xs font-bold text-brand-primary">{r.invoiceNo}</span>,
    },
    {
      key: "sourceDoc",
      header: "Source",
      render: (r) => {
        const src = describeSource(r.sourceDoc);
        return (
          <span className={`text-xs ${src.auto ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            {src.label}
          </span>
        );
      },
    },
    {
      key: "dueDate",
      header: "Payment Due Date",
      render: (r) => <span className="text-xs text-muted-foreground">{r.dueDate}</span>,
    },
    {
      key: "aging",
      header: "Aging Bracket",
      render: (r) => (
        <span className={`text-xs font-medium ${r.aging.includes("Past Due") ? "text-rose-600 font-bold" : "text-foreground"}`}>
          {r.aging}
        </span>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding Balance",
      align: "right",
      sortable: true,
      render: (r) => <MoneyDisplay amount={r.outstanding} highlight className="text-xs font-bold" />,
    },
    {
      key: "status",
      header: "Collection Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Receivable (AR) Aging"
        description="Monitor outstanding customer balances, payment aging buckets, and collection actions."
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExportAging}>
          <Download className="h-3.5 w-3.5" /> Aging Report
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
          data={receivables}
          searchKey="customerName"
          searchPlaceholder="Search by customer name..."
        />
      )}
    </div>
  );
}
