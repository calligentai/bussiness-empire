/**
 * Provenance labels. The simulated label is the only permitted wording for fixture data,
 * and it must survive into every section of every report.
 */
export const SIMULATED_LABEL = 'SIMULATED - NOT PROVEN VIEWER BEHAVIOUR'

export const REAL_LABEL = 'REAL MEASURED VIEWER BEHAVIOUR'

export const labelFor = (source: 'real' | 'simulated'): string =>
  source === 'real' ? REAL_LABEL : SIMULATED_LABEL
