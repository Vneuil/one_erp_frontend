import { test, expect } from "@playwright/test";
import { admin, spv, kasir, state } from "./world";

test.describe.configure({ mode: "serial" });

const jakarta = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const PERIOD = jakarta().slice(0, 7);

// The cashier is a plain staff member with no HR approval right. Making them the
// line manager of the supervisor proves approval follows the reporting line, not the role.
test.describe("approval by the requester's line manager", () => {
  const ids: Record<string, string> = {};
  let advanceId = "";
  let overtimeId = "";
  let leaveId = "";

  test("set up: the cashier becomes the supervisor's manager", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    const { client: k } = await kasir();
    await s.get("/hrm/employees");
    await k.get("/hrm/employees");
    const list = (await a.get<any[]>("/hrm/employees", { perPage: "200" })).body.data;
    const by = (email: string) => list.find((e: any) => e.email?.toLowerCase() === email.toLowerCase());
    ids.boss = by(state().adminEmail).id;
    ids.mid = by(state().spvEmail).id;
    ids.low = by(state().kasirEmail).id;
    expect((await a.put(`/hrm/employees/${ids.low}`, { managerId: "" })).ok).toBeTruthy();
    expect((await a.put(`/hrm/employees/${ids.mid}`, { managerId: ids.low })).ok).toBeTruthy();
    // The cashier has no HR approval right on the HR routes.
    expect([401, 403]).toContain((await k.post(`/hrm/overtime/${ids.low}/approve`)).status);
  });

  test("the supervisor files three requests", async () => {
    const { client: s } = await spv();
    const adv = await s.post("/hr-self/cash-advances", { amount: 600_000, installments: 2, startPeriod: PERIOD });
    expect(adv.ok, JSON.stringify(adv.body)).toBeTruthy();
    advanceId = adv.body.data.id;
    const ot = await s.post("/hr-self/overtime", { date: jakarta(), minutes: 90, reason: "Closing" });
    expect(ot.ok, JSON.stringify(ot.body)).toBeTruthy();
    overtimeId = ot.body.data.id;
    const d = new Date(Date.now() + 20 * 864e5);
    const lv = await s.post("/leaves", { employeeId: ids.mid, type: "Cuti Sakit", startDate: jakarta(d), endDate: jakarta(d), reason: "Cek kesehatan" });
    expect(lv.ok, JSON.stringify(lv.body)).toBeTruthy();
    leaveId = lv.body.data.id;
  });

  test("only the manager sees them in the team inbox", async () => {
    const { client: k } = await kasir();
    const inbox = (await k.get<any>("/hr-self/team/requests")).body.data;
    expect(inbox.advances.map((x: any) => x.id)).toContain(advanceId);
    expect(inbox.overtime.map((x: any) => x.id)).toContain(overtimeId);
    expect(inbox.leaves.map((x: any) => x.id)).toContain(leaveId);
    expect(inbox.total).toBeGreaterThanOrEqual(3);
    const { client: s } = await spv();
    expect((await s.get<any>("/hr-self/team/requests")).body.data.total).toBe(0); // the supervisor manages nobody
  });

  test("outsiders and the requester cannot decide through the team route", async () => {
    const { client: s } = await spv();
    expect((await s.post(`/hr-self/team/cash-advance/${advanceId}/approve`)).status).toBe(403); // own request
    expect((await s.post(`/hr-self/team/overtime/${overtimeId}/approve`)).status).toBe(403);
    expect((await s.post(`/hr-self/team/leave/${leaveId}/approve`)).status).toBe(403);
    const { client: k } = await kasir();
    expect((await k.post(`/hr-self/team/bogus/${advanceId}/approve`)).status).toBe(400);
  });

  test("the line manager approves, rejects and the effects apply", async () => {
    const { client: k } = await kasir();
    const adv = await k.post(`/hr-self/team/cash-advance/${advanceId}/approve`);
    expect(adv.ok, JSON.stringify(adv.body)).toBeTruthy();
    const ot = await k.post(`/hr-self/team/overtime/${overtimeId}/reject`);
    expect(ot.ok, JSON.stringify(ot.body)).toBeTruthy();
    const lv = await k.post(`/hr-self/team/leave/${leaveId}/approve`);
    expect(lv.ok, JSON.stringify(lv.body)).toBeTruthy();

    const { client: a } = await admin();
    const advances = (await a.get<any[]>("/hrm/cash-advances")).body.data;
    const mine = advances.find((x: any) => x.id === advanceId);
    expect(mine.status).toBe("approved");
    expect(mine.decidedBy.toLowerCase()).toBe(state().kasirEmail.toLowerCase());
    const leaves = (await a.get<any[]>("/leaves", { perPage: "100" })).body.data;
    expect(leaves.find((x: any) => x.id === leaveId).status).toBe("approved");
    // Decided requests leave the inbox and cannot be decided twice.
    const inbox = (await k.get<any>("/hr-self/team/requests")).body.data;
    expect(inbox.total).toBe(0);
    expect((await k.post(`/hr-self/team/cash-advance/${advanceId}/approve`)).status).toBe(409);
  });
});
