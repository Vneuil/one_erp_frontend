import { test, expect } from "@playwright/test";
import { admin, kasir, state } from "./world";

test.describe.configure({ mode: "serial" });

const PDF = Buffer.from("%PDF-1.4\n% e2e contract body\n");

test.describe("direct file upload for HR and CRM documents", () => {
  let empId = "";
  let docId = "";

  test("HR uploads an employee document and downloads the same bytes", async () => {
    const { client: a } = await admin();
    const { client: k } = await kasir();
    await k.get("/hrm/employees");
    const list = (await a.get<any[]>("/hrm/employees", { perPage: "200" })).body.data;
    empId = list.find((e: any) => e.email?.toLowerCase() === state().kasirEmail.toLowerCase()).id;

    const up = await a.upload(`/hrm/employees/${empId}/documents`, { title: "Kontrak 2026", docType: "Kontrak", expiresOn: "2027-12-31" }, { name: "kontrak.pdf", mimeType: "application/pdf", buffer: PDF });
    expect(up.ok, JSON.stringify(up.body)).toBeTruthy();
    docId = up.body.data.id;
    expect(up.body.data.fileName).toBe("kontrak.pdf");
    expect(up.body.data.fileSize).toBe(PDF.length);
    expect(up.body.data.storageKey).toBeUndefined(); // the storage path is never exposed

    const dl = await a.raw(`/hrm/documents/${docId}/file`);
    expect(dl.status()).toBe(200);
    expect(Buffer.from(await dl.body()).equals(PDF)).toBe(true);
    expect(dl.headers()["content-disposition"]).toContain("kontrak.pdf");
    expect(dl.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("bad uploads are refused: type, size, empty, missing fields", async () => {
    const { client: a } = await admin();
    const base = { title: "X", docType: "Lain" };
    expect((await a.upload(`/hrm/employees/${empId}/documents`, base, { name: "run.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") })).status).toBe(400);
    expect((await a.upload(`/hrm/employees/${empId}/documents`, base, { name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(0) })).status).toBe(400);
    expect((await a.upload(`/hrm/employees/${empId}/documents`, base, { name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10 * 1024 * 1024 + 10, 1) })).status).toBe(400);
    expect((await a.upload(`/hrm/employees/${empId}/documents`, { title: "", docType: "" }, { name: "a.pdf", mimeType: "application/pdf", buffer: PDF })).status).toBe(400);
    // A traversal attempt in the file name is reduced to a plain name.
    const sneaky = await a.upload(`/hrm/employees/${empId}/documents`, base, { name: "../../etc/passwd.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
    expect(sneaky.ok, JSON.stringify(sneaky.body)).toBeTruthy();
    expect(sneaky.body.data.fileName).toBe("passwd.txt");
  });

  test("link-only documents still work and have no file to download", async () => {
    const { client: a } = await admin();
    const r = await a.post(`/hrm/employees/${empId}/documents`, { title: "KTP scan", docType: "KTP", fileRef: "drive:abc" });
    expect(r.ok, JSON.stringify(r.body)).toBeTruthy();
    expect((await a.raw(`/hrm/documents/${r.body.data.id}/file`)).status()).toBe(404);
  });

  test("staff cannot read or download other people's HR documents", async () => {
    const { client: a } = await admin();
    const { client: s } = await (await import("./world")).spv();
    await s.get("/hrm/employees");
    const { client: k } = await kasir();
    // The owner may see their own; a colleague without HR rights may not.
    expect((await k.raw(`/hrm/documents/${docId}/file`)).status()).toBe(200);
    const list = (await a.get<any[]>("/hrm/employees", { perPage: "200" })).body.data;
    const adminEmp = list.find((e: any) => e.email?.toLowerCase() === state().adminEmail.toLowerCase()).id;
    const adminDoc = await a.upload(`/hrm/employees/${adminEmp}/documents`, { title: "Rahasia", docType: "Kontrak" }, { name: "r.pdf", mimeType: "application/pdf", buffer: PDF });
    expect(adminDoc.ok).toBeTruthy();
    expect((await k.raw(`/hrm/documents/${adminDoc.body.data.id}/file`)).status()).toBe(403);
    expect((await k.get(`/hrm/employees/${adminEmp}/documents`)).status).toBe(403);
    expect((await k.upload(`/hrm/employees/${empId}/documents`, { title: "Sendiri", docType: "Lain" }, { name: "a.pdf", mimeType: "application/pdf", buffer: PDF })).status).toBe(403);
  });

  test("deleting the document removes the stored file", async () => {
    const { client: a } = await admin();
    expect((await a.del(`/hrm/documents/${docId}`)).ok).toBeTruthy();
    expect((await a.raw(`/hrm/documents/${docId}/file`)).status()).toBe(404);
  });

  test("CRM: upload a proposal to a lead, download it, delete it", async () => {
    const { client: a } = await admin();
    const lead = await a.post("/crm/leads", { name: "Lead Upload", company: "PT Unggah", email: "u@unggah.test", estimatedValue: 1_000_000 });
    expect(lead.ok, JSON.stringify(lead.body)).toBeTruthy();
    const up = await a.upload("/crm/documents", { parentType: "lead", parentId: lead.body.data.id, title: "Proposal", docType: "Proposal" }, { name: "proposal.pdf", mimeType: "application/pdf", buffer: PDF });
    expect(up.ok, JSON.stringify(up.body)).toBeTruthy();
    const id = up.body.data.id;
    const listed = (await a.get<any[]>("/crm/documents", { parentType: "lead", parentId: lead.body.data.id })).body.data;
    expect(listed.find((d: any) => d.id === id).fileName).toBe("proposal.pdf");
    const dl = await a.raw(`/crm/documents/${id}/file`);
    expect(Buffer.from(await dl.body()).equals(PDF)).toBe(true);
    expect((await a.upload("/crm/documents", { parentType: "lead", parentId: "00000000-0000-4000-8000-000000000000", title: "x", docType: "y" }, { name: "p.pdf", mimeType: "application/pdf", buffer: PDF })).status).toBe(404);
    expect((await a.del(`/crm/documents/${id}`)).ok).toBeTruthy();
    expect((await a.raw(`/crm/documents/${id}/file`)).status()).toBe(404);
  });
});

test.describe("the documents page uploads through the browser", () => {
  test("HR picks a file, it is stored, and clicking the name downloads the same bytes", async ({ page }) => {
    const { loginViaUi } = await import("./ui");
    await loginViaUi(page, state().adminEmail);
    await page.goto("/hrm/documents");
    const select = page.locator("select").first();
    await expect(select.locator("option")).not.toHaveCount(1, { timeout: 20_000 });
    await select.selectOption({ index: 1 });
    await page.getByLabel("Berkas dokumen").setInputFiles({ name: "ijazah.pdf", mimeType: "application/pdf", buffer: PDF });
    await page.locator("label", { hasText: "Judul" }).locator("input").fill("Ijazah S1");
    await page.getByRole("button", { name: /Tambah|Simpan/ }).first().click();
    await expect(page.getByText("Dokumen ditambahkan.")).toBeVisible({ timeout: 20_000 });
    const link = page.getByRole("button", { name: "ijazah.pdf" });
    await expect(link).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
    expect(download.suggestedFilename()).toBe("ijazah.pdf");
    const { readFileSync } = await import("fs");
    expect(readFileSync(await download.path()!).equals(PDF)).toBe(true);
  });
});
