import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { validateBrand } from "../../brand/brand-rules.mjs";

const load = (path: string) =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

test("canonical tokens pass and a deliberately wrong rule fails", () => {
  const tokens = load("brand/tokens.json");
  expect(validateBrand({ tokens }).ok).toBe(true);

  const badSpacing = structuredClone(tokens);
  badSpacing.space["3"] = "20px";
  const spacingResult = validateBrand({ tokens: badSpacing });
  expect(spacingResult.ok).toBe(false);
  expect(spacingResult.violations.map((v) => v.rule)).toContain("spacing.grid");

  const badColour = structuredClone(tokens);
  badColour.colorPairs = [
    { foreground: "muted", background: "surface", minimum: "AA", usage: "body" },
  ];
  const colourResult = validateBrand({ tokens: badColour });
  expect(colourResult.ok).toBe(false);
  expect(colourResult.violations.map((v) => v.rule)).toContain("color.contrast");
});

test("approved deviations are loaded from version control", () => {
  const tokens = load("brand/tokens.json");
  const { deviations } = load("brand/deviations.json");
  const result = validateBrand({
    tokens,
    files: [{ path: "pages/legacy.vue", content: "<style>.legacy { color: #ff0000; }</style>" }],
    deviations: [
      ...deviations,
      {
        rule: "color.raw",
        path: "pages/legacy.vue",
        value: "#ff0000",
        reason: "Regression fixture: proves approved deviations are honoured.",
        approvedBy: "local-board",
      },
    ],
  });
  expect(result.ok).toBe(true);
  expect(result.violations.some((violation) => violation.approved === true)).toBe(true);
});
