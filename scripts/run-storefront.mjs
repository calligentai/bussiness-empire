import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const runtime = JSON.parse(readFileSync("apps/medusa/.runtime.json", "utf8"));
const child = spawn(process.execPath, [".output/server/index.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NITRO_HOST: "127.0.0.1",
    NITRO_PORT: "3456",
    APP_ENV: process.env.APP_ENV || "test",
    PAYMENT_PROVIDER: "manual",
    MEDUSA_BACKEND_URL: runtime.backendUrl,
    MEDUSA_PUBLISHABLE_KEY: runtime.publishableKey,
    LAVABEAN_INTERNAL_TOKEN: runtime.internalToken,
    MEDUSA_ADMIN_EMAIL: runtime.adminEmail,
    MEDUSA_ADMIN_PASSWORD: runtime.adminPassword,
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
