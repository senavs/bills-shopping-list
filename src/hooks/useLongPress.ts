import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  delay?: number
}

export const useLongPress = ({ onLongPress, delay = 500 }: UseLongPressOptions) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

  const start = useCallback((clientX: number, clientY: number) => {
    isLongPressRef.current = false
    startPosRef.current = { x: clientX, y: clientY }

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const move = useCallback((clientX: number, clientY: number) => {
    if (!startPosRef.current) return
    const dx = Math.abs(clientX - startPosRef.current.x)
    const dy = Math.abs(clientY - startPosRef.current.y)
    // Cancel if finger moves more than 10px (user is scrolling)
    if (dx > 10 || dy > 10) {
      cancel()
    }
  }, [cancel])

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0]
      start(touch.clientX, touch.clientY)
    },
    onTouchMove: (e: React.TouchEvent) => {
      const touch = e.touches[0]
      move(touch.clientX, touch.clientY)
    },
    onTouchEnd: () => {
      cancel()
    },
    onMouseDown: (e: React.MouseEvent) => {
      start(e.clientX, e.clientY)
    },
    onMouseMove: (e: React.MouseEvent) => {
      move(e.clientX, e.clientY)
    },
    onMouseUp: () => {
      cancel()
    },
    onMouseLeave: () => {
      cancel()
    },
    onContextMenu: (e: React.MouseEvent) => {
      // Prevent native context menu on long press
      if (isLongPressRef.current) {
        e.preventDefault()
      }
    },
  }

  return { handlers, isLongPress: isLongPressRef }
}
