"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PublicFooter } from "@/components/layout/public-footer";
import { checkoutApi } from "@/lib/api/checkout";
import { cn } from "@/lib/utils";

type PlanCode = "spark" | "scale";
type BillingCycle = "monthly" | "annual";

const PLAN_LABELS: Record<PlanCode, string> = {
  spark: "Spark",
  scale: "Scale",
};

// Display-only - the real price used to charge the customer is looked up
// server-side in one-backend (internal/modules/checkout/application) from
// the same plan/cycle codes, never sent from here. Keep these two tables in
// sync when a price changes.
const PLAN_PRICES: Record<PlanCode, Record<BillingCycle, number>> = {
  spark: { monthly: 999_000, annual: 9_999_000 },
  scale: { monthly: 2_499_000, annual: 24_999_000 },
};

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get("plan");
  const plan: PlanCode = rawPlan === "scale" ? "scale" : "spark";

  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>("monthly");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const price = PLAN_PRICES[plan][billingCycle];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);

    try {
      const res = await checkoutApi.createOrder({
        planCode: plan,
        billingCycle,
        companyName: (form.get("companyName") as string) || "",
        contactName: (form.get("contactName") as string) || "",
        contactEmail: (form.get("contactEmail") as string) || "",
        contactPhone: (form.get("contactPhone") as string) || "",
      });

      if (!res.data?.checkoutUrl) {
        throw new Error("Gagal membuat tautan pembayaran");
      }

      // Redirect to Xendit's hosted payment page - QRIS is listed first
      // among the payment methods the backend requests, so it's the
      // default tab shown there.
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tautan pembayaran. Silakan coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-foreground selection:bg-brand-tint selection:text-brand-indigo font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="ONE ERP Logo"
              width={34}
              height={34}
              priority
              className="h-8 w-8 rounded-lg shadow-md shadow-purple-500/20 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="font-black text-lg tracking-tight text-foreground">ONE ERP</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="pill" />
            <Button asChild variant="gradient" size="sm" className="h-9 px-4 text-xs font-bold">
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Back link */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Paket Harga</span>
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-6 text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-indigo bg-brand-tint px-3 py-1 rounded-full">
          <QrCode className="h-3.5 w-3.5" />
          Checkout QRIS &amp; Pembayaran Online
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Aktivasi Paket {PLAN_LABELS[plan]}
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Isi data perusahaan Anda, lalu selesaikan pembayaran lewat QRIS atau metode lain di halaman
          pembayaran Xendit. Akun Anda aktif otomatis setelah pembayaran berhasil.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <Card className="border-border shadow-md">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6">
              {/* Billing cycle toggle */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={cn(
                      "px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer",
                      billingCycle === "monthly"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={cn(
                      "px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer",
                      billingCycle === "annual"
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Tahunan
                  </button>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-2xl font-black text-foreground">{formatRupiah(price)}</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {billingCycle === "monthly" ? "/bulan" : "/tahun"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Paket {PLAN_LABELS[plan]}</p>
                </div>
              </div>

              {/* Payment method preview */}
              <div className="rounded-xl border border-border bg-slate-50/60 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-brand-primary" />
                  <h2 className="text-sm font-bold text-foreground">Metode Pembayaran</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default <strong>QRIS</strong> (scan &amp; bayar dari e-wallet atau m-banking apa saja). Virtual
                  Account BCA/BNI/BRI/Mandiri/Permata juga tersedia di halaman pembayaran berikutnya.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Nama Perusahaan</label>
                    <Input name="companyName" required placeholder="PT Contoh Sejahtera" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Nama Kontak</label>
                    <Input name="contactName" required placeholder="Nama Anda" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Email Kerja</label>
                    <Input name="contactEmail" required type="email" placeholder="nama@perusahaan.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">No. WhatsApp</label>
                    <Input name="contactPhone" required type="tel" placeholder="08xxxxxxxxxx" />
                  </div>
                </div>

                {error && <p className="text-xs font-semibold text-rose-600 text-center">{error}</p>}

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full h-12 font-bold shadow-md shadow-purple-500/20"
                  disabled={submitting}
                >
                  {submitting ? "Menyiapkan pembayaran..." : `Bayar ${formatRupiah(price)} dengan QRIS`}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </section>

      <PublicFooter />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={null}>
      <CheckoutContent />
    </React.Suspense>
  );
}
