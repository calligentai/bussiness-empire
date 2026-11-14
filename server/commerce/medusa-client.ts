import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface MedusaRuntime {
  backendUrl: string;
  publishableKey: string;
  internalToken: string;
  adminEmail: string;
  adminPassword: string;
}

const readJson = (path: string) => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Partial<MedusaRuntime>;
  } catch {
    return {};
  }
};

export const medusaRuntime = (): MedusaRuntime => {
  const fromFile = readJson(join(process.cwd(), "apps/medusa/.runtime.json"));
  const keyFile = process.env.MEDUSA_PUBLISHABLE_KEY_FILE;
  const keyFromFile = keyFile ? readJson(keyFile).publishableKey : undefined;
  const runtime = {
    backendUrl: process.env.MEDUSA_BACKEND_URL || fromFile.backendUrl || "",
    publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || keyFromFile || fromFile.publishableKey || "",
    internalToken: process.env.LAVABEAN_INTERNAL_TOKEN || fromFile.internalToken || "",
    adminEmail: process.env.MEDUSA_ADMIN_EMAIL || fromFile.adminEmail || "",
    adminPassword: process.env.MEDUSA_ADMIN_PASSWORD || fromFile.adminPassword || "",
  };
  if (!runtime.backendUrl || !runtime.publishableKey) {
    throw new Error("Medusa is not configured. Start apps/medusa and write apps/medusa/.runtime.json.");
  }
  return runtime;
};

export const medusaHeaders = (namespace?: string) => {
  const runtime = medusaRuntime();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-publishable-api-key": runtime.publishableKey,
  };
  if (runtime.internalToken) {
    headers["x-lavabean-internal-token"] = runtime.internalToken;
    headers["x-lavabean-namespace"] = namespace || "default";
  }
  return headers;
};

let adminTokenCache: { token: string; at: number } | undefined;

export const medusaAdminToken = async () => {
  if (adminTokenCache && Date.now() - adminTokenCache.at < 10 * 60 * 1000) return adminTokenCache.token;
  const runtime = medusaRuntime();
  const response = await fetch(`${runtime.backendUrl}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: runtime.adminEmail, password: runtime.adminPassword }),
  });
  if (!response.ok) {
    throw new Error(`Medusa admin login failed (${response.status})`);
  }
  const body = (await response.json()) as { token?: string };
  if (!body.token) throw new Error("Medusa admin login returned no token");
  adminTokenCache = { token: body.token, at: Date.now() };
  return body.token;
};
