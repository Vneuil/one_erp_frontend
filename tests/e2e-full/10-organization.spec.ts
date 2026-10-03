import { test, expect } from "@playwright/test";
import { admin, spv, kasir, state } from "./world";
import { loginViaUi } from "./ui";

test.describe.configure({ mode: "serial" });

test.describe("organization structure", () => {
  const ids: Record<string, string> = {};

  test("reporting lines: set, reject self and circular, reject unknown", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    const { client: k } = await kasir();
    await s.get("/hrm/employees");
    await k.get("/hrm/employees"); // members become employees on first use
    const list = (await a.get<any[]>("/hrm/employees", { perPage: "200" })).body.data;
    const by = (email: string) => list.find((e: any) => e.email?.toLowerCase() === email.toLowerCase());
    ids.boss = by(state().adminEmail).id;
    ids.mid = by(state().spvEmail).id;
    ids.low = by(state().kasirEmail).id;

    expect((await a.put(`/hrm/employees/${ids.mid}`, { managerId: ids.boss })).ok).toBeTruthy();
    const r = await a.put(`/hrm/employees/${ids.low}`, { managerId: ids.mid });
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    expect(r.body.data.managerId).toBe(ids.mid);

    expect((await a.put(`/hrm/employees/${ids.low}`, { managerId: ids.low })).status).toBe(400);
    expect((await a.put(`/hrm/employees/${ids.boss}`, { managerId: ids.low })).status).toBe(400); // would loop
    expect((await a.put(`/hrm/employees/${ids.low}`, { managerId: "00000000-0000-4000-8000-000000000000" })).status).toBe(400);
    expect((await a.put(`/hrm/employees/${ids.low}`, { managerId: "nope" })).status).toBe(400);
  });

  test("the organization tree nests and counts teams", async () => {
    const { client: a } = await admin();
    const org = (await a.get<any>("/hrm/organization")).body.data;
    const top = org.roots.find((n: any) => n.id === ids.boss);
    expect(top).toBeTruthy();
    expect(top.directReports).toBe(1);
    expect(top.teamSize).toBe(2);
    expect(top.children[0].id).toBe(ids.mid);
    expect(top.children[0].children[0].id).toBe(ids.low);
  });

  test("clearing the manager moves the person to the top, and the chart page shows the tree", async ({ page }) => {
    const { client: a } = await admin();
    expect((await a.put(`/hrm/employees/${ids.low}`, { managerId: "" })).ok).toBeTruthy();
    const org = (await a.get<any>("/hrm/organization")).body.data;
    expect(org.roots.some((n: any) => n.id === ids.low)).toBe(true);
    await a.put(`/hrm/employees/${ids.low}`, { managerId: ids.mid });

    await loginViaUi(page, state().adminEmail);
    await page.goto("/hrm/organization");
    await expect(page.getByText("Struktur Organisasi").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("li").first()).toBeVisible();
  });
});
