import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { AdBanner } from './AdBanner'

// Mock the hooks
vi.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

// Mock adsConfig with empty AD_CLIENT for placeholder tests
vi.mock('./adsConfig', () => ({
  AD_CLIENT: '',
}))

import { useOnlineStatus } from '../../hooks/useOnlineStatus'
const mockUseOnlineStatus = vi.mocked(useOnlineStatus)

describe('AdBanner', () => {
  beforeEach(() => {
    cleanup()
    mockUseOnlineStatus.mockReturnValue(true)
  })

  it('renders placeholder when AD_CLIENT is empty (default)', () => {
    const { container } = render(
      <AdBanner
        adSlot="1234567890"
        adFormat="horizontal"
        style={{ width: 320, height: 100 }}
      />
    )

    const placeholder = container.querySelector('[data-testid="ad-placeholder"]')
    expect(placeholder).not.toBeNull()
    expect(placeholder!.textContent).toContain('Ad Space')
  })

  it('renders placeholder when offline even if configured', () => {
    mockUseOnlineStatus.mockReturnValue(false)

    const { container } = render(
      <AdBanner
        adSlot="1234567890"
        adFormat="horizontal"
        adClient="ca-pub-1234567890123456"
        style={{ width: 320, height: 100 }}
      />
    )

    const placeholder = container.querySelector('[data-testid="ad-placeholder"]')
    expect(placeholder).not.toBeNull()
  })

  it('renders placeholder with correct style', () => {
    const { container } = render(
      <AdBanner
        adSlot="1234567890"
        adFormat="vertical"
        style={{ width: 160, height: 600 }}
      />
    )

    const placeholder = container.querySelector('[data-testid="ad-placeholder"]') as HTMLElement
    expect(placeholder).not.toBeNull()
    expect(placeholder.style.width).toBe('160px')
    expect(placeholder.style.height).toBe('600px')
  })

  it('renders placeholder with custom className', () => {
    const { container } = render(
      <AdBanner
        adSlot="1234567890"
        adFormat="horizontal"
        style={{ width: 320, height: 100 }}
        className="my-custom-class"
      />
    )

    const placeholder = container.querySelector('[data-testid="ad-placeholder"]') as HTMLElement
    expect(placeholder).not.toBeNull()
    expect(placeholder.className).toContain('my-custom-class')
  })

  it('placeholder is hidden from accessibility tree', () => {
    const { container } = render(
      <AdBanner
        adSlot="1234567890"
        adFormat="horizontal"
        style={{ width: 320, height: 100 }}
      />
    )

    const placeholder = container.querySelector('[data-testid="ad-placeholder"]') as HTMLElement
    expect(placeholder).not.toBeNull()
    expect(placeholder.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders ins element when adClient is provided and online', () => {
    const { container } = render(
      <AdBanner
        adSlot="9876543210"
        adFormat="horizontal"
        adClient="ca-pub-1234567890123456"
        style={{ width: 320, height: 100 }}
      />
    )

    const adElement = container.querySelector('[data-testid="ad-adsense"]')
    expect(adElement).not.toBeNull()
    expect(adElement!.tagName.toLowerCase()).toBe('ins')
    expect(adElement!.getAttribute('data-ad-client')).toBe('ca-pub-1234567890123456')
    expect(adElement!.getAttribute('data-ad-slot')).toBe('9876543210')
    expect(adElement!.getAttribute('data-ad-format')).toBe('horizontal')
  })

  it('renders vertical format correctly', () => {
    const { container } = render(
      <AdBanner
        adSlot="9876543210"
        adFormat="vertical"
        adClient="ca-pub-1234567890123456"
        style={{ width: 160, height: 600 }}
      />
    )

    const adElement = container.querySelector('[data-testid="ad-adsense"]')
    expect(adElement).not.toBeNull()
    expect(adElement!.getAttribute('data-ad-format')).toBe('vertical')
  })

  it('renders placeholder when adSlot is empty', () => {
    const { container } = render(
      <AdBanner
        adSlot=""
        adFormat="horizontal"
        adClient="ca-pub-1234567890123456"
        style={{ width: 320, height: 100 }}
      />
    )

    const placeholder = container.querySelector('[data-testid="ad-placeholder"]')
    expect(placeholder).not.toBeNull()
  })
})
