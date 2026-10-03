"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { authApi } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // Intentionally ignored: the backend always returns a generic
      // success response regardless of whether the email exists, so the
      // UI shows the same "check your inbox" state either way and never
      // reveals account existence.
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#faf7fd] to-[#fcf2fa] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <Image
              src="/logo.png"
              alt="ONE ERP Logo"
              width={64}
              height={64}
              priority
              className="h-16 w-16 rounded-2xl shadow-xl shadow-purple-500/25 object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive recovery instructions
          </p>
        </div>

        <Card className="border-border shadow-xl shadow-purple-900/5 bg-white/90">
          <CardContent className="pt-6">
            {submitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Check Your Inbox</h3>
                <p className="text-sm text-muted-foreground">
                  If an account exists for{" "}
                  <span className="font-semibold text-foreground">{email}</span>, we
                  have sent password reset instructions to it.
                </p>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link href="/login">Return to Login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Corporate Email
                  </label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full h-10 font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-medium hover:underline"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
