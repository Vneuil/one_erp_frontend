import { test, expect } from "@playwright/test";
import { admin, spv } from "./world";

test.describe.configure({ mode: "serial" });

test.describe("projects: RAB/RAP control and SPK work orders", () => {
  let projectId = "";

  test("create a project and import RAB and RAP lines", async () => {
    const { client: a } = await admin();
    const p = await a.post("/projects", { name: "Gudang Cikarang", customer: "PT Maju" });
    expect(p.ok, JSON.stringify(p.body)).toBeTruthy();
    projectId = p.body.data.id;

    const lines = [
      { kind: "rab", category: "Material", description: "Baja WF", quantity: 10, unit: "btg", unitPrice: 5_000_000 },
      { kind: "rab", category: "Tenaga", description: "Borongan", quantity: 1, unit: "ls", unitPrice: 20_000_000 },
      { kind: "rap", category: "Material", description: "Baja WF", quantity: 10, unit: "btg", unitPrice: 4_200_000 },
      { kind: "rap", category: "Tenaga", description: "Borongan", quantity: 1, unit: "ls", unitPrice: 15_000_000 },
    ];
    const imp = await a.post(`/projects/${projectId}/budget/import`, { mode: "replace", lines });
    expect(imp.ok, JSON.stringify(imp.body)).toBeTruthy();
    expect(imp.body.data.added).toBe(4);
    const view = (await a.get(`/projects/${projectId}/budget`)).body.data;
    expect(view.summary.rab).toBe(70_000_000);
    expect(view.summary.rap).toBe(57_000_000);
    expect(view.summary.plannedMargin).toBe(13_000_000);
    // The project's own headline figures follow the lines.
    const project = (await a.get(`/projects/${projectId}`)).body.data;
    expect(project.rabValue).toBe(70_000_000);
    expect(project.rapValue).toBe(57_000_000);
  });

  test("a sheet with one bad row imports nothing", async () => {
    const { client: a } = await admin();
    const bad = await a.post(`/projects/${projectId}/budget/import`, { mode: "append", lines: [
      { kind: "rab", category: "Ok", description: "Baris baik", quantity: 1, unitPrice: 1 },
      { kind: "boq", category: "X", description: "Salah jenis", quantity: 1, unitPrice: 1 },
      { kind: "rab", category: "", description: "Tanpa kategori", quantity: 1, unitPrice: 1 },
    ] });
    expect(bad.status).toBe(400);
    expect((bad.body as any).error.details.map((e: any) => e.row)).toEqual([2, 3]);
    const view = (await a.get(`/projects/${projectId}/budget`)).body.data;
    expect(view.items).toHaveLength(4); // untouched
  });

  test("actual costs against the plan flag an over-spent category", async () => {
    const { client: a } = await admin();
    for (const c of [{ category: "Material", amount: 30_000_000 }, { category: "material", amount: 15_000_000 }, { category: "Tenaga", amount: 5_000_000 }, { category: "Transport", amount: 2_000_000 }]) {
      const r = await a.post(`/projects/${projectId}/costs`, c);
      expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    }
    const s = (await a.get(`/projects/${projectId}/budget`)).body.data.summary;
    expect(s.actual).toBe(52_000_000);
    expect(s.overBudget).toBe(true);
    const material = s.categories.find((c: any) => c.category === "Material");
    expect(material.planned).toBe(42_000_000);
    expect(material.actual).toBe(45_000_000); // "material" and "Material" merge
    expect(material.over).toBe(true);
    expect(s.unplannedSpend).toBe(2_000_000); // Transport had no RAP
    expect(s.projectedMargin).toBe(70_000_000 - 52_000_000);
    expect((await a.get(`/projects/${projectId}`)).body.data.actualCost).toBe(52_000_000);
  });

  test("SPK lifecycle: numbered, issued by someone else, progress, completion", async () => {
    const { client: s } = await spv();
    const { client: a } = await admin();
    const wo = await s.post("/project-work-orders", { title: "Pasang rangka baja", customerName: "PT Maju", projectId, contractValue: 70_000_000, startDate: "2026-10-01", dueDate: "2026-11-30" });
    expect(wo.ok, JSON.stringify(wo.body)).toBeTruthy();
    expect(wo.body.data.number).toMatch(/^SPK-\d{4}-\d{3}$/);
    const id = wo.body.data.id;
    expect((await s.post(`/project-work-orders/${id}/start`)).status).toBe(409); // draft cannot start
    expect((await s.post(`/project-work-orders/${id}/issue`)).status).toBe(403); // the drafter cannot issue
    const issued = await a.post(`/project-work-orders/${id}/issue`);
    expect(issued.ok, JSON.stringify(issued.body)).toBeTruthy();
    expect((await a.post(`/project-work-orders/${id}/start`)).ok).toBeTruthy();
    expect((await a.put(`/project-work-orders/${id}/progress`, { progress: 60 })).body.data.progressPct).toBe(60);
    expect((await a.put(`/project-work-orders/${id}/progress`, { progress: 100 })).status).toBe(400);
    const done = await a.post(`/project-work-orders/${id}/complete`);
    expect(done.body.data.progressPct).toBe(100);
    expect((await a.post(`/project-work-orders/${id}/cancel`)).status).toBe(409);
    // Numbers keep counting.
    const second = await s.post("/project-work-orders", { title: "Servis", customerName: "PT B" });
    const n1 = Number(wo.body.data.number.split("-")[2]);
    expect(Number(second.body.data.number.split("-")[2])).toBe(n1 + 1);
  });
});
