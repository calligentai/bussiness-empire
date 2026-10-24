import { describe, expect, it } from "vitest";
import { validateBrand } from "../brand/brand-rules.mjs";

const tokens = {
  color: {
    ink: "#141210",
    paper: "#F4F0EA",
    lava: "#E2481B",
    ember: "#F2A03D",
    muted: "#6B625B",
    surface: "#2A2522",
    white: "#FFFFFF",
    danger: "#B3261E",
  },
  colorPairs: [
    { foreground: "ink", background: "paper", minimum: "AA", usage: "body" },
    { foreground: "white", background: "lava", minimum: "AA-large", usage: "display" },
  ],
  space: { "0": "0px", "1": "4px", "2": "8px", "4": "16px" },
  typography: {
    size: { "100": "12px", "300": "16px", "700": "32px" },
    lineHeight: { tight: "1.2", body: "1.6" },
  },
  breakpoint: { sm: "480px", md: "768px" },
};

const cleanFile = { path: "components/Clean.vue", content: "<template><p class=\"text\">Hi</p></template>" };

describe("central brand rules", () => {
  it("accepts the canonical token set and token-only component styles", () => {
    const result = validateBrand({ tokens, files: [cleanFile], deviations: [] });
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("rejects a deliberately wrong spacing rule", () => {
    const wrong = structuredClone(tokens);
    wrong.space["3"] = "20px";
    const result = validateBrand({ tokens: wrong, files: [cleanFile], deviations: [] });
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.rule)).toContain("spacing.grid");
  });

  it("rejects a deliberately wrong colour pair", () => {
    const wrong = structuredClone(tokens);
    wrong.colorPairs = [
      { foreground: "muted", background: "surface", minimum: "AA", usage: "body" },
    ];
    const result = validateBrand({ tokens: wrong, files: [cleanFile], deviations: [] });
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.rule)).toContain("color.contrast");
  });

  it("rejects raw colour values in component and page source", () => {
    const dirty = {
      path: "pages/index.vue",
      content: "<style>.hero { color: #ff0000; }</style>",
    };
    const result = validateBrand({ tokens, files: [dirty], deviations: [] });
    expect(result.ok).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: "color.raw", path: "pages/index.vue" }),
    );
  });

  it("allows a version-controlled, approved deviation and reports it", () => {
    const dirty = {
      path: "pages/index.vue",
      content: "<style>.hero { color: #ff0000; }</style>",
    };
    const deviations = [
      {
        rule: "color.raw",
        path: "pages/index.vue",
        value: "#ff0000",
        reason: "Temporary legacy hero colour approved for M2.",
        approvedBy: "local-board",
      },
    ];
    const result = validateBrand({ tokens, files: [dirty], deviations });
    expect(result.ok).toBe(true);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ rule: "color.raw", approved: true }),
    );
  });
});
