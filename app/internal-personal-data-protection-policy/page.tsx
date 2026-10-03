import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Internal Personal Data Protection Policy — ONE ERP",
  description: "Internal personal data protection requirements for PT Digital Ventura Integrasi and ONE ERP.",
  robots: { index: false, follow: false },
};

export default function InternalPersonalDataProtectionPolicyPage() {
  return (
    <div lang="en" className="min-h-screen bg-white text-foreground font-sans">
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
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-primary">ONE ERP · Policy</p>
          <h1 className="text-3xl font-black tracking-tight">Internal Personal Data Protection Policy</h1>
          <p className="text-xs text-muted-foreground">Effective date: June 1, 2025</p>
        </div>
        <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Purpose &amp; Scope</h2>
            <p>This policy establishes internal requirements for employees, contractors, and other authorized personnel of PT Digital Ventura Integrasi who handle personal data through ONE ERP, including data received through customer-authorized TikTok Shop and other integrations. It covers collection, access, use, sharing, storage, retention, and disposal.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Ownership &amp; Responsibilities</h2>
            <p>Management must approve this policy, assign an accountable privacy owner, and provide resources for implementation. The privacy owner must maintain processing records, coordinate requests and incidents, and record policy reviews. Engineering and operations must implement and verify approved safeguards. Managers must authorize access and remove it when duties change or personnel leave. All personnel must follow approved instructions and promptly report concerns. This policy does not designate a DPO.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Collection &amp; Permitted Use</h2>
            <p>Personnel must collect only data necessary for a documented service purpose and use it only for that purpose. Before new processing begins, the responsible owner must document the data categories, purpose, authority for processing, recipients, storage locations, and retention requirements. Customer and marketplace data must be processed within authorized instructions and permissions. Unapproved marketing, sale, reuse, or disclosure of personal data is prohibited.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Classification &amp; Access</h2>
            <p>Treat customer identifiers, contact details, addresses, order information, employee records, and private messages as confidential personal data. Apply more restrictive handling to identity documents, financial details, and other sensitive records. Grant access only for an approved business need, using individual accounts and the minimum permissions required. Review access periodically and on role changes or departure. Do not share credentials or copy production data into personal accounts or unapproved development environments.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Storage, Transfer &amp; Daily Handling</h2>
            <p>Use approved systems and secure transfer channels. Keep devices locked when unattended and protect printed records from unauthorized viewing. Avoid placing personal data or credentials in logs, support messages, or public repositories; use redacted or synthetic data where possible. Engineering must verify and document transport encryption, storage and backup protections, and access controls before approving a system for personal data.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Third Parties &amp; Processing Locations</h2>
            <p>Before sharing personal data with a provider or enabling a new integration, the responsible owner must review its purpose, data scope, security arrangements, confidentiality and processing terms, deletion arrangements, and physical processing locations, including backups and subprocessors. Keep an approved provider and location inventory, and review changes before transferring data. The company address must not be used as evidence of a hosting location.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Requests from Individuals &amp; Customers</h2>
            <p>Route requests for access, correction, export, or deletion to the privacy contact below. Verify identity and authority proportionately before disclosing or changing data. Record receipt, scope, responsible person, applicable deadline, actions, and completion. Where a seller or customer controls the data, coordinate with that customer and assist with authorized requests from the customer or TikTok Shop. Use secure delivery methods and explain any documented limitation or retention requirement.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Retention &amp; Deletion</h2>
            <p>The privacy owner must maintain a retention schedule by data category and purpose, including operational records, exports, logs, and backups. Retain data only for the approved purpose and documented retention requirements. At contract termination or after a verified deletion instruction, arrange authorized return, deletion, or anonymization, subject to documented retention obligations. Track completion, restrict retained exceptions, and record when backup copies expire. If a backup is restored, reapply relevant deletion instructions before normal use.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">9. Suspected Data Breaches</h2>
            <p>Personnel must immediately report suspected loss, unauthorized access, disclosure, alteration, or destruction of personal data to the contact below. Preserve evidence and avoid unnecessary copying or further disclosure. The designated incident lead must coordinate containment and investigation; the privacy owner must assess affected data, individuals, customers, and notification obligations with management. Notify affected sellers, TikTok Shop, and other required recipients within applicable contractual and legal deadlines, document decisions and communications, and track corrective actions. Management must assign and maintain these roles.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">10. Awareness, Review &amp; Exceptions</h2>
            <p>Before receiving access, personnel must be informed of their data-handling responsibilities. The privacy owner must review this policy at least annually and when material processing changes, incidents, or new requirements arise. Keep version history, approval records, review dates, and evidence of implementation. Management must document and time-limit any exception, assign an owner, and approve compensating safeguards. The privacy owner must record the next review date and the outcome of each review.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">11. Contact &amp; Related Policies</h2>
            <p>For privacy requests and security concerns, contact <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>. This contact is not presented as an appointed DPO.</p>
            <p>Read the <Link href="/privacy-policy" className="text-brand-primary hover:underline">Privacy Policy</Link>, <Link href="/security-policy" className="text-brand-primary hover:underline">Information Security Policy</Link>, and <Link href="/data-deletion" className="text-brand-primary hover:underline">Data Deletion Instructions</Link> alongside this policy. Report any inconsistencies to the privacy owner for resolution.</p>
          </section>
        </div>
      </main>
      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        © 2026 PT Digital Ventura Integrasi · ONE ERP
      </footer>
    </div>
  );
}
