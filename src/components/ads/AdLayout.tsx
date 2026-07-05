import { ReactNode } from 'react'
import { useDisplayMode } from '../../hooks/useDisplayMode'
import { AdBanner } from './AdBanner'
import { AD_SLOTS } from './adsConfig'

interface AdLayoutProps {
  children: ReactNode
}

/**
 * Layout wrapper that positions ad banners around the app content.
 *
 * - Desktop browser (xl+ breakpoint, non-standalone): Two fixed vertical banners
 *   on the left and right sides of the viewport, flanking the centered content.
 * - Mobile / PWA standalone / smaller screens: A fixed bottom banner with
 *   safe-area padding for notched devices.
 *
 * Always renders ad containers (with placeholders when not configured).
 */
export function AdLayout({ children }: AdLayoutProps) {
  const displayMode = useDisplayMode()
  const isStandalone = displayMode === 'standalone'

  return (
    <>
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

      {/* Mobile/tablet bottom banner - always visible below xl, or in standalone */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 flex justify-center p-2 ${
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
    </>
  )
}
