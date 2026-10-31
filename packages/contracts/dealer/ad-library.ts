export interface PublicAdLibrarySource {
  sourceId: string;
  dealerId: string;
  url: string;
  competitorLabel: string;
  campaignLabel: string;
  provenance: "manual";
  capturedAt: string;
}

export type PublicAdLibrarySourceInput = Omit<PublicAdLibrarySource, "dealerId">;

export function createPublicAdLibrarySource(
  input: PublicAdLibrarySource,
): PublicAdLibrarySource {
  let url: URL;
  try { url = new URL(input.url); } catch { throw new Error("Invalid public ad library source"); }
  const capturedAt = Date.parse(input.capturedAt);
  if (
    !input.sourceId.trim() || !input.dealerId.trim() || url.protocol !== "https:" ||
    !url.hostname || url.username || url.password || !input.competitorLabel.trim() ||
    !input.campaignLabel.trim() || input.provenance !== "manual" || !Number.isFinite(capturedAt)
  ) throw new Error("Invalid public ad library source");
  return { ...input, url: url.toString() };
}

/** Local fixture registry; callers must supply the trusted active dealer context on every operation. */
export class DealerAdLibrarySourceRegistry {
  private readonly records: PublicAdLibrarySource[] = [];

  create(dealerId: string, input: PublicAdLibrarySourceInput): PublicAdLibrarySource {
    if (!dealerId.trim()) throw new Error("Dealer context is required");
    const source = createPublicAdLibrarySource({ ...input, dealerId });
    if (this.records.some((record) => record.dealerId === dealerId && record.sourceId === source.sourceId)) {
      throw new Error("Public ad library source already exists");
    }
    this.records.push(source);
    return { ...source };
  }

  list(dealerId: string): PublicAdLibrarySource[] {
    if (!dealerId.trim()) throw new Error("Dealer context is required");
    return this.records.filter((record) => record.dealerId === dealerId).map((record) => ({ ...record }));
  }

  read(dealerId: string, sourceId: string): PublicAdLibrarySource | undefined {
    if (!dealerId.trim()) throw new Error("Dealer context is required");
    const record = this.records.find((item) => item.dealerId === dealerId && item.sourceId === sourceId);
    return record ? { ...record } : undefined;
  }
}
