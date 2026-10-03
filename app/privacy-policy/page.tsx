import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy — ONE ERP",
  description: "Privacy Policy for ONE ERP by PT Digital Ventura Integrasi.",
};

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-black tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Last updated: September 10, 2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-sm text-foreground/90 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <p>
              PT Digital Ventura Integrasi (&quot;<strong>we</strong>&quot;, &quot;<strong>us</strong>&quot;, or &quot;<strong>Divine</strong>&quot;) operates
              ONE ERP, an all-in-one business management platform accessible at{" "}
              <a href="https://one.divine.co.id" className="text-brand-primary hover:underline">one.divine.co.id</a> (the &quot;Service&quot;).
              This Privacy Policy explains how we collect, use, store, and protect information when a company (&quot;Customer&quot;) and its
              authorized users (&quot;you&quot;) use the Service, including when the Service connects to third-party platforms such as
              WhatsApp Business Platform, Meta/Facebook, TikTok Shop, Shopee, Lazada, and Blibli on the Customer&apos;s behalf.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account &amp; company data:</strong> name, email, phone number, company/business details, role, and login credentials of registered users.</li>
              <li><strong>Business operational data:</strong> data your company enters or generates while using the Service, including sales orders, inventory, customers, suppliers, employees, financial records, and documents.</li>
              <li><strong>Third-party integration data:</strong> when you connect a marketplace or messaging channel (e.g. WhatsApp Business Platform, TikTok Shop, Shopee, Lazada, Blibli), we receive and store the access tokens and order/message data needed to sync that channel with the Service, limited to what you authorize.</li>
              <li><strong>WhatsApp messages:</strong> if you connect WhatsApp Business Platform, message content, sender/recipient phone numbers, and delivery metadata are processed to power the Omnichannel Inbox feature and are stored in your company&apos;s own database.</li>
              <li><strong>Usage &amp; technical data:</strong> IP address, browser type, device information, and activity logs (e.g. who created or modified a record) for security and audit purposes.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, operate, and maintain the Service for your company.</li>
              <li>To synchronize orders, messages, and inventory between the Service and the third-party platforms you connect.</li>
              <li>To send transactional notifications (e.g. order confirmations, onboarding invites) via email or WhatsApp.</li>
              <li>To maintain security, prevent fraud, and enforce our Terms of Service.</li>
              <li>To provide customer support and respond to your requests.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p>We do not sell your data or your customers&apos; data to third parties.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Data Storage &amp; Security</h2>
            <p>
              Each Customer company&apos;s operational data is stored in a dedicated, isolated database. Access tokens for connected
              platforms (WhatsApp, marketplaces) are stored securely and used only to make authorized API calls on your behalf.
              We apply reasonable technical and organizational measures — including authenticated access, role-based permissions,
              and encrypted transport (HTTPS/TLS) — to protect your data against unauthorized access, alteration, or disclosure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Data Sharing</h2>
            <p>We only share data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>With the third-party platforms you explicitly connect (e.g. sending an order confirmation via WhatsApp, or syncing an order from a marketplace you authorized).</li>
              <li>With service providers who help us operate the Service (e.g. cloud hosting, payment processing), under confidentiality obligations.</li>
              <li>When required by law, legal process, or to protect the rights and safety of our users.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. WhatsApp &amp; Meta Platform Data</h2>
            <p>
              When your company connects its own WhatsApp Business Platform (Meta) account, the Service acts as your technology
              provider to send and receive WhatsApp messages on your behalf, in accordance with{" "}
              <a href="https://www.whatsapp.com/legal/business-policy" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                WhatsApp Business Policy
              </a>{" "}
              and{" "}
              <a href="https://www.facebook.com/policy.php" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                Meta&apos;s Privacy Policy
              </a>. We only access WhatsApp/Meta data necessary to provide messaging features you have enabled, and we do not use
              this data for advertising.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Your Rights &amp; Data Deletion</h2>
            <p>
              You may request access, correction, or deletion of your personal data or your company&apos;s data at any time. See our{" "}
              <Link href="/data-deletion" className="text-brand-primary hover:underline">Data Deletion Instructions</Link>{" "}
              for how to submit a deletion request.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Data Retention</h2>
            <p>
              We retain your data for as long as your company&apos;s account remains active, or as needed to comply with legal
              obligations, resolve disputes, and enforce our agreements. Upon a verified deletion request, we delete or
              anonymize the data within the timeframe described in our Data Deletion Instructions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be notified via the Service or by
              email to your registered account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">9. Contact Us</h2>
            <p>
              For privacy questions or requests, contact us at{" "}
              <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>.
            </p>
            <p className="text-xs text-muted-foreground">PT Digital Ventura Integrasi — Indonesia</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-8 bg-white text-xs text-muted-foreground text-center space-x-3">
        <span>© 2026 PT Digital Ventura Integrasi</span>
        <span>·</span>
        <Link href="/terms-of-service" className="hover:text-foreground">Terms of Service</Link>
        <span>·</span>
        <Link href="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
      </footer>
    </div>
  );
}
