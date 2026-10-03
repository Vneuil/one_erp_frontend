"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore, CompanyInfo } from "@/stores/app-store";
import { apiClient } from "@/lib/api/client";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useTranslation } from "@/lib/i18n/translations";

interface LoginResponseData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    companyId: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  company?: CompanyInfo;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAppStore();
  const { t } = useTranslation();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Authenticate with real Go backend
      const res = await apiClient<LoginResponseData>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.success && res.data) {
        const { accessToken, user, company } = res.data;
        login(accessToken, user, company);
        router.push("/dashboard");
        return;
      }
    } catch (err: unknown) {
      const errorStr = err instanceof Error ? err.message : t.auth.errorAuth;
      setErrorMessage(errorStr);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-foreground selection:bg-brand-tint selection:text-brand-indigo font-sans">
      {/* Top Header Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t.auth.backToHome}</span>
        </Link>

        <LanguageSwitcher variant="pill" />
      </div>

      {/* Center: Main Form Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-xl shadow-purple-900/5 space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-3">
            <Link href="/" className="inline-flex items-center justify-center group">
              <Image
                src="/logo.png"
                alt="ONE ERP Logo"
                width={52}
                height={52}
                priority
                className="h-12 w-12 rounded-xl shadow-md shadow-purple-500/20 object-contain group-hover:scale-105 transition-transform"
              />
            </Link>

            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t.auth.cardTitle}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t.auth.cardSubtitle}
              </p>
            </div>
          </div>

          {/* Error alert if any */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* The Login Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {t.auth.emailLabel}
              </label>
              <Input
                type="email"
                placeholder="admin@one-erp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 text-sm bg-slate-50/50 border-border focus:bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-all"
              />
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.auth.passwordLabel}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-brand-primary hover:text-brand-indigo transition-colors"
                >
                  {t.auth.forgotPassword}
                </Link>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 text-sm pr-10 bg-slate-50/50 border-border focus:bg-white focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                  title={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary/20 accent-[#9A20D6] cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-muted-foreground font-medium cursor-pointer select-none">
                {t.auth.rememberMe}
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="gradient"
              className="w-full h-11 text-sm font-bold shadow-md shadow-purple-500/20 hover:shadow-lg transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t.auth.signingIn}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>{t.auth.signInButton}</span>
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Bottom Security Footer */}
      <div className="max-w-md w-full mx-auto text-center space-y-1 text-xs text-muted-foreground pt-4">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>{t.auth.securityNotice}</span>
        </p>
        <p>© 2026 PT Digital Ventura Integrasi</p>
        <p>
          <Link href="/faq" className="hover:text-brand-primary transition-colors font-semibold">
            FAQ
          </Link>
        </p>
      </div>
    </div>
  );
}
