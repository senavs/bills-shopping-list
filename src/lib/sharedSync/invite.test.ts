import { describe, it, expect, vi } from 'vitest'
import { buildInviteUrl, shareInvite } from './invite'

describe('buildInviteUrl', () => {
  it('points at the join route inside the hash', () => {
    expect(buildInviteUrl('https://x.io/app/', 'L1', 'T')).toBe('https://x.io/app/#/join/L1?t=T')
  })
})

describe('shareInvite', () => {
  it('uses the share sheet when available', async () => {
    const share = vi.fn(async () => {})
    expect(await shareInvite('u', 'text', { share, clipboard: undefined as never })).toBe('shared')
    expect(share).toHaveBeenCalledWith({ text: 'text', url: 'u' })
  })

  it('closing the share sheet is not a failure', async () => {
    const share = vi.fn(async () => { throw Object.assign(new Error('x'), { name: 'AbortError' }) })
    expect(await shareInvite('u', 'text', { share, clipboard: undefined as never })).toBe('shared')
  })

  it('falls back to copying the link', async () => {
    const writeText = vi.fn(async () => {})
    expect(await shareInvite('u', 'text', { share: undefined as never, clipboard: { writeText } as never })).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('u')
  })

  it('reports failure when nothing works', async () => {
    const writeText = vi.fn(async () => { throw new Error('denied') })
    expect(await shareInvite('u', 'text', { share: undefined as never, clipboard: { writeText } as never })).toBe('failed')
  })
})
