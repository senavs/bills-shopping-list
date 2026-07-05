import { useEffect, useRef } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { AD_CLIENT } from './adsConfig'

export interface AdBannerProps {
  /** AdSense ad slot ID */
  adSlot: string
  /** Ad format: 'vertical' for side banners, 'horizontal' for bottom banner */
  adFormat: 'vertical' | 'horizontal'
  /** Inline style for ad container dimensions */
  style?: React.CSSProperties
  /** Additional CSS classes */
  className?: string
  /** Override AD_CLIENT for testing purposes */
  adClient?: string
}

/**
 * AdBanner component that renders a Google AdSense ad unit when configured and online,
 * or a styled placeholder otherwise.
 *
 * Placeholder is shown when:
 * - AD_CLIENT is not configured (empty string) and no adClient prop
 * - User is offline
 *
 * This allows developers to visualize ad placement during development
 * and before AdSense approval.
 */
export function AdBanner({ adSlot, adFormat, style, className = '', adClient }: AdBannerProps) {
  const isOnline = useOnlineStatus()
  const adRef = useRef<HTMLModElement>(null)
  const isAdPushed = useRef(false)

  const resolvedClient = adClient ?? AD_CLIENT
  const isConfigured = resolvedClient !== '' && adSlot !== ''
  const canShowAd = isOnline && isConfigured

  useEffect(() => {
    if (canShowAd && adRef.current && !isAdPushed.current) {
      try {
        ((window as { adsbygoogle?: { push: (obj: object) => void } }).adsbygoogle =
          (window as { adsbygoogle?: { push: (obj: object) => void } }).adsbygoogle || []).push({})
        isAdPushed.current = true
      } catch (e) {
        // AdSense script not loaded or ad blocked — fail silently
      }
    }
  }, [canShowAd])

  if (!canShowAd) {
    return (
      <div
        className={`flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400 dark:text-gray-500 text-xs select-none ${className}`}
        style={style}
        data-testid="ad-placeholder"
        aria-hidden="true"
      >
        <div className="text-center">
          <div className="text-lg mb-1">📢</div>
          <div>Ad Space</div>
        </div>
      </div>
    )
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', ...style }}
      data-ad-client={resolvedClient}
      data-ad-slot={adSlot}
      data-ad-format={adFormat === 'vertical' ? 'vertical' : 'horizontal'}
      data-testid="ad-adsense"
    />
  )
}
