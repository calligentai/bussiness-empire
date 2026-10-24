/** Failures raised by the R7.3 analysis layer. Messages never include credentials or raw provider payloads. */
export class AnalysisInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalysisInputError'
  }
}

export class AnalysisTransportError extends Error {
  constructor(message = 'Video analysis transport failed') {
    super(message)
    this.name = 'AnalysisTransportError'
  }
}
