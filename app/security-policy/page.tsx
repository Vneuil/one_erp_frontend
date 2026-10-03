import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Users, Database, Eye } from "lucide-react";

export const metadata = {
  title: "Information Security & Data Protection Policy — ONE ERP",
  description: "Information Security, Access Control, and Data Protection Policy for ONE ERP by PT Digital Ventura Integrasi.",
};

export default function SecurityPolicyPage() {
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
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-brand-primary shrink-0" />
            <span>Information Security &amp; Data Protection Policy</span>
          </h1>
          <p className="text-xs text-muted-foreground">Last updated: September 11, 2026</p>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed">
          This policy describes the technical and organizational measures PT Digital Ventura Integrasi
          (&quot;we&quot;, &quot;us&quot;, or &quot;Divine&quot;) applies to protect data processed through ONE ERP
          (<a href="https://one.divine.co.id" className="text-brand-primary hover:underline">one.divine.co.id</a>),
          covering information security, access control, and data classification/protection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Encryption in Transit</p>
              <p className="text-xs text-muted-foreground mt-0.5">All traffic to and from the Service is encrypted via HTTPS/TLS.</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Per-Tenant Data Isolation</p>
              <p className="text-xs text-muted-foreground mt-0.5">Each Customer company&apos;s operational data lives in its own dedicated database.</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Role-Based Access Control</p>
              <p className="text-xs text-muted-foreground mt-0.5">Users only access features and data their assigned role permits.</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-slate-50/60 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Activity Logging</p>
              <p className="text-xs text-muted-foreground mt-0.5">Key actions across modules are logged with the acting user and timestamp for audit purposes.</p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-sm text-foreground/90 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Access Control</h2>
            <p>
              Access to ONE ERP requires authenticated login (email/password, session tokens). Within each Customer
              company, access to specific modules and actions (e.g. finance, HR, sales, administration) is governed by
              a role-based permission system — users are granted the minimum access needed for their role
              (principle of least privilege). Administrative and platform-level access is restricted to authorized
              Divine personnel only.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Data Classification &amp; Handling</h2>
            <p>We treat data processed through the Service in the following categories:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Personal data</strong> — names, contact details, and identifiers of users, customers, employees, and suppliers entered by a Customer company.</li>
              <li><strong>Business/operational data</strong> — sales, inventory, financial, and procurement records belonging to a Customer company.</li>
              <li><strong>Authentication &amp; integration credentials</strong> — passwords (hashed), API/OAuth tokens for connected platforms (WhatsApp Business Platform, marketplaces) — treated as the most sensitive category and never exposed in API responses or logs.</li>
            </ul>
            <p>
              Each Customer company&apos;s data is stored in a logically isolated, dedicated database, separate from
              every other Customer, and is never mixed or queried across companies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Data Protection Measures</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All data in transit between clients and the Service is encrypted using HTTPS/TLS.</li>
              <li>Passwords are stored hashed, never in plain text.</li>
              <li>Third-party integration access tokens (WhatsApp, marketplace platforms) are stored server-side and are never returned to the client or exposed in API responses.</li>
              <li>Access to a Customer company&apos;s data requires an authenticated session scoped to that company; cross-company data access is structurally prevented at the database layer.</li>
              <li>Key business actions are recorded in an activity log identifying the acting user, action, and timestamp.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Personal Data Protection</h2>
            <p>
              Personal data collected through the Service is used solely to provide the Service to the Customer
              company that entered it, as described in our{" "}
              <Link href="/privacy-policy" className="text-brand-primary hover:underline">Privacy Policy</Link>. We do
              not sell personal data. Individuals may request access, correction, or deletion of their personal data
              — see our{" "}
              <Link href="/data-deletion" className="text-brand-primary hover:underline">Data Deletion Instructions</Link>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Reporting a Security Concern</h2>
            <p>
              If you believe you have found a security vulnerability or wish to report a data protection concern
              related to ONE ERP, please contact us at{" "}
              <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>.
              We will acknowledge and investigate reports in good faith.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Policy Review</h2>
            <p>
              This policy is reviewed periodically and updated as our security practices evolve. Material changes will
              be reflected on this page with an updated revision date.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Contact</h2>
            <p>
              For questions about this policy, contact{" "}
              <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>.
            </p>
            <p className="text-xs text-muted-foreground">PT Digital Ventura Integrasi — Indonesia</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8 bg-white text-xs text-muted-foreground text-center space-x-3">
        <Link href="/incident-response-policy" className="hover:text-foreground">Incident Response Policy</Link>
        <span>·</span>
        <Link href="/vulnerability-threat-management-procedure" className="hover:text-foreground">Vulnerability &amp; Threat Management Procedure</Link>
        <span>·</span>
        <Link href="/data-classification-policy" className="hover:text-foreground">Data Classification Policy</Link>
        <span>·</span>
        <Link href="/internal-personal-data-protection-policy" className="hover:text-foreground">Internal Data Protection Policy</Link>
        <span>·</span>
        <span>© 2026 PT Digital Ventura Integrasi</span>
        <span>·</span>
        <Link href="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link>
        <span>·</span>
        <Link href="/terms-of-service" className="hover:text-foreground">Terms of Service</Link>
        <span>·</span>
        <Link href="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
      </footer>
    </div>
  );
}
