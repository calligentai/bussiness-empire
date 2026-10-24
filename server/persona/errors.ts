export class PersonaSampleSizeError extends Error {
  constructor(message = 'Matched sample is below the policy minimum') {
    super(message)
    this.name = 'PersonaSampleSizeError'
  }
}

/** Raised before any arithmetic when real and simulated rows would be pooled. */
export class PersonaSourceMismatchError extends Error {
  constructor(message = 'Real and simulated measurements cannot be compared in one call') {
    super(message)
    this.name = 'PersonaSourceMismatchError'
  }
}

export class PersonaDuplicateJudgementError extends Error {
  constructor(message = 'More than one judgement claims the same asset') {
    super(message)
    this.name = 'PersonaDuplicateJudgementError'
  }
}

/** Malformed or degenerate input: nothing to correlate, or no variance to correlate on. */
export class PersonaInputError extends Error {
  constructor(message = 'Persona comparison input is unusable') {
    super(message)
    this.name = 'PersonaInputError'
  }
}
