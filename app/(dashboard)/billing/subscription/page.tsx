"use client";

import * as React from "react";
import {
  CreditCard,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { billingApi, SubscriptionInfo } from "@/lib/api/billing";
import { useAppStore } from "@/stores/app-store";

const PLAN_OPTIONS = [
  { months: 1, label: "1 Bulan", price: "Rp 1.000.000" },
  { months: 3, label: "3 Bulan", price: "Rp 3.000.000" },
  { months: 6, label: "6 Bulan", price: "Rp 6.000.000" },
  { months: 12, label: "12 Bulan", price: "Rp 10.000.000", badge: "Hemat 17%" },
];

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function daysRemaining(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  trial: { label: "Masa Trial", color: "text-amber-300" },
  pending_payment: { label: "Menunggu Pembayaran", color: "text-orange-300" },
  active: { label: "Aktif & Terlindungi", color: "text-emerald-300" },
  expired: { label: "Kedaluwarsa", color: "text-rose-300" },
  pending_activation: { label: "Menunggu Aktivasi", color: "text-slate-300" },
};

export default function SubscriptionBillingPage() {
  const { currentCompany } = useAppStore();

  const [subscription, setSubscription] = React.useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedMonths, setSelectedMonths] = React.useState(12);
  const [processing, setProcessing] = React.useState(false);

  const loadSubscription = React.useCallback(() => {
    if (!currentCompany?.id) return;
    setLoading(true);
    setLoadError(null);
    billingApi
      .getSubscription(currentCompany.id)
      .then((res) => {
        if (res.success && res.data) {
          setSubscription(res.data);
          setLoadError(null);
        }
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Failed to load subscription"))
      .finally(() => setLoading(false));
  }, [currentCompany?.id]);

  React.useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const handleUpgrade = async () => {
    if (!currentCompany?.id) return;
    setProcessing(true);
    try {
      await billingApi.choosePlan(currentCompany.id, selectedMonths);
      const payment = await billingApi.createPayment(currentCompany.id);
      if (payment.success && payment.data) {
        window.location.href = payment.data.checkoutUrl;
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memproses pembayaran");
    } finally {
      setProcessing(false);
      loadSubscription();
    }
  };

  const trialDays = daysRemaining(subscription?.trialEndsAt);
  const statusInfo = subscription ? STATUS_LABEL[subscription.status] ?? { label: subscription.status, color: "text-slate-300" } : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-brand-primary" />
            <span>Lisensi & Paket Berlangganan</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Status lisensi ONE ERP untuk {currentCompany?.name || "perusahaan Anda"}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Memuat status langganan...
        </div>
      ) : loadError ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{loadError}
        </div>
      ) : subscription ? (
        <>
          {subscription.status === "expired" && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Lisensi Anda telah berakhir. Modul bisnis tidak dapat diakses sampai Anda memperpanjang langganan di bawah ini.
            </div>
          )}
          <div className="bg-gradient-to-r from-brand-dark via-[#3d1369] to-brand-indigo rounded-2xl p-6 text-white shadow-md relative overflow-hidden text-left">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-purple-200">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>
                    {subscription.planDurationMonths > 0
                      ? `Paket ${subscription.planDurationMonths} Bulan`
                      : "Paket Trial"}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tight">ONE ERP</h2>
                {subscription.status === "trial" && trialDays !== null && (
                  <p className="text-xs text-purple-200 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Sisa {trialDays} hari masa trial (berakhir {formatDate(subscription.trialEndsAt)})
                  </p>
                )}
                {subscription.status === "active" && (
                  <p className="text-xs text-purple-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aktif hingga {formatDate(subscription.endsAt)}
                  </p>
                )}
              </div>

              <div className="text-right shrink-0 space-y-1">
                <div className="text-xs text-purple-200">Total Tagihan:</div>
                <div className="text-lg font-black font-mono">{formatIDR(subscription.totalPrice)}</div>
                <span className={`text-[11px] bg-white/10 px-2 py-0.5 rounded font-bold ${statusInfo?.color}`}>
                  ● {statusInfo?.label}
                </span>
              </div>
            </div>
          </div>

          {subscription.status !== "active" && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Pilih Durasi Lisensi</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLAN_OPTIONS.map((p) => (
                  <button
                    key={p.months}
                    type="button"
                    onClick={() => setSelectedMonths(p.months)}
                    className={`p-3 rounded-xl border-2 text-left transition-colors cursor-pointer ${
                      selectedMonths === p.months ? "border-brand-primary bg-brand-tint/40" : "border-border hover:border-brand-primary/40"
                    }`}
                  >
                    <p className="text-xs font-bold">{p.label}</p>
                    <p className="text-sm font-black text-brand-primary">{p.price}</p>
                    {p.badge && <span className="text-[10px] font-bold text-emerald-600">{p.badge}</span>}
                  </button>
                ))}
              </div>
              <Button variant="gradient" className="w-full sm:w-auto" onClick={handleUpgrade} disabled={processing}>
                {processing ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memproses...</span>
                ) : (
                  "Lanjutkan ke Pembayaran"
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Pembayaran diproses via QRIS / Virtual Bank Account. Anda akan diarahkan ke halaman pembayaran aman.
              </p>
            </div>
          )}

          {subscription.status === "active" && (
            <Card>
              <CardContent className="p-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-foreground">Lisensi Anda aktif hingga <b>{formatDate(subscription.endsAt)}</b>. Terima kasih telah berlangganan ONE ERP.</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <XCircle className="h-4 w-4" />Tidak ada data langganan untuk perusahaan ini.
        </div>
      )}
    </div>
  );
}
