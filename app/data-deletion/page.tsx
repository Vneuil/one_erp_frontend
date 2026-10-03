import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Mail, Trash2, Clock, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Data Deletion Instructions — ONE ERP",
  description: "How to request deletion of your data from ONE ERP.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-white text-foreground font-sans">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
          <Button asChild variant="gradient" size="sm" className="h-9 px-4 text-xs font-bold">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Data Deletion Instructions</h1>
          <p className="text-xs text-muted-foreground">Last updated: September 10, 2026</p>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed">
          If you have used ONE ERP — including via a connected WhatsApp Business Platform (Meta), TikTok Shop, Shopee,
          Lazada, or Blibli account — and want your personal data or account data deleted, follow the steps below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">1. Submit a Request</p>
              <p className="text-xs text-muted-foreground mt-0.5">Email us with your request and account details.</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">2. We Verify You</p>
              <p className="text-xs text-muted-foreground mt-0.5">We confirm your identity/ownership of the account.</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">3. Data is Deleted</p>
              <p className="text-xs text-muted-foreground mt-0.5">We delete or anonymize your data within 30 days.</p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-sm text-foreground/90 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">How to Request Deletion</h2>
            <p>
              Send an email to{" "}
              <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>{" "}
              with the subject line <strong>&quot;Data Deletion Request&quot;</strong>, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your full name and the email address or phone number registered with ONE ERP.</li>
              <li>Your company name (if applicable).</li>
              <li>If your request relates to a connected WhatsApp/Meta, TikTok Shop, Shopee, Lazada, or Blibli account, please specify which platform and account.</li>
              <li>Whether you want your entire account deleted, or only specific data removed.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">What Gets Deleted</h2>
            <p>Upon a verified request, we will delete or irreversibly anonymize:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your personal account information (name, email, phone number, login credentials).</li>
              <li>Data received from connected platforms (e.g. synced WhatsApp messages, marketplace orders) that is tied to your request.</li>
              <li>Access tokens for any third-party integration linked to your account.</li>
            </ul>
            <p>
              Where a company account is involved, deleting an individual user does not delete the company&apos;s shared business
              records (e.g. sales orders, invoices) unless the company owner requests full company account deletion.
              Some data may be retained where required by law (e.g. financial/tax records) or to resolve disputes, kept
              only as long as legally necessary.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-primary" />
              <h2 className="text-lg font-bold text-foreground m-0">Timeline</h2>
            </div>
            <p>
              We process verified deletion requests within <strong>30 days</strong>. You will receive a confirmation email
              once the deletion is complete.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">Contact</h2>
            <p>
              Questions about this process can also be sent to{" "}
              <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>.
              See also our{" "}
              <Link href="/privacy-policy" className="text-brand-primary hover:underline">Privacy Policy</Link>.
            </p>
            <p className="text-xs text-muted-foreground">PT Digital Ventura Integrasi — Indonesia</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8 bg-white text-xs text-muted-foreground text-center space-x-3">
        <span>© 2026 PT Digital Ventura Integrasi</span>
        <span>·</span>
        <Link href="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
        <span>·</span>
        <Link href="/terms-of-service" className="hover:text-foreground">Terms of Service</Link>
      </footer>
    </div>
  );
}
