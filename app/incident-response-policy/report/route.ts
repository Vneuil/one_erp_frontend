import { randomUUID } from "node:crypto";
import { mkdir, open } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
const MAX_BYTES = 16_384;
const severities = new Set(["critical", "high", "medium", "low", "unsure"]);
const quota = { start: 0, count: 0 };
const reply = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const origin = process.env.INCIDENT_REPORT_ORIGIN || "https://one.divine.co.id";
  if (request.headers.get("origin") !== origin) return reply(403, "Please submit using the form on ONE ERP.");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, "JSON is required.");
  if (Number(request.headers.get("content-length")) > MAX_BYTES) return reply(413, "Report is too large.");
  let data: Record<string, unknown>;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400, "Report is required.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); return reply(413, "Report is too large."); }
      chunks.push(value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(400, "Invalid report.");
    data = parsed as Record<string, unknown>;
  } catch { return reply(400, "Invalid report."); }
  const field = (key: string) => typeof data[key] === "string" ? (data[key] as string).trim() : "";
  const name = field("name"), email = field("email"), service = field("service"), summary = field("summary"), details = field("details"), severity = field("severity");
  if (field("website")) return reply(400, "Unable to accept this report.");
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !service || service.length > 200 || summary.length < 5 || summary.length > 200 || details.length < 20 || details.length > 6000 || !severities.has(severity) || data.consent !== true) {
    return reply(400, "Check the required fields and length limits, then try again.");
  }
  const directory = process.env.INCIDENT_REPORT_DIR;
  if (!directory || !path.isAbsolute(directory)) return reply(503, "Reporting is temporarily unavailable. Please contact dev@divine.co.id.");
  const now = Date.now();
  if (now - quota.start >= 15 * 60_000) { quota.start = now; quota.count = 0; }
  if (quota.count >= 30) return reply(429, "Reporting is busy. Please try later or contact dev@divine.co.id.");
  quota.count++;
  const id = `INC-${randomUUID()}`;
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const file = await open(path.join(directory, `${id}.json`), "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify({ id, receivedAt: new Date(now).toISOString(), status: "new", name, email, service, summary, details, severity, consent: true }, null, 2));
      await file.sync();
    } finally { await file.close(); }
    return Response.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply(503, "We could not save your report. Please retry or contact dev@divine.co.id.");
  }
}
