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

/** Failures raised by the browser-session ad source. Provider details are omitted. */
export class AdsInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdsInputError'
  }
}

export class AdsTransportError extends Error {
  constructor(message = 'Ads source transport failed') {
    super(message)
    this.name = 'AdsTransportError'
  }
}

export class AdsPermissionError extends Error {
  constructor(message = 'Ads source requires an authorized browser session') {
    super(message)
    this.name = 'AdsPermissionError'
  }
}
