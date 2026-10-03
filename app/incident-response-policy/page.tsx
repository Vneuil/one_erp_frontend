import IncidentForm from "./incident-form";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Incident Response Policy — ONE ERP",
  description: "Incident response roles, responsibilities, and reporting procedure for PT Digital Ventura Integrasi and ONE ERP.",
  robots: { index: false, follow: false },
};

export default function IncidentResponsePolicyPage() {
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
          <h1 className="text-3xl font-black tracking-tight">Incident Response Policy</h1>
          <p className="text-xs text-muted-foreground">Effective date: September 12, 2026</p>
        </div>
        <p className="text-sm"><a href="#report-incident" className="text-brand-primary underline font-semibold">Report an incident using the form below</a> or contact <a href="mailto:dev@divine.co.id" className="text-brand-primary underline">dev@divine.co.id</a>.</p>
        <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">1. Purpose &amp; Scope</h2>
            <p>This policy defines how PT Digital Ventura Integrasi personnel must prepare for, report, assess, contain, investigate, recover from, and review security incidents affecting ONE ERP. It covers suspected or confirmed unauthorized access, personal data exposure, malware, credential compromise, service disruption, and incidents involving suppliers or connected marketplaces. Incident records must distinguish confirmed facts from assumptions.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">2. Roles &amp; Responsibilities</h2>
            <p>Management must assign these functions to named personnel and maintain the private contact roster. One person may hold multiple roles where appropriate, with independent review for significant decisions. This policy does not identify the privacy owner as a formally appointed DPO.</p><dl className="space-y-3">
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">Management / executive sponsor</dt><dd className="mt-1">Appoint primary and backup responders; authorize resources, major service interruptions, external communications, and documented risk acceptance.</dd></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">Incident lead</dt><dd className="mt-1">Own the incident from escalation to closure; direct containment and investigation, assign actions, maintain status updates, and approve restoration with the system owner.</dd></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">Security coordinator / intake owner</dt><dd className="mt-1">Review reports and the restricted incident register, maintain the case timeline, assess severity, assign the lead, track deadlines, and escalate unresolved or overdue actions.</dd></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">Engineering &amp; operations</dt><dd className="mt-1">Preserve technical evidence, investigate scope and cause, contain threats under the lead’s direction, implement fixes, restore systems, and verify remediation.</dd></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">System / business owner</dt><dd className="mt-1">Identify service and customer impact, support access and recovery decisions, verify business functions, and own corrective actions for the affected service.</dd></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">Privacy owner</dt><dd className="mt-1">Assess personal data impact and notification requirements, coordinate with customers and platform partners, and define lawful handling and retention of incident records.</dd></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">Communications owner</dt><dd className="mt-1">Prepare approved internal and external updates, coordinate recipient lists and delivery, and keep a communication record without exposing unnecessary sensitive details.</dd></div>
              <div className="rounded-xl border border-border bg-slate-50/60 p-4"><dt className="font-bold text-brand-primary">All personnel &amp; contractors</dt><dd className="mt-1">Immediately report suspected incidents, preserve evidence, follow authorized response instructions, and avoid independent actions that could worsen impact or compromise evidence.</dd></div>
            </dl>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">3. Preparation &amp; Reporting</h2>
            <p>Management must maintain a restricted on-call and escalation roster identifying the current primary and backup for each role, with contact details and authority to act. The security coordinator must maintain an asset inventory, response runbooks, recovery plans, and access to necessary investigation tools. Personnel must report suspected incidents immediately through the form below or dev@divine.co.id, without waiting for complete evidence. The coordinator must review the incident register at least each business day. Form submission records a report but does not page an on-call responder; urgent reports must also be escalated through the designated internal contact roster or the email channel.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">4. Assessment &amp; Severity</h2>
            <p>The security coordinator must record the time received, reporter, affected systems and data, observed impact, evidence, severity, owner, and next action. Initial severity may change as evidence develops. Critical incidents include active compromise, widespread disruption, or credible major exposure of sensitive data; escalate immediately to the incident lead and management. High incidents have significant impact and require same-day escalation. Medium and Low reports require triage within one business day. Acknowledge reports within two business days. These are response targets and must be tracked in the incident record.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">5. Containment &amp; Evidence</h2>
            <p>The incident lead must coordinate proportionate containment, such as isolating affected resources, restricting access, disabling an integration, or revoking exposed credentials. Consider customer impact and preserve evidence before destructive actions where feasible. Engineering must securely collect relevant logs and system information, record source and collection time, maintain evidence integrity and access history, and avoid unnecessary copying of personal data. Store evidence in restricted locations and preserve it under documented retention or investigation requirements.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">6. Investigation &amp; Eradication</h2>
            <p>Engineering and operations must determine the entry point, affected assets and accounts, extent of access, persistence mechanisms, and likely root cause. Separate observations from unverified hypotheses and maintain a timeline. Remove malicious components, close exploited weaknesses, rotate affected credentials, and coordinate with providers when needed. Link vulnerability remediation to the findings register and record the changes made. The incident lead must track unresolved risks and dependencies.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">7. Communication &amp; Personal Data Breaches</h2>
            <p>The privacy owner must assess affected data categories, individuals, customers, processing roles, and contractual and legal notification requirements with management and appropriate advisers. Do not wait for a complete root-cause analysis before assessing notification deadlines. Notify affected sellers, TikTok Shop, customers, authorities, and individuals when required, within applicable deadlines. Communications must identify confirmed scope and impact, measures taken, recommended actions, and a contact channel, with updates as facts develop. The communications owner must keep a record of recipients, approval, timing, content, and reasons for notification decisions. Personnel must not make unauthorized external statements.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">8. Recovery &amp; Service Restoration</h2>
            <p>System owners and engineering must restore service from trusted sources, verify remediations, confirm access restrictions, and test critical functions and data integrity. Reapply applicable deletion instructions after restoring backups. The incident lead must approve restoration with the system owner, record remaining risks, and agree enhanced monitoring and rollback conditions. Management must approve any significant residual risk or material business interruption.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">9. Closure &amp; Lessons Learned</h2>
            <p>The incident lead must confirm recovery, required communications, evidence preservation, and assignment of remaining corrective actions before closure. Complete a post-incident review within ten business days of recovery for Critical and High incidents, and proportionately for other incidents. Record root cause, impact, response timeline, lessons, owners, and deadlines. Track corrective actions to verified completion; reopening may be necessary if compromise recurs or material new evidence appears.</p>
          </section>
          <section className="space-y-2"><h2 className="text-lg font-bold text-foreground">10. Records, Exercises &amp; Review</h2>
            <p>Incident reports contain confidential information and must be accessible only to authorized responders. The privacy owner must define retention and disposal requirements for reports and evidence, including documented legal preservation exceptions. Management must assign access and ensure the incident register is reviewed. Conduct a response exercise at least annually and after material changes where appropriate. Review this policy at least annually and after significant incidents, document changes, and communicate relevant responsibilities to personnel.</p>
          </section>
          <p>Related policies: <Link href="/security-policy" className="text-brand-primary underline">Information Security</Link>, <Link href="/data-classification-policy" className="text-brand-primary underline">Data Classification</Link>, <Link href="/vulnerability-threat-management-procedure" className="text-brand-primary underline">Vulnerability &amp; Threat Management</Link>, and <Link href="/internal-personal-data-protection-policy" className="text-brand-primary underline">Personal Data Protection</Link>.</p>
        </div>
        <IncidentForm />
      </main>
      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">© 2026 PT Digital Ventura Integrasi · ONE ERP</footer>
    </div>
  );
}
