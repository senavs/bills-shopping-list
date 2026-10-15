const SCRIPT_ID = 'adsbygoogle-js'

/**
 * Injects the AdSense script once, on demand. Kept out of index.html so the
 * third-party request only happens when ads are enabled and the device is online.
 */
export function loadAdSense(client: string): void {
  if (typeof document === 'undefined' || document.getElementById(SCRIPT_ID)) return

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
  document.head.appendChild(script)
}
