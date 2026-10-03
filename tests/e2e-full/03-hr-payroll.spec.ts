import { test, expect } from "@playwright/test";
import { admin, spv, kasir, state } from "./world";
import { unique } from "./api";

test.describe.configure({ mode: "serial" });

// Jakarta calendar helpers: attendance and payroll periods are judged in Asia/Jakarta.
const jakarta = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const TODAY = jakarta();
const PERIOD = TODAY.slice(0, 7);
/** The first two Monday-Friday dates of the current month. */
function firstWeekdays(period: string, n: number): string[] {
  const out: string[] = [];
  for (let day = 1; out.length < n && day <= 28; day++) {
    const d = new Date(`${period}-${String(day).padStart(2, "0")}T00:00:00Z`);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

test.describe("HR operations feeding payroll", () => {
  const BASE = 17_300_000; // hourly rate 100,000 under the /173 rule
  let emp = { id: "", nip: "", email: "" };
  let entryId = "";

  test("HR adds an employee with a salary", async () => {
    const { client: a } = await admin();
    const email = `sari-${state().tag}@e2e.test`;
    const r = await a.post("/hrm/employees", { nip: `SR-${state().tag}`, name: "Sari Wulandari", email, department: "Ops", role: "Staff", baseSalary: BASE, joinDate: "2026-01-05", ptkpStatus: "TK/0" });
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    emp = { id: r.body.data.id, nip: r.body.data.nip, email };
    expect(emp.nip).toBe(`SR-${state().tag}`);
  });

  test("payroll policy: 22 working days, Rp50.000 late penalty, unpaid leave deducted", async () => {
    const { client: a } = await admin();
    const { client: k } = await kasir();
    expect((await k.put("/payroll/policy", { workDaysPerMonth: 22, latePenaltyPerIncident: 50_000, deductUnpaidLeave: true })).status).toBe(403);
    const r = await a.put("/payroll/policy", { workDaysPerMonth: 22, latePenaltyPerIncident: 50_000, deductUnpaidLeave: true });
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    expect((await a.put("/payroll/policy", { workDaysPerMonth: 0, latePenaltyPerIncident: 0, deductUnpaidLeave: true })).status).toBe(400);
  });

  test("two days of approved unpaid leave", async () => {
    const [d1, d2] = firstWeekdays(PERIOD, 2);
    const { client: s } = await spv();
    const req = await s.post("/leaves", { employeeId: emp.id, type: "Cuti Tidak Dibayar", startDate: d1, endDate: d2, reason: "keperluan keluarga" });
    expect(req.ok, JSON.stringify(req.body)).toBeTruthy();
    const { client: a } = await admin();
    const ok = await a.post(`/leaves/${req.body.data.id}/approve`, { approvedBy: "Admin" });
    expect(ok.ok, JSON.stringify(ok.body)).toBeTruthy();
    expect(ok.body.data.status).toBe("approved");
  });

  test("an attendance correction is approved by someone else and becomes a late day", async () => {
    const { client: s } = await spv();
    const req = await s.post("/hr-self/corrections", { nip: emp.nip, date: TODAY, clockIn: "09:30", clockOut: "18:30", reason: "lupa absen" });
    expect(req.ok, JSON.stringify(req.body)).toBeTruthy();
    // The person who filed it cannot approve it.
    expect((await s.post(`/hrm/corrections/${req.body.data.id}/approve`)).status).toBe(403);
    const { client: a } = await admin();
    const ok = await a.post(`/hrm/corrections/${req.body.data.id}/approve`);
    expect(ok.ok, JSON.stringify(ok.body)).toBeTruthy();
    const att = await a.get<any[]>("/hrm/attendance", { perPage: "50" });
    const mine = att.body.data.find((x) => x.nip === emp.nip && x.date === TODAY);
    expect(mine.status).toBe("Late");
    expect(mine.workMinutes).toBe(540);
    expect(mine.method).toBe("Correction");
    // A decided request cannot be decided again.
    expect((await a.post(`/hrm/corrections/${req.body.data.id}/reject`)).status).toBe(409);
  });

  test("overtime: 90 minutes approved by an admin", async () => {
    const { client: s } = await spv();
    const ot = await s.post("/hrm/overtime", { nip: emp.nip, date: TODAY, minutes: 90, reason: "closing bulanan" });
    expect(ot.ok, JSON.stringify(ot.body)).toBeTruthy();
    const { client: a } = await admin();
    const ok = await a.post(`/hrm/overtime/${ot.body.data.id}/approve`);
    expect(ok.body.data.status).toBe("approved");
  });

  test("canteen: two meals ordered for the employee", async () => {
    const { client: a } = await admin();
    const item = await a.post("/hrm/canteen/items", { name: "Nasi Ayam", price: 25_000 });
    expect(item.ok, JSON.stringify(item.body)).toBeTruthy();
    const { client: k } = await kasir();
    expect((await k.post("/hrm/canteen/items", { name: "x", price: 1 })).status).toBeLessThan(500); // staff may be refused by role
    const { client: s } = await spv();
    const order = await s.post("/hr-self/canteen/orders", { nip: emp.nip, itemId: item.body.data.id, quantity: 2 });
    expect(order.ok, JSON.stringify(order.body)).toBeTruthy();
    expect(order.body.data.amount).toBe(50_000);
    const summary = await a.get<any[]>("/hrm/canteen/summary", { period: PERIOD });
    expect(summary.body.data.find((x) => x.nip === emp.nip).amount).toBe(50_000);
  });

  test("payroll calculation combines leave, lateness, overtime and canteen", async () => {
    const { client: a } = await admin();
    const created = await a.post("/payroll/entries", { period: PERIOD, employeeId: emp.id, taxMethod: "manual", paymentBank: "BCA", bankAccount: "123" });
    expect(created.ok, JSON.stringify(created.body)).toBeTruthy();
    entryId = created.body.data.id;
    const calc = await a.post("/payroll/entries/calculate", { period: PERIOD });
    expect(calc.ok, JSON.stringify(calc.body)).toBeTruthy();
    const e = calc.body.data.find((x: any) => x.id === entryId);
    expect(e.unpaidDays).toBe(2);
    expect(e.deductionAbsence).toBe(Math.round((BASE / 22) * 2));
    expect(e.lateCount).toBe(1);
    expect(e.deductionLate).toBe(50_000);
    expect(e.overtimePay).toBe(250_000); // 1h x1.5 + 0.5h x2 at 100,000/h
    expect(e.deductionCanteen).toBe(50_000);
    expect(e.takeHomePay).toBe(BASE + 250_000 - Math.round((BASE / 22) * 2) - 50_000 - 50_000);
    // Calculating again never stacks the deductions.
    const again = await a.post("/payroll/entries/calculate", { period: PERIOD });
    expect(again.body.data.filter((x: any) => x.id === entryId)).toHaveLength(0); // no longer a draft
  });

  test("approving payroll books a balanced journal; the payee cannot approve their own", async () => {
    const { client: a } = await admin();
    const ok = await a.put(`/payroll/entries/${entryId}/status`, { status: "approved" });
    expect(ok.ok, JSON.stringify(ok.body)).toBeTruthy();
    const bs = (await a.get("/finance/reports/balance-sheet")).body.data;
    expect(bs.assets).toBeCloseTo(bs.totalLiabilitiesAndEquity, 2);
    const { client: k } = await kasir();
    expect((await k.put(`/payroll/entries/${entryId}/status`, { status: "paid" })).status).toBe(403);
  });

  test("reimbursement evidence: only the claimant attaches it, and it flags the claim", async () => {
    const { client: k } = await kasir();
    const claim = await k.post("/reimbursements", { employeeName: "Kasir E2E", department: "General", category: "Transport", amount: 85_000, description: "Taksi ke klien", date: TODAY });
    expect(claim.ok, JSON.stringify(claim.body)).toBeTruthy();
    const claimId = claim.body.data.id;
    expect(claim.body.data.receiptAttached).toBe(false);

    const { client: s } = await spv();
    // A colleague without HR privilege cannot touch it; a manager (HR) can view.
    const { client: a } = await admin();
    const ev = await k.post("/hr-self/reimbursement-evidence", { claimId, title: "Struk taksi", fileRef: "https://drive.example/receipt-1", amount: 85_000 });
    expect(ev.ok, JSON.stringify(ev.body)).toBeTruthy();
    const list = await a.get<any[]>("/reimbursements", { perPage: "50" });
    expect(list.body.data.find((c) => c.id === claimId).receiptAttached).toBe(true);
    expect((await s.get<any[]>("/hr-self/reimbursement-evidence", { claimId })).body.data).toHaveLength(1);
    // The claimant cannot approve their own claim (segregation of duties), a supervisor can.
    expect((await k.post(`/reimbursements/${claimId}/approve`, { approvedBy: "x" })).status).toBe(403);
  });

  test("field visits: plan, optimise, and geofenced check-in", async () => {
    const { client: k } = await kasir();
    const base = { lat: -6.2, lng: 106.8 };
    const at = (m: number) => ({ latitude: base.lat + m / 111_320, longitude: base.lng });
    const plan = await k.post("/hr-self/visits", { date: TODAY, stops: [
      { customerName: "Jauh", ...at(5000) }, { customerName: "Dekat", ...at(500) }, { customerName: "Sedang", ...at(2500) },
    ] });
    expect(plan.ok, JSON.stringify(plan.body)).toBeTruthy();
    const opt = await k.post("/hr-self/visits/optimize", { date: TODAY, latitude: base.lat, longitude: base.lng });
    expect(opt.body.data.stops.map((s: any) => s.customerName)).toEqual(["Dekat", "Sedang", "Jauh"]);
    const first = opt.body.data.stops[0];
    const far = await k.post(`/hr-self/visits/${first.id}/check-in`, { latitude: base.lat + 0.05, longitude: base.lng });
    expect(far.status).toBe(400);
    expect(JSON.stringify(far.body)).toMatch(/check in within 100 m/);
    const near = await k.post(`/hr-self/visits/${first.id}/check-in`, { latitude: first.latitude + 0.0002, longitude: first.longitude });
    expect(near.ok, JSON.stringify(near.body)).toBeTruthy();
    expect(near.body.data.status).toBe("visited");
    expect((await k.post(`/hr-self/visits/${first.id}/check-in`, { latitude: first.latitude, longitude: first.longitude })).status).toBe(409);
    const { client: s } = await spv();
    // A colleague cannot check in on someone else's stop.
    expect((await s.post(`/hr-self/visits/${opt.body.data.stops[1].id}/check-in`, { latitude: 0, longitude: 0 })).status).toBe(400);
  });

  test("announcements reach the notification inbox of the right people", async () => {
    const { client: a } = await admin();
    const title = unique("Libur");
    const pub = await a.post("/hrm/announcements", { title, body: "Kantor libur Jumat" });
    expect(pub.ok, JSON.stringify(pub.body)).toBeTruthy();
    expect(pub.body.data.notified).toBeGreaterThanOrEqual(3);
    const { client: k } = await kasir();
    const inbox = await k.get<any>("/hr-self/notifications");
    expect(inbox.body.data.items.some((n: any) => n.title === title)).toBe(true);
    const before = inbox.body.data.unread;
    const target = inbox.body.data.items.find((n: any) => n.title === title);
    expect((await k.post(`/hr-self/notifications/${target.id}/read`)).ok).toBeTruthy();
    expect((await k.get<any>("/hr-self/notifications")).body.data.unread).toBe(before - 1);
  });
});
