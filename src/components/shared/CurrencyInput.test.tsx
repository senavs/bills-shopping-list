import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createRef, useState } from 'react'
import { CurrencyInput } from './CurrencyInput'

afterEach(cleanup)

const Controlled = ({ initial = 0, currency = 'BRL' as 'BRL' | 'USD', onChange = vi.fn() }) => {
  const [cents, setCents] = useState(initial)
  return (
    <CurrencyInput
      aria-label="price"
      valueCents={cents}
      currency={currency}
      onChange={(c) => { onChange(c); setCents(c) }}
    />
  )
}

const input = () => screen.getByLabelText('price') as HTMLInputElement

describe('CurrencyInput', () => {
  it('shows 0,00 for BRL and 0.00 for USD at zero', () => {
    render(<Controlled currency="BRL" />)
    expect(input().value).toBe('0,00')
    cleanup()
    render(<Controlled currency="USD" />)
    expect(input().value).toBe('0.00')
  })

  it('fills digits from the right', () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    fireEvent.change(input(), { target: { value: '0,001' } })
    expect(onChange).toHaveBeenLastCalledWith(1)
    expect(input().value).toBe('0,01')
    fireEvent.change(input(), { target: { value: '0,015' } })
    expect(input().value).toBe('0,15')
    fireEvent.change(input(), { target: { value: '0,150' } })
    expect(input().value).toBe('1,50')
  })

  it('Backspace drops the last digit', () => {
    const onChange = vi.fn()
    render(<Controlled initial={150} onChange={onChange} />)
    fireEvent.change(input(), { target: { value: '1,5' } })
    expect(onChange).toHaveBeenLastCalledWith(15)
    expect(input().value).toBe('0,15')
  })

  it('paste of a formatted amount reads digits as cents', () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)
    fireEvent.change(input(), { target: { value: '1.234,56' } })
    expect(onChange).toHaveBeenLastCalledWith(123456)
    expect(input().value).toBe('1.234,56')
  })

  it('ignores a 10th digit', () => {
    const onChange = vi.fn()
    render(<Controlled initial={999999999} onChange={onChange} />)
    fireEvent.change(input(), { target: { value: '9.999.999,999' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(input().value).toBe('9.999.999,99')
  })

  it('clearing the field gives zero', () => {
    const onChange = vi.fn()
    render(<Controlled initial={350} onChange={onChange} />)
    fireEvent.change(input(), { target: { value: '' } })
    expect(onChange).toHaveBeenLastCalledWith(0)
    expect(input().value).toBe('0,00')
  })

  it('uses numeric keyboard and forwards props', () => {
    const ref = createRef<HTMLInputElement>()
    render(
      <CurrencyInput ref={ref} id="p" aria-label="price" enterKeyHint="done" valueCents={0} currency="BRL" onChange={vi.fn()} />
    )
    expect(input().getAttribute('inputmode')).toBe('numeric')
    expect(input().getAttribute('enterkeyhint')).toBe('done')
    expect(input().id).toBe('p')
    expect(ref.current).toBe(input())
  })
})
