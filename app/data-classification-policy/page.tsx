import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Data Classification Policy — ONE ERP",
  description: "Data classification and handling requirements for PT Digital Ventura Integrasi and ONE ERP.",
  robots: { index: false, follow: false },
};

export default function DataClassificationPolicyPage() {
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
          <h1 className="text-3xl font-black tracking-tight">Data Classification Policy</h1>
          <p className="text-xs text-muted-foreground">Effective date: September 12, 2026</p>
        </div>
        <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Purpose &amp; Scope</h2>
            <p>This policy defines how PT Digital Ventura Integrasi personnel must classify and handle information used by ONE ERP, including customer, employee, supplier, and marketplace data. It applies to databases, files, messages, exports, logs, backups, and printed records throughout their lifecycle. Requirements in this policy must be supported by implementation records and do not replace verification of individual system controls.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Ownership &amp; Classification</h2>
            <p>Each dataset must have an accountable owner who records its classification, permitted purpose, authorized users, retention requirements, and approved storage locations. Personnel must follow the assigned classification and report incorrect labels. Engineering and operations must implement the required safeguards. The most sensitive information in a mixed dataset determines its classification. Treat unclassified business information as Confidential until the owner reviews it.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Classification Levels</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-2"><h3 className="font-bold text-brand-primary">Public</h3><p><strong>Examples:</strong> Approved website content, published product information, and public policies.</p><p><strong>Handling:</strong> Owner approval is required before publication. Protect integrity and use the approved version.</p></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-2"><h3 className="font-bold text-brand-primary">Internal</h3><p><strong>Examples:</strong> Non-public procedures, routine internal communications, and planning materials without personal or sensitive business data.</p><p><strong>Handling:</strong> Limit distribution to authorized personnel and approved recipients. Use approved storage and sharing systems.</p></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-2"><h3 className="font-bold text-brand-primary">Confidential</h3><p><strong>Examples:</strong> Customer names, contact details, delivery addresses, order records, private messages, employee records, and non-public business or financial information.</p><p><strong>Handling:</strong> Require a business need and owner-authorized access. Encrypt in transit and at rest; restrict exports and sharing.</p></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4 space-y-2"><h3 className="font-bold text-brand-primary">Restricted</h3><p><strong>Examples:</strong> Passwords and password hashes, API keys, OAuth tokens, encryption keys, identity documents, and highly sensitive personal or financial records.</p><p><strong>Handling:</strong> Apply the strongest access restrictions, explicit owner approval, encryption, and access logging. Keep secrets in approved credential storage and revoke exposed credentials promptly.</p></div>
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Labeling &amp; Access</h2>
            <p>Record classification in the data inventory and apply labels to documents and exports where supported. Labels must not expose sensitive information. Access must use individual accounts, be approved for a documented business need, and follow least privilege. Review access periodically and upon role changes or departure. Restricted data requires explicit owner approval; privileged access must be limited and logged. A classification label alone does not enforce access control.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Storage &amp; Encryption</h2>
            <p>Store Internal, Confidential, and Restricted information only in approved systems. Confidential and Restricted data must be encrypted both in transit and at rest, including databases, object storage, backups, exports, and portable copies. Use approved TLS configurations for transmission and managed encryption for storage. Keep encryption keys separate from protected data, restrict key access, and define rotation and revocation procedures. Engineering must verify coverage and retain evidence before a system is approved to hold sensitive data. Passwords must use an appropriate salted, one-way password hash; hashing passwords does not replace encryption of other sensitive records.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Sharing &amp; Transfer</h2>
            <p>Public information may be shared only in its approved published form. Internal information may be shared with authorized personnel and approved recipients under appropriate confidentiality terms. Confidential and Restricted information requires a verified recipient, an authorized purpose, minimum necessary disclosure, and an approved encrypted channel. Restricted disclosures require explicit owner authorization. Do not use public links, personal email, or unapproved storage for non-public information. Review service providers and processing locations before transfers; customer and marketplace data must remain within authorized instructions and permissions.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Use, Exports &amp; Development</h2>
            <p>Collect and use only the information required for an approved purpose. Exports, screenshots, messages, logs, and derived datasets inherit the source classification unless the owner verifies that the sensitive information has been removed. Use synthetic or appropriately de-identified data in development and testing. Mask personal information in support materials and avoid logging credentials or full sensitive payloads. Removing direct identifiers alone does not make data Public if people or confidential business details can still be identified.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Retention &amp; Disposal</h2>
            <p>Apply the approved retention schedule and any documented preservation obligations to every classification. Delete or anonymize information when its authorized purpose and required retention period end. Include copies, exports, temporary files, and provider-held data in disposal instructions. Use secure deletion, approved media sanitization, or physical destruction as appropriate. Restrict retained exceptions, track backup expiry, reapply deletion instructions after restoration, and document completion for Confidential and Restricted data.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">9. Incidents &amp; Exceptions</h2>
            <p>Immediately report lost data, misdirected disclosures, exposed credentials, incorrect permissions, or other suspected handling violations to dev@divine.co.id. Preserve evidence, contain further exposure through authorized procedures, and coordinate investigation and required notifications with the incident lead and privacy owner. Exceptions require documented management approval, a responsible owner, compensating safeguards, and an expiry date. An exception does not override contractual or applicable legal obligations.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">10. Review &amp; Reclassification</h2>
            <p>Data owners must review classifications at least annually and whenever purpose, content, recipients, or risk changes. Reclassification requires a documented reason and owner approval. Update labels, inventories, permissions, and affected copies when a classification changes. The policy owner must maintain revision and review records and communicate changes to relevant personnel.</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">11. Contact &amp; Related Policies</h2>
            <p>For classification questions or security concerns, contact <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>.</p>
            <p>Read this policy alongside the <Link href="/security-policy" className="text-brand-primary hover:underline">Information Security Policy</Link>, <Link href="/internal-personal-data-protection-policy" className="text-brand-primary hover:underline">Internal Personal Data Protection Policy</Link>, and <Link href="/data-deletion" className="text-brand-primary hover:underline">Data Deletion Instructions</Link>.</p>
          </section>
        </div>
      </main>
      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        © 2026 PT Digital Ventura Integrasi · ONE ERP
      </footer>
    </div>
  );
}
