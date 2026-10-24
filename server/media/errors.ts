export class MediaBudgetError extends Error { constructor(message = 'Media request exceeds the approved budget') { super(message); this.name = 'MediaBudgetError' } }
export class MediaDisabledError extends Error { constructor(message = 'Media capability is disabled by policy') { super(message); this.name = 'MediaDisabledError' } }
export class MediaProviderNotFoundError extends Error { constructor(message = 'Media provider is unavailable') { super(message); this.name = 'MediaProviderNotFoundError' } }
export class MediaProvenanceError extends Error { constructor(message = 'Media provenance is incomplete') { super(message); this.name = 'MediaProvenanceError' } }
