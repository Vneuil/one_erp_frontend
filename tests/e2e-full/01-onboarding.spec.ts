import { test, expect } from "@playwright/test";
import { admin, spv, kasir, state } from "./world";

test.describe("company setup and automatic onboarding", () => {
  test("every member gets an employee record the first time they use the app", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    const { client: k } = await kasir();
    // Members only exist as employees after their first authenticated tenant request.
    for (const c of [s, k]) expect((await c.get("/hrm/employees")).ok).toBeTruthy();

    const list = await a.get<any[]>("/hrm/employees", { perPage: "100" });
    expect(list.ok).toBeTruthy();
    const emails = list.body.data.map((e) => e.email.toLowerCase());
    for (const e of [state().adminEmail, state().spvEmail, state().kasirEmail]) expect(emails).toContain(e);
    const owner = list.body.data.find((e) => e.email.toLowerCase() === state().adminEmail);
    expect(owner.department).toBe("Management");
    expect(owner.baseSalary).toBe(0);
    // No duplicates even after repeated first requests.
    expect(emails.length).toBe(new Set(emails).size);
  });

  test("a new company starts empty (no demo data)", async () => {
    const { client: a } = await admin();
    const customers = await a.get<any[]>("/customers", { perPage: "10" });
    expect(customers.ok).toBeTruthy();
    expect(customers.body.data.length).toBe(0);
    const leads = await a.get<any[]>("/crm/leads");
    expect(leads.body.data.length).toBe(0);
  });

  test("the default pipeline stages and chart of accounts exist", async () => {
    const { client: a } = await admin();
    const stages = await a.get<any[]>("/crm/stages");
    expect(stages.body.data.map((s) => s.key)).toEqual(["discovery", "quotation", "negotiation", "won", "lost"]);
    const accounts = await a.get<any[]>("/finance/accounts", { perPage: "200" });
    expect(accounts.body.data.map((x) => x.code)).toEqual(expect.arrayContaining(["1000", "1100", "2000", "3000", "4000", "5000"]));
  });
});
