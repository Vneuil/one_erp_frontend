import { writeFileSync } from "fs";
import { join } from "path";
import { addMember, registerCompany, unique } from "./api";

export const STATE_FILE = join(__dirname, ".state.json");

/** One company per run: an admin, a manager and a staff member (the cashier). */
export default async function globalSetup() {
  const tag = unique("e2e").replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase();
  const adminEmail = `owner-${tag}@e2e.test`;
  const { admin, companyId, userId } = await registerCompany(`E2E ${tag}`, tag.toUpperCase(), adminEmail);
  // A registered company has no database of its own until it is provisioned.
  const prov = await admin.post("/tenant/provision");
  if (!prov.ok) throw new Error(`provision failed: ${prov.status} ${JSON.stringify(prov.body)}`);
  // Any authenticated tenant request triggers onboarding, so the admin gets an employee record.
  await admin.get("/hrm/employees");
  await addMember(admin, companyId, "Supervisor E2E", `spv-${tag}@e2e.test`, "manager");
  await addMember(admin, companyId, "Kasir E2E", `kasir-${tag}@e2e.test`, "staff");
  writeFileSync(STATE_FILE, JSON.stringify({ tag, companyId, adminUserId: userId, adminEmail, spvEmail: `spv-${tag}@e2e.test`, kasirEmail: `kasir-${tag}@e2e.test` }));
}
