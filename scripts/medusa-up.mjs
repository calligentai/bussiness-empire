import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "apps/medusa");
const envPath = join(appDir, ".env");
const runtimePath = join(appDir, ".runtime.json");
const seedStatePath = join(appDir, ".seed-state.json");
const pidPath = join(appDir, ".medusa-pid");
const cli = join(appDir, "node_modules/@medusajs/cli/cli.js");

// Local test database only. Staging passwords come from the Coolify environment.
const local = {
  databaseUrl: "postgres://medusa:medusa_local_test@127.0.0.1:5432/medusa",
  adminEmail: "admin@lavabean.test",
  adminPassword: "medusa_local_test_password",
  backendUrl: "http://127.0.0.1:9000",
};

const readEnv = () => {
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
};

const ensureDatabase = () => {
  const role = spawnSync(
    "sudo",
    [
      "-u",
      "postgres",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "DO $$ BEGIN CREATE ROLE medusa LOGIN PASSWORD 'medusa_local_test'; EXCEPTION WHEN duplicate_object THEN ALTER ROLE medusa WITH LOGIN PASSWORD 'medusa_local_test'; END $$;",
    ],
    { encoding: "utf8" },
  );
  if (role.status !== 0) {
    throw new Error(role.stderr || "Could not create the medusa database role");
  }
  const exists = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-tAc", "SELECT 1 FROM pg_database WHERE datname='medusa'"],
    { encoding: "utf8" },
  );
  if (!String(exists.stdout).includes("1")) {
    const created = spawnSync("sudo", ["-u", "postgres", "createdb", "-O", "medusa", "medusa"], { encoding: "utf8" });
    if (created.status !== 0) throw new Error(created.stderr || "Could not create the medusa database");
  }
};

const writeEnv = () => {
  const current = readEnv();
  const next = {
    DATABASE_URL: local.databaseUrl,
    JWT_SECRET: current.JWT_SECRET || randomBytes(24).toString("hex"),
    COOKIE_SECRET: current.COOKIE_SECRET || randomBytes(24).toString("hex"),
    LAVABEAN_INTERNAL_TOKEN: current.LAVABEAN_INTERNAL_TOKEN || randomBytes(24).toString("hex"),
    STORE_CORS: "http://127.0.0.1:3456,http://localhost:3000",
    ADMIN_CORS: "http://127.0.0.1:9000",
    AUTH_CORS: "http://127.0.0.1:9000",
    MEDUSA_ADMIN_EMAIL: local.adminEmail,
    MEDUSA_ADMIN_PASSWORD: local.adminPassword,
    SEED_STATE_PATH: seedStatePath,
  };
  writeFileSync(
    envPath,
    Object.entries(next)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
  );
  return next;
};

const runMedusa = (args, env) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) throw new Error(`medusa ${args.join(" ")} failed`);
};

const healthy = async () => {
  try {
    const response = await fetch(`${local.backendUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

const main = async () => {
  ensureDatabase();
  const env = writeEnv();
  if (!(await healthy())) {
    runMedusa(["db:migrate"], env);
    runMedusa(["exec", "./src/scripts/seed.ts"], env);
    const user = spawnSync(process.execPath, [cli, "user", "-e", local.adminEmail, "-p", local.adminPassword], {
      cwd: appDir,
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    if (user.status !== 0) {
      console.log("Admin user was not created. If it already exists, that is expected.");
    }
    const child = spawn(process.execPath, [cli, "develop"], {
      cwd: appDir,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, ...env, NODE_ENV: "development" },
    });
    child.unref();
    writeFileSync(pidPath, String(child.pid));
    for (let attempt = 0; attempt < 90; attempt += 1) {
      if (await healthy()) break;
      await delay(1000);
      if (attempt === 89) throw new Error("Medusa did not become healthy on :9000");
    }
  }
  const seed = JSON.parse(readFileSync(seedStatePath, "utf8"));
  writeFileSync(
    runtimePath,
    JSON.stringify(
      {
        backendUrl: local.backendUrl,
        publishableKey: seed.publishableKey,
        internalToken: env.LAVABEAN_INTERNAL_TOKEN,
        adminEmail: local.adminEmail,
        adminPassword: local.adminPassword,
      },
      null,
      2,
    ),
  );
  console.log(`Medusa ready at ${local.backendUrl}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
