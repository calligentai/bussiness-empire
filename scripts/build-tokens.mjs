import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBrand } from "../brand/brand-rules.mjs";
import { renderTokensCss } from "../brand/tokens-css.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(await readFile(join(root, "brand/tokens.json"), "utf8"));
const result = validateBrand({ tokens });
if (!result.ok) {
  console.error("Refusing to build tokens from an invalid brand source:");
  for (const violation of result.violations) console.error(`- ${violation.rule}: ${violation.message}`);
  process.exit(1);
}

const target = join(root, "assets/css/tokens.css");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, renderTokensCss(tokens));
console.log(`Wrote ${target}`);
