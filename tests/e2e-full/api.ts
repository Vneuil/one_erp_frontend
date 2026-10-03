import { APIRequestContext, expect, request } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:3100/api/v1";
export const PASSWORD = "Passw0rd!e2e";

export interface Session {
  token: string;
  email: string;
  userId: string;
  companyId: string;
  ctx: APIRequestContext;
}

export interface Envelope<T = any> {
  status: number;
  ok: boolean;
  body: { success: boolean; message?: string; data: T; error?: { message: string } };
}

/** Thin authenticated client: returns the status and body without throwing, so tests can assert failures too. */
export class Client {
  constructor(private ctx: APIRequestContext, private token?: string) {}
  private headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }
  private async call<T>(method: string, path: string, data?: unknown, params?: Record<string, string>): Promise<Envelope<T>> {
    const res = await this.ctx.fetch(`${API}${path}`, { method, data, params, headers: this.headers() });
    let body: any = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON (e.g. CSV) */
    }
    return { status: res.status(), ok: res.ok(), body };
  }
  get = <T = any>(p: string, params?: Record<string, string>) => this.call<T>("GET", p, undefined, params);
  post = <T = any>(p: string, d?: unknown) => this.call<T>("POST", p, d ?? {});
  put = <T = any>(p: string, d?: unknown) => this.call<T>("PUT", p, d ?? {});
  patch = <T = any>(p: string, d?: unknown) => this.call<T>("PATCH", p, d ?? {});
  del = <T = any>(p: string) => this.call<T>("DELETE", p);
  /** Multipart upload: plain string fields plus one file. */
  async upload<T = any>(path: string, fields: Record<string, string>, file: { name: string; mimeType: string; buffer: Buffer }, fileField = "file"): Promise<Envelope<T>> {
    const res = await this.ctx.fetch(`${API}${path}`, { method: "POST", multipart: { ...fields, [fileField]: file }, headers: this.headers() });
    let body: any = {};
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    return { status: res.status(), ok: res.ok(), body };
  }
  raw = (p: string) => this.ctx.fetch(`${API}${p}`, { headers: this.headers() });
}

let counter = 0;
export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function newContext() {
  return request.newContext();
}

/** Registers a company and its admin, returning a logged-in client. */
export async function registerCompany(name: string, code: string, email: string): Promise<{ admin: Client; token: string; companyId: string; userId: string }> {
  const ctx = await newContext();
  const res = await ctx.post(`${API}/auth/register`, { data: { companyName: name, companyCode: code, name: `${name} Admin`, email, password: PASSWORD } });
  expect(res.status(), await res.text()).toBeLessThan(300);
  const body = await res.json();
  const token: string = body.data.accessToken;
  return { admin: new Client(ctx, token), token, companyId: body.data.user.companyId, userId: body.data.user.id };
}

/** Creates a company member with a legacy role and returns their own logged-in client. */
export async function addMember(admin: Client, companyId: string, name: string, email: string, role: "manager" | "staff"): Promise<Client> {
  const created = await admin.post("/users", { companyId, name, email, password: PASSWORD, role });
  expect(created.ok, JSON.stringify(created.body)).toBeTruthy();
  const ctx = await newContext();
  const res = await ctx.post(`${API}/auth/login`, { data: { email, password: PASSWORD } });
  expect(res.status(), await res.text()).toBe(200);
  const body = await res.json();
  return new Client(ctx, body.data.accessToken);
}
