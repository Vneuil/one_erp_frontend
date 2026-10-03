import { readFileSync } from "fs";
import { Client, newContext, API, PASSWORD } from "./api";
import { STATE_FILE } from "./global-setup";

export interface State {
  tag: string;
  companyId: string;
  adminUserId: string;
  adminEmail: string;
  spvEmail: string;
  kasirEmail: string;
}

export const state = (): State => JSON.parse(readFileSync(STATE_FILE, "utf8"));

export async function loginAs(email: string): Promise<{ client: Client; token: string }> {
  const ctx = await newContext();
  const res = await ctx.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  if (res.status() !== 200) throw new Error(`login ${email}: ${res.status()} ${await res.text()}`);
  const token = (await res.json()).data.accessToken as string;
  return { client: new Client(ctx, token), token };
}

export const admin = () => loginAs(state().adminEmail);
export const spv = () => loginAs(state().spvEmail);
export const kasir = () => loginAs(state().kasirEmail);
