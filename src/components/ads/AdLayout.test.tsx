import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { AdLayout } from './AdLayout'

// Mock the hooks
vi.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

vi.mock('../../hooks/useDisplayMode', () => ({
  useDisplayMode: vi.fn(() => 'browser'),
}))

import { useDisplayMode } from '../../hooks/useDisplayMode'
const mockUseDisplayMode = vi.mocked(useDisplayMode)

describe('AdLayout', () => {
  beforeEach(() => {
    cleanup()
    mockUseDisplayMode.mockReturnValue('browser')
  })

  it('renders children content', () => {
    const { container } = render(
      <AdLayout>
        <div data-testid="child-content">Hello</div>
      </AdLayout>
    )

    const child = container.querySelector('[data-testid="child-content"]')
    expect(child).not.toBeNull()
    expect(child!.textContent).toBe('Hello')
  })

  it('renders side banners in browser mode', () => {
    const { container } = render(
      <AdLayout>
        <div>Content</div>
      </AdLayout>
    )

    const leftBanner = container.querySelector('[data-testid="ad-side-left"]')
    const rightBanner = container.querySelector('[data-testid="ad-side-right"]')
    expect(leftBanner).not.toBeNull()
    expect(rightBanner).not.toBeNull()
  })

  it('renders bottom banner in browser mode', () => {
    const { container } = render(
      <AdLayout>
        <div>Content</div>
      </AdLayout>
    )

    const bottomBanner = container.querySelector('[data-testid="ad-bottom"]')
    expect(bottomBanner).not.toBeNull()
  })

  it('hides side banners in standalone mode', () => {
    mockUseDisplayMode.mockReturnValue('standalone')

    const { container } = render(
      <AdLayout>
        <div>Content</div>
      </AdLayout>
    )

    const leftBanner = container.querySelector('[data-testid="ad-side-left"]')
    const rightBanner = container.querySelector('[data-testid="ad-side-right"]')
    expect(leftBanner).toBeNull()
    expect(rightBanner).toBeNull()
  })

  it('renders bottom banner in standalone mode', () => {
    mockUseDisplayMode.mockReturnValue('standalone')

    const { container } = render(
      <AdLayout>
        <div>Content</div>
      </AdLayout>
    )

    const bottomBanner = container.querySelector('[data-testid="ad-bottom"]')
    expect(bottomBanner).not.toBeNull()
  })

  it('side banners have hidden xl:block classes for responsive display', () => {
    const { container } = render(
      <AdLayout>
        <div>Content</div>
      </AdLayout>
    )

    const leftBanner = container.querySelector('[data-testid="ad-side-left"]') as HTMLElement
    expect(leftBanner.className).toContain('hidden')
    expect(leftBanner.className).toContain('xl:block')
  })

  it('bottom banner has xl:hidden class in browser mode', () => {
    const { container } = render(
      <AdLayout>
        <div>Content</div>
      </AdLayout>
    )

    const bottomBanner = container.querySelector('[data-testid="ad-bottom"]') as HTMLElement
    expect(bottomBanner.className).toContain('xl:hidden')
  })

  it('bottom banner does not have xl:hidden in standalone mode', () => {
    mockUseDisplayMode.mockReturnValue('standalone')

    const { container } = render(
      <AdLayout>
        <div>Content</div>
      </AdLayout>
    )

    const bottomBanner = container.querySelector('[data-testid="ad-bottom"]') as HTMLElement
    expect(bottomBanner.className).not.toContain('xl:hidden')
  })
})
