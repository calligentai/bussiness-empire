import type { MediaTransport } from '../../types/media'
import { MediaBudgetError, MediaDisabledError } from './errors'

export interface BudgetEnvironment { MEDIA_BUDGET_CENTS?: string; MEDIA_VIDEO_BUDGET_CENTS?: string; MEDIA_VIDEO_ENDPOINT_URL?: string }
export interface MediaBudget { allowPaid: boolean; capCents: number; videoEnabled: boolean }
const positiveInteger = (value?: string) => { if (!value || !/^\d+$/.test(value)) return 0; const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : 0 }

export async function probeVideoEndpoint(url: string | undefined, transport?: MediaTransport): Promise<boolean> {
  if (!url || !transport) return false
  try { const result = await transport.call({ url, method: 'GET' }); return !!result && (typeof result !== 'object' || !('ok' in result) || (result as {ok?: boolean}).ok === true) } catch { return false }
}

export async function resolveBudget(env: BudgetEnvironment, transport?: MediaTransport): Promise<MediaBudget> {
  const capCents = positiveInteger(env.MEDIA_BUDGET_CENTS)
  const videoCap = positiveInteger(env.MEDIA_VIDEO_BUDGET_CENTS)
  const videoEnabled = videoCap > 0 && capCents > 0 && await probeVideoEndpoint(env.MEDIA_VIDEO_ENDPOINT_URL, transport)
  return { allowPaid: capCents > 0, capCents, videoEnabled }
}

export function assertPaidAllowed(allowPaid: boolean, capCents: number, costCents: number): void {
  if (!allowPaid || capCents <= 0 || costCents > capCents) throw new MediaBudgetError()
}
export function assertVideoEnabled(enabled: boolean): void { if (!enabled) throw new MediaDisabledError('Video generation is disabled until its budget is approved and endpoint is reachable') }
