import { test, expect, request } from "@playwright/test";
import { admin, spv, kasir, state } from "./world";
import { API, unique } from "./api";

test.describe.configure({ mode: "serial" });

test.describe("CRM: pipeline, follow-up, public lead form", () => {
  let dealId = "";
  let leadId = "";

  test("deals default to the caller as owner, never a made-up name", async () => {
    const { client: s } = await spv();
    const lead = await s.post("/crm/leads", { name: "Rina", company: "CV Indo", email: "rina@indo.test", estimatedValue: 100_000_000 });
    expect(lead.ok, JSON.stringify(lead.body)).toBeTruthy();
    expect(lead.body.data.pic).toContain("spv-");
    leadId = lead.body.data.id;
    const deal = await s.post("/crm/deals", { title: "Rak gudang", customer: "CV Indo", value: 250_000_000, leadId });
    expect(deal.ok, JSON.stringify(deal.body)).toBeTruthy();
    expect(deal.body.data.pic).toContain("spv-");
    expect(deal.body.data.stage).toBe("discovery");
    dealId = deal.body.data.id;
  });

  test("losing a deal needs a reason; the analytics group the reasons", async () => {
    const { client: s } = await spv();
    const noReason = await s.patch(`/crm/deals/${dealId}/stage`, { stage: "lost" });
    expect(noReason.status).toBe(400);
    const made = await s.post("/crm/deals", { title: "Kalah 1", customer: "PT K1", value: 10_000_000 });
    const made2 = await s.post("/crm/deals", { title: "Kalah 2", customer: "PT K2", value: 20_000_000 });
    for (const [d, r] of [[made, "Harga terlalu tinggi"], [made2, " harga terlalu tinggi "]] as const) {
      const lost = await s.patch(`/crm/deals/${d.body.data.id}/stage`, { stage: "lost", lostReason: r });
      expect(lost.ok, JSON.stringify(lost.body)).toBeTruthy();
      expect(lost.body.data.closedAt).toBeTruthy();
    }
    const an = (await s.get("/crm/analytics")).body.data;
    expect(an.totals.lost).toBe(2);
    expect(an.lostReasons[0].count).toBe(2); // case and spacing variants merge
    expect(an.lostReasons[0].value).toBe(30_000_000);
    expect(an.funnel.map((f: any) => f.key)).toEqual(["discovery", "quotation", "negotiation", "won", "lost"]);
  });

  test("a custom stage joins the pipeline and validates deals", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    expect((await s.post("/crm/stages", { name: "Survey", probability: 40 })).status).toBe(403); // admin only
    const st = await a.post("/crm/stages", { name: "Site Survey", probability: 45 });
    expect(st.ok, JSON.stringify(st.body)).toBeTruthy();
    expect(st.body.data.key).toBe("site-survey");
    const moved = await s.patch(`/crm/deals/${dealId}/stage`, { stage: "site-survey" });
    expect(moved.body.data.probability).toBe(45);
    expect((await s.patch(`/crm/deals/${dealId}/stage`, { stage: "nonsense" })).status).toBe(400);
    // A stage a deal sits in cannot be deleted; the last won/lost stage cannot be deactivated.
    expect((await a.del(`/crm/stages/${st.body.data.id}`)).status).toBe(409);
    const stages = (await a.get<any[]>("/crm/stages")).body.data;
    const won = stages.find((x) => x.kind === "won");
    expect((await a.put(`/crm/stages/${won.id}`, { isActive: false })).status).toBe(400);
  });

  test("interactions, tasks with assignment notifications, tags and contacts", async () => {
    const { client: s } = await spv();
    const { client: k } = await kasir();
    const log = await s.post("/crm/interactions", { parentType: "deal", parentId: dealId, kind: "call", summary: "Bahas harga & termin" });
    expect(log.ok, JSON.stringify(log.body)).toBeTruthy();
    expect((await s.post("/crm/interactions", { parentType: "deal", parentId: dealId, kind: "telepathy", summary: "x" })).status).toBe(400);

    const task = await s.post("/crm/tasks", { title: "Kirim penawaran", dueDate: "2026-01-01", assigneeEmail: state().kasirEmail, parentType: "deal", parentId: dealId });
    expect(task.ok, JSON.stringify(task.body)).toBeTruthy();
    const inbox = (await k.get<any>("/hr-self/notifications")).body.data.items;
    expect(inbox.some((n: any) => n.title.includes("Kirim penawaran"))).toBe(true);
    const mine = (await k.get<any>("/crm/tasks/reminders")).body.data;
    expect(mine.overdue.some((t: any) => t.title === "Kirim penawaran")).toBe(true);
    // A stranger cannot complete it; the assignee can.
    const { client: a } = await admin();
    const done = await k.post(`/crm/tasks/${task.body.data.id}/done`);
    expect(done.body.data.status).toBe("done");
    expect(a).toBeTruthy();

    const tag = await s.post("/crm/tags", { name: unique("VIP"), color: "red" });
    expect(tag.ok, JSON.stringify(tag.body)).toBeTruthy();
    expect((await s.post("/crm/tags", { name: tag.body.data.name.toLowerCase(), color: "blue" })).status).toBe(409);
    expect((await s.put(`/crm/tags/${tag.body.data.id}/assign`, { parentType: "lead", parentId: leadId })).ok).toBeTruthy();
    expect((await s.get<any[]>("/crm/tagged", { parentType: "lead", parentId: leadId })).body.data).toHaveLength(1);

    const c1 = await s.post("/crm/contacts", { name: "Rina S", companyName: "CV Indo", isPrimary: true });
    const c2 = await s.post("/crm/contacts", { name: "Budi H", companyName: "cv indo", isPrimary: true });
    expect(c2.ok).toBeTruthy();
    const contacts = (await s.get<any[]>("/crm/contacts", { companyName: "CV Indo" })).body.data;
    expect(contacts.filter((c) => c.isPrimary)).toHaveLength(1);
    expect(c1.ok).toBeTruthy();
  });

  test("a won deal starts a project once", async () => {
    const { client: s } = await spv();
    expect((await s.post(`/crm/deals/${dealId}/start-project`)).status).toBe(409); // not won yet
    await s.patch(`/crm/deals/${dealId}/stage`, { stage: "won" });
    const p = await s.post(`/crm/deals/${dealId}/start-project`);
    expect(p.ok, JSON.stringify(p.body)).toBeTruthy();
    expect(p.body.data.projectCode).toMatch(/^PRJ-/);
    expect((await s.post(`/crm/deals/${dealId}/start-project`)).status).toBe(409);
    const deal = (await s.get(`/crm/deals/${dealId}`)).body.data;
    expect(deal.projectId).toBe(p.body.data.projectId);
  });

  test("public lead form: anonymous submission creates a lead, junk and bots do not", async () => {
    const { client: a } = await admin();
    const { client: s } = await spv();
    expect((await s.post("/crm/lead-forms", { name: "Kontak" })).status).toBe(403);
    const form = await a.post("/crm/lead-forms", { name: "Kontak Kami", source: "web-form", defaultPic: state().adminEmail });
    expect(form.ok, JSON.stringify(form.body)).toBeTruthy();
    const key: string = form.body.data.key;

    const anon = await request.newContext(); // no token at all
    const info = await anon.get(`${API}/public/lead-forms/${key}`);
    expect(info.status()).toBe(200);
    expect(await anon.get(`${API}/public/lead-forms/${"0".repeat(24)}`).then((r) => r.status())).toBe(404);

    const good = await anon.post(`${API}/public/lead-forms/${key}/submit`, { data: { name: "Sari Web", email: "sari@web.test", phone: "+62 812-3456", message: "Butuh penawaran" } });
    expect(good.status(), await good.text()).toBe(200);
    const bad = await anon.post(`${API}/public/lead-forms/${key}/submit`, { data: { name: "Tanpa Kontak" } });
    expect(bad.status()).toBe(400);
    const bot = await anon.post(`${API}/public/lead-forms/${key}/submit`, { data: { name: "Botty", email: "b@spam.test", website: "http://spam" } });
    expect(bot.status()).toBe(200); // looks accepted...

    const leads = (await a.get<any[]>("/crm/leads", { perPage: "100" })).body.data;
    const sari = leads.find((l) => l.name === "Sari Web");
    expect(sari.source).toBe("web-form");
    expect(sari.status).toBe("New");
    expect(leads.some((l) => l.name === "Botty")).toBe(false); // ...but nothing was stored
    expect(leads.some((l) => l.name === "Tanpa Kontak")).toBe(false);
    const notes = (await a.get<any[]>("/crm/interactions", { parentType: "lead", parentId: sari.id })).body.data;
    expect(notes[0].summary).toContain("Butuh penawaran");

    // Deactivated: the public side goes dark.
    await a.put(`/crm/lead-forms/${form.body.data.id}`, { isActive: false });
    expect((await anon.post(`${API}/public/lead-forms/${key}/submit`, { data: { name: "Late", email: "l@x.test" } })).status()).toBe(404);
    // The public endpoint is rate limited per client.
    let limited = false;
    for (let i = 0; i < 30 && !limited; i++) limited = (await anon.get(`${API}/public/lead-forms/${"1".repeat(24)}`)).status() === 429;
    expect(limited).toBe(true);
  });
});
