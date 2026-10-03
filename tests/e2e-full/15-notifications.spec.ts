import { test, expect } from "@playwright/test";
import { admin, spv, kasir, state } from "./world";
import { loginViaUi } from "./ui";

test.describe.configure({ mode: "serial" });

const jakarta = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const TODAY = jakarta();

const inbox = async (c: any) => (await c.get("/hr-self/notifications")).body.data as { items: any[]; unread: number };
const titles = (n: { items: any[] }) => n.items.map((i) => i.title);

// The cashier manages the supervisor; the supervisor's requests should reach the cashier,
// and the cashier's decisions should reach the supervisor.
test.describe("notifications triggered by other modules", () => {
  const ids: Record<string, string> = {};
  let overtimeId = "";
  let leaveId = "";

  test("set up the reporting line", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    const { client: k } = await kasir();
    await s.get("/hrm/employees");
    await k.get("/hrm/employees");
    const list = (await a.get<any[]>("/hrm/employees", { perPage: "200" })).body.data;
    const by = (email: string) => list.find((e: any) => e.email?.toLowerCase() === email.toLowerCase());
    ids.mid = by(state().spvEmail).id;
    ids.low = by(state().kasirEmail).id;
    expect((await a.put(`/hrm/employees/${ids.low}`, { managerId: "" })).ok).toBeTruthy();
    expect((await a.put(`/hrm/employees/${ids.mid}`, { managerId: ids.low })).ok).toBeTruthy();
  });

  test("a request notifies the manager", async () => {
    const { client: s } = await spv();
    const { client: k } = await kasir();
    const before = (await inbox(k)).items.length;
    const ot = await s.post("/hr-self/overtime", { date: TODAY, minutes: 60, reason: "Stok opname" });
    overtimeId = ot.body.data.id;
    const d = new Date(Date.now() + 40 * 864e5);
    const lv = await s.post("/leaves", { employeeId: ids.mid, type: "Cuti Sakit", startDate: jakarta(d), endDate: jakarta(d), reason: "Kontrol" });
    expect(lv.ok, JSON.stringify(lv.body)).toBeTruthy();
    leaveId = lv.body.data.id;
    const n = await inbox(k);
    expect(n.items.length).toBe(before + 2);
    expect(titles(n)).toEqual(expect.arrayContaining(["Lembur baru", "Cuti baru"]));
    expect(n.items.find((i) => i.title === "Lembur baru").link).toBe("/hrm/team-approvals");
    expect(n.unread).toBeGreaterThanOrEqual(2);
  });

  test("the decision notifies the employee, with the right verdict", async () => {
    const { client: s } = await spv();
    const { client: k } = await kasir();
    expect((await k.post(`/hr-self/team/overtime/${overtimeId}/reject`)).ok).toBeTruthy();
    expect((await k.post(`/hr-self/team/leave/${leaveId}/approve`)).ok).toBeTruthy();
    const n = await inbox(s);
    expect(titles(n)).toEqual(expect.arrayContaining(["Lembur ditolak", "Cuti disetujui"]));
    // Nobody else was told about the supervisor's decisions.
    const { client: a } = await admin();
    expect(titles(await inbox(a))).not.toContain("Lembur ditolak");
  });

  test("an approved payslip notifies the employee", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    const period = "2026-08";
    expect((await a.put(`/hrm/employees/${ids.mid}`, { baseSalary: 8_000_000 })).ok).toBeTruthy();
    const entry = await a.post("/payroll/entries", { period, employeeId: ids.mid, taxMethod: "manual", paymentBank: "BCA", bankAccount: "555" });
    expect(entry.ok, JSON.stringify(entry.body)).toBeTruthy();
    expect((await a.post("/payroll/entries/calculate", { period })).ok).toBeTruthy();
    expect((await a.put(`/payroll/entries/${entry.body.data.id}/status`, { status: "approved" })).ok).toBeTruthy();
    const item = (await inbox(s)).items.find((i) => i.title === "Slip gaji tersedia");
    expect(item, JSON.stringify(titles(await inbox(s)))).toBeTruthy();
    expect(item.body).toContain(period);
    expect(item.link).toBe("/hrm/my-payslips");
  });

  test("the header bell shows the unread count and clears it when opened", async ({ page }) => {
    await loginViaUi(page, state().spvEmail);
    const bell = page.getByRole("button", { name: /Notifikasi|Notifications/ });
    await expect(bell).toContainText(/\d/, { timeout: 20_000 });
    await bell.click();
    await expect(page.getByText("Cuti disetujui").first()).toBeVisible();
    await page.getByRole("button", { name: /Tandai dibaca|Mark all read/ }).click();
    await expect.poll(async () => (await inbox((await spv()).client)).unread).toBe(0);
  });
});
