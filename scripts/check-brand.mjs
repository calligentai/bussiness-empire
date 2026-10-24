import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBrand } from "../brand/brand-rules.mjs";
import { renderTokensCss } from "../brand/tokens-css.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(await readFile(join(root, "brand/tokens.json"), "utf8"));
const deviations = JSON.parse(
  await readFile(join(root, "brand/deviations.json"), "utf8"),
).deviations;

const scanRoots = ["app.vue", "components", "layouts", "pages", "assets/css/base.css"];
const extensions = new Set([".vue", ".ts", ".js", ".css"]);

async function collect(entry) {
  if (entry.endsWith(".css") || entry === "app.vue") {
    return [{ path: entry, content: await readFile(join(root, entry), "utf8") }];
  }
  const files = [];
  for (const child of await readdir(join(root, entry), { withFileTypes: true })) {
    const path = join(entry, child.name);
    if (child.isDirectory()) files.push(...(await collect(path)));
    else if (extensions.has(extname(child.name)))
      files.push({ path, content: await readFile(join(root, path), "utf8") });
  }
  return files;
}

const files = [];
for (const entry of scanRoots) {
  try {
    files.push(...(await collect(entry)));
  } catch {
    // Optional surface (for example layouts/) may not exist yet.
  }
}

const result = validateBrand({ tokens, files, deviations });
const generated = await readFile(join(root, "assets/css/tokens.css"), "utf8");
if (generated !== renderTokensCss(tokens)) {
  result.ok = false;
  result.violations.push({
    rule: "tokens.sync",
    message: "assets/css/tokens.css is stale. Run pnpm tokens:build.",
  });
}

for (const violation of result.violations) {
  const location = violation.path ? `${violation.path}${violation.line ? `:${violation.line}` : ""}: ` : "";
  console.error(`${result.ok ? "APPROVED" : "FAIL"} ${violation.rule} ${location}${violation.message}`);
}

if (!result.ok) process.exit(1);
console.log(`Brand check passed (${files.length} files, ${deviations.length} deviations).`);
