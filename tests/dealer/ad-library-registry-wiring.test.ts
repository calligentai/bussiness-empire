import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(resolve(process.cwd(), "components/AdLibraryDashboard.vue"), "utf8");
const dealerBarrel = readFileSync(resolve(process.cwd(), "packages/contracts/dealer/index.ts"), "utf8");

describe("dealer ad-library registry wiring", () => {
  it("uses the BUS-119 registry module without redefining it in the dealer barrel", () => {
    expect(component).toContain("../packages/contracts/dealer/ad-library");
    expect(dealerBarrel).not.toContain("class DealerAdLibrarySourceRegistry");
  });
});
