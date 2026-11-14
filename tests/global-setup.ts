import { execFileSync } from "node:child_process";

export default function setup() {
  execFileSync("node", ["scripts/medusa-up.mjs"], { stdio: "inherit" });
}
