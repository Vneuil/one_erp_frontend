"use client";

import * as React from "react";
import { FileSpreadsheet, Download, PieChart, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { MoneyDisplay } from "@/components/shared/money-display";
import { financeApi, FinancialInsight, ProfitLossReport, BalanceSheetReport, CashFlowReport, TrialBalanceReport } from "@/lib/api/finance";
import { downloadCsv } from "@/lib/utils/csv";

type ReportKey = "pnl" | "balanceSheet" | "cashFlow" | "trialBalance" | "memorialJournals";

export default function FinancialReportsPage() {
  const [pnl, setPnl] = React.useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = React.useState<BalanceSheetReport | null>(null);
  const [cashFlow, setCashFlow] = React.useState<CashFlowReport | null>(null);
  const [trialBalance, setTrialBalance] = React.useState<TrialBalanceReport | null>(null);
  const [memorialJournals, setMemorialJournals] = React.useState<any[] | null>(null);

  const [insights, setInsights] = React.useState<FinancialInsight[] | null>(null);
  const [insightsError, setInsightsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    financeApi
      .insights()
      .then((res) => setInsights(res.data))
      .catch((err) => setInsightsError(err instanceof Error ? err.message : "Gagal memuat insight."));
    financeApi.profitAndLoss().then((res) => setPnl(res.data)).catch((err) => console.warn("P&L unavailable", err));
    financeApi.balanceSheet().then((res) => setBalanceSheet(res.data)).catch((err) => console.warn("Balance sheet unavailable", err));
    financeApi.cashFlow().then((res) => setCashFlow(res.data)).catch((err) => console.warn("Cash flow unavailable", err));
    financeApi.trialBalance().then((res) => setTrialBalance(res.data)).catch((err) => console.warn("Trial balance unavailable", err));
    financeApi.memorialJournals().then((res) => setMemorialJournals(res.data)).catch((err) => console.warn("Memorial journals unavailable", err));
  }, []);

  const handleExportExcel = (key: ReportKey) => {
    if (key === "pnl" && pnl) {
      downloadCsv(
        "profit-and-loss.csv",
        ["Metric", "Amount"],
        [
          ["Revenue", pnl.revenue],
          ["Cost of Goods Sold", pnl.costOfGoodsSold],
          ["Gross Profit", pnl.grossProfit],
          ["Operating Expense", pnl.operatingExpense],
          ["Net Profit", pnl.netProfit],
        ]
      );
    } else if (key === "balanceSheet" && balanceSheet) {
      downloadCsv(
        "balance-sheet.csv",
        ["Metric", "Amount"],
        [
          ["Assets", balanceSheet.assets],
          ["Liabilities", balanceSheet.liabilities],
          ["Equity (capital less drawings)", balanceSheet.equity],
          ["Retained Earnings", balanceSheet.retainedEarnings ?? 0],
          ["Total Liabilities & Equity", balanceSheet.totalLiabilitiesAndEquity],
        ]
      );
    } else if (key === "cashFlow" && cashFlow) {
      downloadCsv(
        "cash-flow.csv",
        ["Metric", "Amount"],
        [
          ["Cash Inflow", cashFlow.cashInflow],
          ["Cash Outflow", cashFlow.cashOutflow],
          ["Net Cash Flow", cashFlow.netCashFlow],
        ]
      );
    } else if (key === "trialBalance" && trialBalance) {
      downloadCsv(
        "trial-balance.csv",
        ["Account Code", "Account Name", "Debit", "Credit"],
        trialBalance.lines.map((l) => [l.accountCode, l.accountName, l.debit, l.credit])
      );
    } else if (key === "memorialJournals" && memorialJournals) {
      const rows: any[] = [];
      memorialJournals.forEach(j => {
        j.lines.forEach((l: any) => {
          rows.push([j.entryNumber, j.date, j.memo, l.accountCode, l.accountName, l.debit, l.credit, l.description || ""]);
        });
      });
      downloadCsv(
        "memorial-journals.csv",
        ["Entry Number", "Date", "Memo", "Account Code", "Account Name", "Debit", "Credit", "Description"],
        rows
      );
    } else {
      window.alert("No posted journal entries yet to export.");
    }
  };

  const financialReports: { key: ReportKey; title: string; description: string; frequency: string; icon: typeof TrendingUp; summary: React.ReactNode }[] = [
    {
      key: "pnl",
      title: "Income Statement (Profit & Loss)",
      description: "Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Margin.",
      frequency: "Monthly / Quarterly / Annual",
      icon: TrendingUp,
      summary: pnl ? (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-normal">Gross Profit:</span>
            <MoneyDisplay amount={pnl.grossProfit} highlight />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-normal">Net Profit:</span>
            <MoneyDisplay amount={pnl.netProfit} highlight />
          </div>
        </div>
      ) : (
        "No posted journal entries yet"
      ),
    },
    {
      key: "balanceSheet",
      title: "Balance Sheet (Neraca Keuangan)",
      description: "Current & Non-Current Assets, Short & Long Term Liabilities, and Shareholders Equity.",
      frequency: "As of Specified Date",
      icon: DollarSign,
      summary: balanceSheet ? (
        <span>
          Total Assets: <MoneyDisplay amount={balanceSheet.assets} highlight />
        </span>
      ) : (
        "No posted journal entries yet"
      ),
    },
    {
      key: "cashFlow",
      title: "Cash Flow Statement (Arus Kas)",
      description: "Operational cash flow, capital investment outflows, and financing cash movements.",
      frequency: "Monthly / YTD",
      icon: PieChart,
      summary: cashFlow ? (
        <span>
          Net Cash Flow: <MoneyDisplay amount={cashFlow.netCashFlow} highlight />
        </span>
      ) : (
        "No posted journal entries yet"
      ),
    },
    {
      key: "trialBalance",
      title: "General Trial Balance (Neraca Saldo)",
      description: "Full debit & credit verification across all Chart of Account ledger nodes.",
      frequency: "Monthly Closing",
      icon: FileSpreadsheet,
      summary: trialBalance ? (
        <span>
          Total Debit: <MoneyDisplay amount={trialBalance.totalDebit} highlight /> / Total Credit:{" "}
          <MoneyDisplay amount={trialBalance.totalCredit} highlight />
        </span>
      ) : (
        "No posted journal entries yet"
      ),
    },
    {
      key: "memorialJournals",
      title: "Memorial Journals Report",
      description: "Laporan khusus jurnal manual (adjustment/memorial) tanpa jurnal otomatis.",
      frequency: "As Needed",
      icon: FileSpreadsheet,
      summary: memorialJournals ? (
        <span>{memorialJournals.length} memorial entries found</span>
      ) : (
        "No memorial journals yet"
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Statements & Reports"
        description="Generate GAAP/IFRS standard financial statements and statutory accounting reports."
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold">Insight & Audit Otomatis</CardTitle>
          <CardDescription>Pemeriksaan aturan atas jurnal 90 hari terakhir dan piutang terbuka: jurnal tidak seimbang, dobel, bertanggal mundur, nominal janggal, dan piutang macet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {insightsError && <p role="alert" className="text-xs text-rose-700">{insightsError}</p>}
          {insights === null && !insightsError && <p className="text-xs text-muted-foreground">Memeriksa…</p>}
          {insights && insights.length === 0 && <p className="text-xs text-emerald-700">Tidak ada temuan. Semua pemeriksaan otomatis lolos.</p>}
          {insights?.map((i) => (
            <div key={i.rule} className={`rounded-lg border p-3 text-xs ${i.severity === "critical" ? "border-rose-300 bg-rose-50" : i.severity === "warning" ? "border-amber-300 bg-amber-50" : "border-border bg-slate-50"}`}>
              <div className="font-bold">{i.severity === "critical" ? "⛔ " : i.severity === "warning" ? "⚠️ " : "ℹ️ "}{i.title}</div>
              <p>{i.detail}</p>
              {i.refs && i.refs.length > 0 && <p className="mt-1 font-mono text-[10px] text-muted-foreground">{i.refs.join(" · ")}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {financialReports.map((rpt, idx) => {
          const Icon = rpt.icon;
          return (
            <Card key={idx} className="hover:border-brand-primary/40 transition-all flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-tint text-brand-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{rpt.title}</CardTitle>
                    <CardDescription>{rpt.frequency}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">{rpt.description}</p>
                <div className="text-xs font-semibold text-foreground">{rpt.summary}</div>
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.print()}>
                    <Download className="h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button
                    variant="gradient"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    onClick={() => handleExportExcel(rpt.key)}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Generate Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
