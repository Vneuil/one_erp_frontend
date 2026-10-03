"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicFooter } from "@/components/layout/public-footer";
import { checkoutApi, CheckoutOrderStatus } from "@/lib/api/checkout";

// Xendit redirects here immediately after checkout, which can be a moment
// or two before its webhook actually lands and flips our own order status
// to "paid" - so this polls briefly rather than trusting the redirect alone
// (the redirect only proves the customer reached the end of Xendit's flow,
// not that the payment settled).
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("externalId");

  const [status, setStatus] = React.useState<CheckoutOrderStatus | null>(null);
  const [pollCount, setPollCount] = React.useState(0);

  React.useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const poll = () => {
      checkoutApi
        .getOrderStatus(orderId)
        .then((res) => {
          if (!cancelled && res.data) setStatus(res.data);
        })
        .catch(() => {
          // transient - the next poll (or the fallback message below) covers it
        });
    };

    poll();
    const interval = setInterval(() => {
      setPollCount((c) => {
        const next = c + 1;
        if (next >= MAX_POLLS) clearInterval(interval);
        return next;
      });
      poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  const isPaid = status?.status === "paid";
  const isStillWaiting = !status || status.status === "processing" || status.status === "pending";

  return (
    <div className="min-h-screen bg-white text-foreground font-sans flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="max-w-md w-full border-border shadow-md">
          <CardContent className="p-8 text-center space-y-4">
            {isPaid ? (
              <>
                <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-black text-foreground">Pembayaran Berhasil</h1>
                <p className="text-sm text-muted-foreground">
                  Terima kasih! Link aktivasi akun akan dikirim ke email Anda dalam beberapa menit.
                </p>
                <Button asChild variant="gradient" size="lg" className="w-full h-11 font-bold">
                  <Link href="/login">Ke Halaman Login</Link>
                </Button>
              </>
            ) : isStillWaiting && pollCount < MAX_POLLS ? (
              <>
                <div className="h-14 w-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Clock className="h-7 w-7 animate-pulse" />
                </div>
                <h1 className="text-xl font-black text-foreground">Menunggu Konfirmasi Pembayaran</h1>
                <p className="text-sm text-muted-foreground">
                  Kami sedang mengonfirmasi pembayaran Anda dengan Xendit. Halaman ini akan otomatis
                  memperbarui begitu pembayaran terverifikasi.
                </p>
              </>
            ) : (
              <>
                <div className="h-14 w-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <Clock className="h-7 w-7" />
                </div>
                <h1 className="text-xl font-black text-foreground">Konfirmasi Tertunda</h1>
                <p className="text-sm text-muted-foreground">
                  Pembayaran Anda belum terverifikasi otomatis. Jika Anda sudah membayar, tim kami akan
                  mengaktifkan akun Anda secara manual dalam 1x24 jam - atau hubungi support kami.
                </p>
                <Button asChild variant="outline" size="lg" className="w-full h-11 font-bold">
                  <Link href="/pricing">Kembali ke Paket Harga</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <React.Suspense fallback={null}>
      <SuccessContent />
    </React.Suspense>
  );
}
