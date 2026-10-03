"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function IncidentForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true); setError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch("/incident-response-policy/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(fields), consent: fields.get("consent") === "on" }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || typeof result.id !== "string") throw new Error(result.error || "Unable to submit. Please try again.");
      setReference(result.id); form.reset();
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Delivery could not be confirmed. Contact dev@divine.co.id before resubmitting to avoid duplicates.");
    } finally { clearTimeout(timer); setBusy(false); }
  }
  const input = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand-primary";
  return (
    <section id="report-incident" className="scroll-mt-20 rounded-xl border border-border bg-slate-50/60 p-5 sm:p-6 space-y-4">
      <h2 className="text-xl font-bold">Submit an incident</h2>
      <p className="text-sm">Reports are saved in our restricted incident register. Email notifications are not currently enabled. For urgent incidents, also contact <a className="text-brand-primary underline" href="mailto:dev@divine.co.id">dev@divine.co.id</a>.</p>
      <p className="text-sm text-muted-foreground">Describe what happened, when you noticed it (including time zone), the affected service, and any safe steps already taken. Do not include passwords, access tokens, payment details, or unnecessary personal data.</p>
      {reference ? <div role="status" className="space-y-3 text-sm"><p className="font-bold">Your report has been saved.</p><p>Keep this reference for follow-up: <strong className="break-all">{reference}</strong></p><p>This confirms receipt, not that investigation has started. No confirmation email has been sent.</p><Button type="button" variant="outline" onClick={() => setReference("")}>Submit another incident</Button></div> :
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <legend className="sr-only">Incident details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Name *<input className={input} name="name" autoComplete="name" required maxLength={120} /></label>
            <label className="text-sm font-medium">Contact email *<input className={input} name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          </div>
          <label className="block text-sm font-medium">Affected service or company *<input className={input} name="service" required maxLength={200} /></label>
          <label className="block text-sm font-medium">Suspected severity *<select className={input} name="severity" defaultValue="unsure"><option value="unsure">Unsure — please assess</option><option value="critical">Critical — active compromise or major exposure</option><option value="high">High — significant impact</option><option value="medium">Medium — limited impact</option><option value="low">Low — minor concern</option></select></label>
          <label className="block text-sm font-medium">Summary *<input className={input} name="summary" required minLength={5} maxLength={200} /></label>
          <label className="block text-sm font-medium">Incident details *<textarea className={input} name="details" required minLength={20} maxLength={6000} rows={6} /><span className="text-xs font-normal text-muted-foreground">20–6,000 characters. Include time and time zone if known.</span></label>
          <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" name="consent" required /><span>I understand that these details will be used to investigate and follow up on this report, as described in the <Link href="/privacy-policy" className="text-brand-primary underline">Privacy Policy</Link>. *</span></label>
          <Button type="submit" variant="gradient" disabled={busy}>{busy ? "Submitting…" : "Submit incident"}</Button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </form>}
    </section>
  );
}
