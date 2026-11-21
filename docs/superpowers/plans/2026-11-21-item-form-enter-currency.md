# Item Form Enter Navigation & Currency Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In `ItemForm`, Enter moves name → quantity → price → submit, and the price is a cash-register style input (starts `0,00`/`0.00`, digits fill from the right).

**Architecture:** Pure cents helpers in `src/lib/format.ts`; a controlled `CurrencyInput` in `src/components/shared/` whose state is integer cents; `ItemForm` gets a `currency` prop (from `ListDetail`) and refs for Enter navigation.

**Tech Stack:** React 18 + TypeScript, Vitest + Testing Library (happy-dom).

**Spec:** `docs/superpowers/specs/2026-11-21-item-form-enter-currency-design.md`

## Global Constraints

- Format follows the list currency, not the app language: BRL → `1.234,56`, USD → `1,234.56`. No currency symbol in the field.
- Max 9 digits of cents (largest value `9.999.999,99`).
- Quantity stays free text; unit type select is skipped by Enter navigation.
- Every user-facing string via `useLanguage().t`, keys in both `en.ts` and `ptBR.ts`. Dark mode kept (reuse existing token classes).
- Before done: `npx tsc --noEmit` and `npx vitest run` pass.
- Commits: Conventional Commits, no Claude co-author trailer.

## Review Focus

1. Enter pressed while an IME is composing (accents on Android/iOS keyboards) must not jump fields — test in Task 4.
2. Pasting a formatted amount (`1.234,56`, `12,50`) yields the digits as cents (123456, 1250) — test in Tasks 1 and 2.
3. Typing a 10th digit keeps the previous value instead of overflowing — test in Task 2.
4. Editing an item whose float price is imprecise (`19.99`, `0.29`) shows `19,99`/`0,29`, not one cent off — `toCents` test in Task 1, edit test in Task 3.
5. Select-all + delete yields `0,00` and submits `unitPrice: 0` — test in Task 2 (onChange(0)) and Task 3 (submit).

---

### Task 1: Cents helpers

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts` (create if absent)

**Interfaces:**
- Produces:
  - `export const MAX_PRICE_DIGITS = 9`
  - `export const toCents = (amount: number): number` — `Math.round(amount * 100)`
  - `export const digitsToCents = (raw: string): number` — strip every non-digit, empty → 0, else integer value
  - `export const formatCents = (cents: number, currency: 'BRL' | 'USD'): string` — two decimals with grouping, `pt-BR` for BRL, `en-US` for USD (same rule as `formatCurrency`, without symbol)

- [ ] **Step 1: Write failing tests**

```ts
describe('cents helpers', () => {
  it('toCents rounds float imprecision', () => {
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(0.29)).toBe(29)
    expect(toCents(3.5)).toBe(350)
  })
  it('digitsToCents keeps only digits', () => {
    expect(digitsToCents('')).toBe(0)
    expect(digitsToCents('0,015')).toBe(15)
    expect(digitsToCents('1.234,56')).toBe(123456)
    expect(digitsToCents('12,50')).toBe(1250)
  })
  it('formatCents follows the currency', () => {
    expect(formatCents(0, 'BRL')).toBe('0,00')
    expect(formatCents(0, 'USD')).toBe('0.00')
    expect(formatCents(150, 'BRL')).toBe('1,50')
    expect(formatCents(123456, 'BRL')).toBe('1.234,56')
    expect(formatCents(123456, 'USD')).toBe('1,234.56')
    expect(formatCents(999999999, 'BRL')).toBe('9.999.999,99')
  })
})
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/lib/format.test.ts` (functions not exported).
- [ ] **Step 3: Implement the four exports in `src/lib/format.ts`.**
- [ ] **Step 4: Run, expect PASS** — same command.
- [ ] **Step 5: Commit** — `feat(format): add cents helpers for currency input`

### Task 2: `CurrencyInput` component

**Files:**
- Create: `src/components/shared/CurrencyInput.tsx`
- Test: `src/components/shared/CurrencyInput.test.tsx`

**Interfaces:**
- Consumes: `digitsToCents`, `formatCents`, `MAX_PRICE_DIGITS` from Task 1.
- Produces:
  ```ts
  interface CurrencyInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
    valueCents: number
    onChange: (cents: number) => void
    currency: 'BRL' | 'USD'
  }
  export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(...)
  ```
  Renders `<input type="text" inputMode="numeric" autoComplete="off">` with `value={formatCents(valueCents, currency)}`, rest props passed through.

Behaviour: on change, `digitsToCents(e.target.value)`; if the stripped digit string (leading zeros removed) is longer than `MAX_PRICE_DIGITS`, ignore the change; otherwise `onChange(cents)`. Deriving from the whole new value covers typing (`0,015` → 15), Backspace (`0,1` → 1), paste and autofill. Keep the caret at the end: after each render and on focus/click, `setSelectionRange(len, len)` when the input is the active element (`useLayoutEffect` + `onFocus`/`onClick`, guarded with the merged ref).

- [ ] **Step 1: Write failing tests** (controlled wrapper with `useState` inside the test so the value updates)

```ts
it('shows 0,00 for BRL and 0.00 for USD at zero')
  // render valueCents=0 currency BRL → input.value '0,00'; USD → '0.00'
it('fills digits from the right')
  // change to '0,001' → onChange(1), value '0,01'; then '0,015' → '0,15'; then '0,150' → '1,50'
it('Backspace drops the last digit')
  // from 150 ('1,50'), change to '1,5' → onChange(15), value '0,15'
it('paste of a formatted amount reads digits as cents')
  // change to '1.234,56' → onChange(123456)
it('ignores a 10th digit')
  // from 999999999, change to '9.999.999,999' → onChange not called, value unchanged
it('clearing the field gives zero')
  // change to '' → onChange(0), value '0,00'
it('uses numeric keyboard and forwards props')
  // inputmode 'numeric'; id / enterKeyHint passed through; ref points to the input
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/components/shared/CurrencyInput.test.tsx`
- [ ] **Step 3: Implement `CurrencyInput`.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(ui): add cash-register style CurrencyInput`

### Task 3: Use `CurrencyInput` in `ItemForm`

**Files:**
- Modify: `src/components/ItemForm/ItemForm.tsx`
- Modify: `src/components/ListDetail/ListDetail.tsx:366-376` (pass `currency={list.currency}` to both `ItemForm`s)
- Modify: `src/i18n/en.ts`, `src/i18n/ptBR.ts` (remove the now unused `pricePlaceholder` key from both)
- Test: `src/components/ItemForm/ItemForm.test.tsx`

**Interfaces:**
- Consumes: `CurrencyInput` (Task 2), `toCents` (Task 1).
- Produces: `ItemFormProps.currency?: 'BRL' | 'USD'` (default `'BRL'`).

State changes: `unitPrice` string → `priceCents: number`, initial `item ? toCents(item.unitPrice) : 0` (also in the `useEffect` sync). Submit sends `unitPrice: priceCents / 100`; drop the price parse/`priceError` branch (`priceError` key stays if used elsewhere — check with grep, remove from both i18n files only if unused). Keep `id="itemUnitPrice"`, `enterKeyHint="done"`, `text-lg` class.

- [ ] **Step 1: Update/replace the price tests in `describe('ItemForm - iOS keyboard and sheet')`**

```ts
it('starts the unit price at 0.00 for USD and 0,00 for BRL', () => {
  // currency="USD" → value '0.00'; currency="BRL" (or omitted) → '0,00'
})
it('pre-fills the unit price formatted when editing', () => {
  // item unitPrice 3.5, currency BRL → '3,50'; unitPrice 19.99 → '19,99'
})
it('submits unitPrice 0 when the price is untouched', ...)        // keep, unchanged
it('submits the typed price', () => {
  // change price to '6,45' → submit → objectContaining({ unitPrice: 6.45 })
})
it('submits 0 after clearing the price', () => {
  // edit item 3.5, change price to '' → submit → objectContaining({ unitPrice: 0 })
})
// in 'sets iOS keyboard hints': price inputmode now 'numeric'
```

Delete the old `value ''` / `placeholder '0.00'` / `'3.5'` assertions.

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/components/ItemForm`
- [ ] **Step 3: Implement the changes in `ItemForm`, `ListDetail` and the i18n files.**
- [ ] **Step 4: Run, expect PASS** — `npx vitest run src/components/ItemForm src/components/ListDetail && npx tsc --noEmit`
- [ ] **Step 5: Commit** — `feat(ui): currency-masked unit price in item form`

### Task 4: Enter moves to the next field

**Files:**
- Modify: `src/components/ItemForm/ItemForm.tsx`
- Test: `src/components/ItemForm/ItemForm.test.tsx`

**Interfaces:**
- Consumes: `CurrencyInput` forwards its ref (Task 2).

Add `quantityRef` and `priceRef`. `onKeyDown` on name → focus quantity; on quantity → focus price. Only when `e.key === 'Enter'` and not `e.nativeEvent.isComposing`; call `e.preventDefault()` so the form does not submit. The price field has no handler: Enter submits (existing validation still applies — empty name shows `t.nameRequired`).

- [ ] **Step 1: Write failing tests** (`describe('ItemForm - Enter navigation')`)

```ts
it('Enter on name focuses quantity and does not submit')
  // keyDown(name, { key: 'Enter' }) → document.activeElement === Quantity; onSubmit not called
it('Enter on quantity focuses price and does not submit')
it('Enter on price is left to the browser (implicit submit)')
  // happy-dom doesn't do implicit submission, so assert fireEvent.keyDown(price, { key: 'Enter' })
  // returns true (default not prevented)
it('ignores Enter while composing')
  // keyDown(name, { key: 'Enter', isComposing: true }) → focus stays on name
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/components/ItemForm`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run full suite, expect PASS** — `npx tsc --noEmit && npx vitest run`
- [ ] **Step 5: Commit** — `feat(ui): enter moves through item form fields`
