"use client";

import * as React from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicFooter } from "@/components/layout/public-footer";

export default function CheckoutFailedPage() {
  return (
    <div className="min-h-screen bg-white text-foreground font-sans flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <Card className="max-w-md w-full border-border shadow-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-black text-foreground">Pembayaran Gagal atau Dibatalkan</h1>
            <p className="text-sm text-muted-foreground">
              Pembayaran Anda tidak berhasil diselesaikan. Tidak ada tagihan yang dibuat - silakan coba
              lagi kapan saja.
            </p>
            <Button asChild variant="gradient" size="lg" className="w-full h-11 font-bold">
              <Link href="/pricing">Kembali ke Paket Harga</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
