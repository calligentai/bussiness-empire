export interface AdQuery {
  period: number
  page: number
  limit: number
  orderBy: string
  countryCode: string
}

/** Metadata used to label a creative; never pass it to video analysis or JEV. */
export interface AdRef {
  externalId: string
  title: string
  ctr: number
  likes: number
  objectiveKey: string
  durationSeconds: number
  coverUrl: string
  countryCode: string
  periodDays: number
}

export interface AdsSource {
  list(query: AdQuery): Promise<AdRef[]>
  fetchMedia?(adRef: AdRef): Promise<Uint8Array>
}
