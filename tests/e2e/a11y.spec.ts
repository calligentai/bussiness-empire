import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/", "/product/virunga-washed"]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
