/**
 * Google AdSense configuration.
 *
 * Replace these placeholders with your real AdSense publisher ID and ad slot IDs
 * once your account is approved. See MONETIZATION.md for setup instructions.
 *
 * Set ADS_ENABLED to true to show ad placements (placeholders or real ads).
 * When false, no ad boxes are rendered at all.
 */

/** Master switch to enable/disable all ad placements */
export const ADS_ENABLED = false

/** Your AdSense publisher ID (e.g., 'ca-pub-1234567890123456') */
export const AD_CLIENT = 'ca-pub-4545953737931283'

/** Ad slot IDs for each placement */
export const AD_SLOTS = {
  /** Vertical banner for desktop left side (160x600) */
  sideLeft: '',
  /** Vertical banner for desktop right side (160x600) */
  sideRight: '',
  /** Horizontal banner for mobile/PWA bottom (320x100) */
  bottom: '',
}
