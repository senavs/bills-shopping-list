import { useEffect, useRef } from 'react'

/**
 * Locks body scroll when active. Handles iOS quirks by using position: fixed
 * and restoring scroll position on unlock.
 */
export const useScrollLock = (isLocked: boolean) => {
  const scrollPositionRef = useRef(0)

  useEffect(() => {
    if (!isLocked) return

    // Save current scroll position
    scrollPositionRef.current = window.scrollY

    // Apply scroll lock
    const body = document.body
    const html = document.documentElement
    const scrollbarWidth = window.innerWidth - html.clientWidth

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollPositionRef.current}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    // Prevent layout shift from scrollbar disappearing
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      // Restore body styles
      body.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      body.style.paddingRight = ''

      // Restore scroll position
      window.scrollTo(0, scrollPositionRef.current)
    }
  }, [isLocked])
}
