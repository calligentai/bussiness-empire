export interface SeoMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
}

export interface SearchConsoleSnapshot {
  authorized: boolean;
  clicks?: number;
  impressions?: number;
  averagePosition?: number;
}

export interface SeoDashboard {
  dealerId: string;
  domainId: string;
  hostname: string;
  metadata: SeoMetadata;
  sitemapUrl: string;
  searchConsole: SearchConsoleSnapshot;
}

export interface FreeSeoAudit {
  costCents: 0;
  checks: { title: "pass" | "fail"; description: "pass" | "fail"; sitemap: "pass" | "fail" };
}

export function createSeoDashboard(input: SeoDashboard): SeoDashboard {
  const hostname = normalizeHostname(input.hostname);
  if (!input.dealerId.trim() || !input.domainId.trim() || !hostname) {
    throw new Error("OpenSEO dashboard identity is required");
  }
  const sitemap = parseHttpUrl(input.sitemapUrl);
  if (!sitemap || normalizeHostname(sitemap.hostname) !== hostname) {
    throw new Error("Sitemap URL must use the dealer hostname");
  }
  if (!input.searchConsole.authorized && hasSearchConsoleMetrics(input.searchConsole)) {
    throw new Error("Search Console data requires dealer authorization");
  }
  return {
    ...input,
    hostname,
    metadata: { ...input.metadata },
    searchConsole: { ...input.searchConsole },
  };
}

export function readSeoDashboardForDealer(
  dashboards: readonly SeoDashboard[], dealerId: string, domainId: string,
): SeoDashboard | undefined {
  if (!dealerId.trim() || !domainId.trim()) return undefined;
  return dashboards.find((dashboard) => dashboard.dealerId === dealerId && dashboard.domainId === domainId);
}

export function runFreeSeoAudit(input: {
  hostname: string;
  metadata: SeoMetadata;
  sitemapUrl: string;
}): FreeSeoAudit {
  const hostname = normalizeHostname(input.hostname);
  if (!hostname) throw new Error("Valid hostname is required");
  const sitemap = parseHttpUrl(input.sitemapUrl);
  return {
    costCents: 0,
    checks: {
      title: input.metadata.title?.trim() ? "pass" : "fail",
      description: input.metadata.description?.trim() ? "pass" : "fail",
      sitemap: sitemap && normalizeHostname(sitemap.hostname) === hostname ? "pass" : "fail",
    },
  };
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function hasSearchConsoleMetrics(value: SearchConsoleSnapshot): boolean {
  return value.clicks !== undefined || value.impressions !== undefined || value.averagePosition !== undefined;
}
