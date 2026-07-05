import { ReactNode } from 'react'
import { useDisplayMode } from '../../hooks/useDisplayMode'
import { AdBanner } from './AdBanner'
import { AD_SLOTS, ADS_ENABLED } from './adsConfig'

interface AdLayoutProps {
  children: ReactNode
}

/**
 * Layout wrapper that positions ad banners around the app content.
 *
 * When ADS_ENABLED is false, renders only children with no ad placements.
 *
 * - Desktop browser (xl+ breakpoint, non-standalone): Two fixed vertical banners
 *   on the left and right sides of the viewport, flanking the centered content.
 * - Mobile / PWA standalone / smaller screens: A non-fixed bottom banner that
 *   sits below the page content in the normal document flow. The page's bottom
 *   padding ensures the FAB and other fixed elements remain above the ad space.
 *
 * Always renders ad containers (with placeholders when not configured).
 */
export function AdLayout({ children }: AdLayoutProps) {
  const displayMode = useDisplayMode()
  const isStandalone = displayMode === 'standalone'

  if (!ADS_ENABLED) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-screen">
      {children}

      {/* Desktop side banners - only in browser mode on xl+ screens */}
      {!isStandalone && (
        <>
          <div
            className="hidden xl:block fixed top-1/2 -translate-y-1/2 left-4 z-40"
            data-testid="ad-side-left"
          >
            <AdBanner
              adSlot={AD_SLOTS.sideLeft}
              adFormat="vertical"
              style={{ width: 160, height: 600 }}
            />
          </div>
          <div
            className="hidden xl:block fixed top-1/2 -translate-y-1/2 right-4 z-40"
            data-testid="ad-side-right"
          >
            <AdBanner
              adSlot={AD_SLOTS.sideRight}
              adFormat="vertical"
              style={{ width: 160, height: 600 }}
            />
          </div>
        </>
      )}

      {/* Mobile/tablet bottom banner - sits in normal document flow (not fixed)
          so it doesn't cover the FAB, TotalsBar, or other fixed elements. */}
      <div
        className={`flex justify-center px-2 pb-2 ${
          isStandalone ? '' : 'xl:hidden'
        }`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        data-testid="ad-bottom"
      >
        <AdBanner
          adSlot={AD_SLOTS.bottom}
          adFormat="horizontal"
          style={{ width: '100%', maxWidth: 728, height: 60 }}
        />
      </div>
    </div>
  )
}
