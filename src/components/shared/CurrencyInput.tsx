import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'
import { digitsToCents, formatCents, MAX_PRICE_DIGITS } from '../../lib/format'

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  valueCents: number
  onChange: (cents: number) => void
  currency: 'BRL' | 'USD'
}

/**
 * Cash-register style money input: the value is integer cents and every digit
 * enters from the right (0,00 → 0,01 → 0,15 → 1,50). Cents are derived from all
 * digits of the new value, so typing, Backspace, paste and autofill all work.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ valueCents, onChange, currency, onFocus, onClick, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLInputElement | null>(null)
    const display = formatCents(valueCents, currency)

    const setRefs = useCallback((el: HTMLInputElement | null) => {
      innerRef.current = el
      if (typeof forwardedRef === 'function') forwardedRef(el)
      else if (forwardedRef) forwardedRef.current = el
    }, [forwardedRef])

    // Digits always enter at the end, so keep the caret there
    const caretToEnd = () => {
      const el = innerRef.current
      if (el && document.activeElement === el) {
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
    }

    useLayoutEffect(caretToEnd, [display])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const significant = e.target.value.replace(/\D/g, '').replace(/^0+/, '')
      // Controlled input: skipping onChange makes React restore the previous display
      if (significant.length > MAX_PRICE_DIGITS) return
      onChange(digitsToCents(e.target.value))
    }

    return (
      <input
        {...rest}
        ref={setRefs}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onFocus={(e) => { onFocus?.(e); requestAnimationFrame(caretToEnd) }}
        onClick={(e) => { onClick?.(e); caretToEnd() }}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
