# Item form: Enter navigation and currency-masked price

Status: approved (2026-11-21). Size: small change.

## Intent

Adding items while shopping, phone in hand, should be fast. Today pressing Enter in any field of `ItemForm` submits the form, and the price is a free-text field where typing next to a `0` leaves a leading zero and the user has to type the decimal separator.

## Goals

- Enter moves focus through the text fields: name → quantity → price → submit (add/save).
- The price field behaves like a cash register: starts at `0,00` (BRL) or `0.00` (USD) and digits fill from the right (cents first). No separator typing.

## Non-goals

- Quantity stays free text (kg accepts decimals).
- The tax/tip percentage in `ListForm` is not money; unchanged.
- No currency symbol inside the field.

## Constraints

- `ItemForm` does not know the list currency today; `ListDetail` must pass `list.currency`.
- Format follows the currency, not the app language (same rule as `formatCurrency`).
- Strings through `useLanguage().t`; dark mode preserved.

## Approaches

1. **Own `CurrencyInput` + pure helpers in `src/lib/format.ts` (picked).** The state is an integer number of cents; helpers convert digits ↔ cents ↔ formatted string. Small, unit-testable, no dependency.
2. Masking library (e.g. `react-currency-input-field`): extra dependency for ~20 lines of logic, less control over mobile caret behaviour. Rejected.
3. Keep free text and only strip leading zeros: doesn't remove the separator typing. Rejected.

## Design

- **Enter:** `onKeyDown` on name and quantity: on Enter, `preventDefault` and focus the next field (refs). Unit type select is skipped. On the price field, Enter submits as usual.
- **Price:**
  - `CurrencyInput` in `src/components/shared/`, props `valueCents`, `onChange(cents)`, `currency`, plus input passthrough (id, className, enterKeyHint).
  - Typing a digit appends it (`cents * 10 + d`); Backspace drops the last digit (`floor(cents / 10)`); max 9 digits.
  - Derive cents from the digits of the new input value, so mobile keyboards, paste and autofill all work; pasting `12,50` yields 1250.
  - Caret kept at the end.
  - Display with thousands separator: `1.234,56` / `1,234.56`.
  - Edit mode shows the stored price formatted (`12.5` → `12,50`). Submit sends `cents / 100`.
- `ItemForm` gains an optional `currency` prop (default `'BRL'`).

## Left to the builder

Exact helper names, how to keep the caret at the end, test cases.
