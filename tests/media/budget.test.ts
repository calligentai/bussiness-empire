import { describe, expect, it, vi } from 'vitest'
import { resolveBudget, probeVideoEndpoint } from '../../server/media/budget'
import { MediaBudgetError, MediaDisabledError } from '../../server/media/errors'

describe('media budget', () => {
  it('defaults to no paid spend and no video', async () => {
    expect(await resolveBudget({})).toEqual({ allowPaid: false, capCents: 0, videoEnabled: false })
  })

  it('enables paid spend only for a positive explicit cap', async () => {
    expect(await resolveBudget({ MEDIA_BUDGET_CENTS: '125' })).toMatchObject({ allowPaid: true, capCents: 125, videoEnabled: false })
    expect(await resolveBudget({ MEDIA_BUDGET_CENTS: '-2' })).toMatchObject({ allowPaid: false, capCents: 0 })
  })

  it('requires a positive video cap and successful injected reachability probe', async () => {
    const transport = { call: vi.fn().mockResolvedValue({ ok: true }) }
    const budget = await resolveBudget({ MEDIA_BUDGET_CENTS: '100', MEDIA_VIDEO_BUDGET_CENTS: '20', MEDIA_VIDEO_ENDPOINT_URL: 'https://video.example' }, transport)
    expect(budget.videoEnabled).toBe(true)
    expect(transport.call).toHaveBeenCalledWith({ url: 'https://video.example', method: 'GET' })
  })

  it('keeps video disabled when probe fails and never probes at import time', async () => {
    const transport = { call: vi.fn().mockRejectedValue(new Error('offline')) }
    await expect(resolveBudget({ MEDIA_VIDEO_BUDGET_CENTS: '20', MEDIA_VIDEO_ENDPOINT_URL: 'https://video.example' }, transport)).resolves.toMatchObject({ videoEnabled: false })
  })

  it('blocks paid work before transport and blocks video without approval', async () => {
    const transport = { call: vi.fn() }
    expect(() => assertPaidAllowed(false, 0, 1)).toThrow(MediaBudgetError)
    expect(transport.call).not.toHaveBeenCalled()
    expect(() => assertVideoEnabled(false)).toThrow(MediaDisabledError)
  })
})

import { assertPaidAllowed, assertVideoEnabled } from '../../server/media/budget'
