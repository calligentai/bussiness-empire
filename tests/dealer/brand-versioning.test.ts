import { describe, expect, it } from "vitest";
import {
  createBrandTemplate,
  createDealerBrandOverride,
  resolveDealerBrand,
  publishBrandTemplate,
  type DealerBrandOverride,
} from "../../packages/contracts/dealer";

describe("dealer brand overrides and central template versioning", () => {
  it("isolates dealer overrides and preserves them when central templates advance", () => {
    const v1 = createBrandTemplate({ templateId: "base", version: 1, values: { accent: "#c60", logo: "lava.svg" } });
    const overrideA = createDealerBrandOverride([], { dealerId: "dealer-a", templateId: "base", values: { accent: "#a00" } });
    const overrideB = createDealerBrandOverride([overrideA], { dealerId: "dealer-b", templateId: "base", values: { accent: "#00b" } });
    expect(resolveDealerBrand(v1, [overrideA, overrideB], "dealer-a")).toEqual({ templateVersion: 1, values: { accent: "#a00", logo: "lava.svg" } });
    const v2 = publishBrandTemplate(v1, { logo: "lava-v2.svg", typography: "sans" });
    expect(v2.version).toBe(2);
    expect(v1.values).toEqual({ accent: "#c60", logo: "lava.svg" });
    expect(resolveDealerBrand(v2, [overrideA, overrideB], "dealer-a")).toEqual({ templateVersion: 2, values: { accent: "#a00", logo: "lava-v2.svg", typography: "sans" } });
    expect(resolveDealerBrand(v2, [overrideA, overrideB], "dealer-b")).toEqual({ templateVersion: 2, values: { accent: "#00b", logo: "lava-v2.svg", typography: "sans" } });
  });
  it("rejects duplicate or cross-dealer override replacement", () => {
    const override: DealerBrandOverride = { dealerId: "dealer-a", templateId: "base", values: { accent: "red" } };
    expect(() => createDealerBrandOverride([override], { dealerId: "dealer-a", templateId: "base", values: { accent: "blue" } })).toThrow();
    const template = createBrandTemplate({ templateId: "base", version: 1, values: { accent: "black" } });
    expect(() => resolveDealerBrand(template, [override], "dealer-b")).not.toThrow();
  });
});
