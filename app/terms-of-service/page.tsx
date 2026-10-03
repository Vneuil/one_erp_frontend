import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service — ONE ERP",
  description: "Terms of Service for ONE ERP by PT Digital Ventura Integrasi.",
};

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-black tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-xs text-muted-foreground">Last updated: September 10, 2026</p>
        </div>

        <div className="prose prose-sm max-w-none text-sm text-foreground/90 space-y-6 leading-relaxed">
          <section className="space-y-2">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern access to and use of ONE ERP, operated by PT Digital Ventura Integrasi
              (&quot;we&quot;, &quot;us&quot;, or &quot;Divine&quot;), available at{" "}
              <a href="https://one.divine.co.id" className="text-brand-primary hover:underline">one.divine.co.id</a> (the &quot;Service&quot;).
              By creating an account or using the Service, you agree to these Terms on behalf of yourself and the company you
              represent (&quot;Customer&quot;).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">1. The Service</h2>
            <p>
              ONE ERP is a business management platform covering sales, inventory, finance, HR, procurement, CRM, and related
              modules, including optional integrations with marketplaces (TikTok Shop, Shopee, Lazada, Blibli) and messaging
              channels (WhatsApp Business Platform). Features and pricing plans (Spark, Scale, Infinite) may change over time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">2. Accounts &amp; Eligibility</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate registration information and keep your credentials confidential.</li>
              <li>You are responsible for all activity under your account and any user accounts your company creates.</li>
              <li>You must be authorized to act on behalf of the company you register.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">3. Subscriptions &amp; Payment</h2>
            <p>
              Paid plans are billed per the pricing and billing cycle shown at signup or in your account&apos;s Billing settings.
              Fees are non-refundable except as required by law or expressly stated otherwise. We may change pricing for future
              billing cycles with reasonable prior notice. Failure to pay may result in restricted access to the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">4. Third-Party Integrations</h2>
            <p>
              If you connect third-party platforms (WhatsApp Business Platform, TikTok Shop, Shopee, Lazada, Blibli, or others),
              you remain responsible for complying with that platform&apos;s own terms and policies. We are not responsible for
              outages, policy changes, or data made available by those third-party platforms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">5. Customer Data</h2>
            <p>
              You retain ownership of all business data you input into the Service (&quot;Customer Data&quot;). You grant us a limited
              license to host, process, and transmit Customer Data solely to provide the Service to you. See our{" "}
              <Link href="/privacy-policy" className="text-brand-primary hover:underline">Privacy Policy</Link> for details on
              how we handle data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for unlawful purposes, or to send spam, unsolicited messages, or misleading content via connected channels.</li>
              <li>Attempt to gain unauthorized access to the Service, other Customers&apos; data, or our infrastructure.</li>
              <li>Reverse engineer, resell, or white-label the Service without our written consent.</li>
              <li>Upload data that infringes third-party intellectual property or violates applicable law.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">7. Suspension &amp; Termination</h2>
            <p>
              We may suspend or terminate access for breach of these Terms, non-payment, or suspected fraudulent/abusive use.
              You may cancel your subscription at any time from account settings; access continues until the end of the paid
              period.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">8. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind, to the maximum extent permitted by law. To the
              maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising
              from your use of the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes take effect constitutes
              acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">10. Governing Law</h2>
            <p>These Terms are governed by the laws of the Republic of Indonesia.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">11. Contact Us</h2>
            <p>
              Questions about these Terms can be sent to{" "}
              <a href="mailto:dev@divine.co.id" className="text-brand-primary hover:underline">dev@divine.co.id</a>.
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
        <Link href="/data-deletion" className="hover:text-foreground">Data Deletion</Link>
      </footer>
    </div>
  );
}
