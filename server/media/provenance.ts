import { MediaProvenanceError } from './errors'
import type { MediaAsset, MediaRequest, Provenance } from '../../types/media'

const REQUIRED_TEXT_FIELDS = ['providerId', 'modelId', 'generatedAt', 'promptHash'] as const satisfies ReadonlyArray<keyof Provenance>

/** Rejects any asset whose provenance is incomplete or whose depiction lacks consent. */
export function assertProvenance(asset: MediaAsset, request: MediaRequest): void {
  const provenance: Provenance | undefined = asset?.provenance
  if (!provenance) throw new MediaProvenanceError()

  for (const field of REQUIRED_TEXT_FIELDS) {
    const value = provenance[field]
    if (typeof value !== 'string' || value.trim() === '') throw new MediaProvenanceError()
  }

  if (request.depictsPersonOrBrand && (!provenance.consent || provenance.consent.basis === 'none')) {
    throw new MediaProvenanceError('Person or brand depiction requires a recorded consent basis')
  }
}
