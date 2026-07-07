# Implementation Plan: New Unit Types

## Overview

This plan implements the `unitType` feature for items in the bills and shopping list app. The approach is incremental: first extend the type system and utility layer, then migrate storage, update UI components, add localization, and finally wire everything together with comprehensive tests.

## Tasks

- [ ] 1. Set up types and utility foundation
  - [x] 1.1 Add UnitType to the type system
    - Add `UnitType` union type and `UNIT_TYPES` constant array to `src/types/index.ts`
    - Add optional `unitType?: UnitType` field to the `Item` interface
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create `src/lib/unitTypes.ts` utility module
    - Implement the localized labels map for `'en'` and `'pt-BR'` locales covering all 9 unit types
    - Implement `getUnitLabel(unitType, locale)` returning the localized label
    - Implement `getUnitTypeOptions(locale)` returning `{ value, label }[]` for dropdowns
    - Implement `formatQuantityWithUnit(quantity, unitType, locale)` with the display rules: omit unit suffix for `"unit"` when quantity is 1; otherwise show `"{quantity} {label}"`
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

  - [x]* 1.3 Write property tests for unitTypes utility (Property 4: Display formatting)
    - **Property 4: Display formatting for unit types**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Install `fast-check` as a dev dependency
    - Create `src/lib/unitTypes.test.ts`
    - Generate random `(quantity, unitType, locale)` tuples and verify `formatQuantityWithUnit` returns expected format

  - [x]* 1.4 Write property tests for locale-aware labels (Property 5: Locale-aware unit labels)
    - **Property 5: Locale-aware unit labels**
    - **Validates: Requirements 5.2, 5.3**
    - For all combinations of `UnitType` and locale, assert `getUnitLabel` returns a non-empty string matching the localization table

- [ ] 2. Storage migration and persistence
  - [x] 2.1 Update `loadState()` in `src/lib/storage.ts` with unitType migration
    - Add migration step to normalize `unitType` to `'unit'` for items missing the field
    - Ensure migration runs on every list and every item during load
    - _Requirements: 4.1, 4.4_

  - [x] 2.2 Update import/export logic in `src/lib/importExport.ts`
    - Ensure exported JSON includes `unitType` field for every item
    - Add normalization to `'unit'` for imported items missing `unitType`
    - _Requirements: 4.2, 4.3_

  - [x]* 2.3 Write property tests for default normalization (Property 1: Default unitType normalization)
    - **Property 1: Default unitType normalization**
    - **Validates: Requirements 1.2, 1.3, 4.1, 4.3**
    - Generate random item objects without `unitType`, pass through normalization, assert `unitType === 'unit'`

  - [x]* 2.4 Write property tests for round-trip persistence (Property 3: UnitType round-trip persistence)
    - **Property 3: UnitType round-trip persistence**
    - **Validates: Requirements 4.2, 4.4**
    - Generate random items with valid `unitType`, serialize to JSON, deserialize, assert `unitType` preserved

- [ ] 3. Checkpoint - Ensure data layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. UI: ItemForm unit type selector
  - [x] 4.1 Add unit type selector to `src/components/ItemForm/ItemForm.tsx`
    - Add `unitType` state variable defaulting to `'unit'` for new items or the item's current value for edits
    - Add a `<select>` dropdown populated via `getUnitTypeOptions(locale)` with localized labels
    - Place the dropdown adjacent to the quantity field (change grid from `grid-cols-2` to `grid-cols-3`)
    - Include selected `unitType` in the submitted item data on form submit
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.4_

  - [ ]* 4.2 Write unit tests for ItemForm unit type selector
    - Verify selector renders with all 9 options in add mode (Req 2.1)
    - Verify selector pre-selects item's current unitType in edit mode (Req 2.2)
    - Verify selector is adjacent to quantity field (Req 2.3)
    - Verify localized labels render based on locale (Req 5.4)
    - _Requirements: 2.1, 2.2, 2.3, 5.4_

  - [ ]* 4.3 Write property test for form pre-selection (Property 7: Form pre-selects current unitType on edit)
    - **Property 7: Form pre-selects current unitType on edit**
    - **Validates: Requirements 2.2**
    - Generate items with random valid `unitType`, render ItemForm in edit mode, assert selector value matches

  - [ ]* 4.4 Write property test for form submission (Property 8: Form submit includes selected unitType)
    - **Property 8: Form submit includes selected unitType**
    - **Validates: Requirements 2.4**
    - Generate random unitType selections, simulate form submit, assert callback receives the selected value

- [ ] 5. UI: ItemRow display with unit type
  - [x] 5.1 Update `src/components/shared/ItemRow.tsx` to display formatted quantity with unit
    - Call `formatQuantityWithUnit(item.quantity, item.unitType ?? 'unit', locale)` to get display string
    - Display the formatted string in place of the raw quantity
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 5.2 Write unit tests for ItemRow unit type display
    - Verify unit abbreviation appears next to quantity for non-'unit' types (Req 3.1, 3.3)
    - Verify unit abbreviation is omitted for `unitType='unit'` with `quantity=1` (Req 3.2)
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 6. Checkpoint - Ensure UI tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Duplication and calculations verification
  - [x] 7.1 Verify item duplication preserves unitType in `src/contexts/ListsContext.tsx`
    - Confirm that the `duplicateItem` function spreads all item properties (including `unitType`) onto the duplicate
    - Add explicit `unitType` handling if the spread pattern does not cover it
    - _Requirements: 1.4_

  - [ ]* 7.2 Write property test for duplication (Property 2: UnitType preservation on duplication)
    - **Property 2: UnitType preservation on duplication**
    - **Validates: Requirements 1.4**
    - Generate random items with random unitType, run duplication logic, assert unitType matches

  - [ ]* 7.3 Write property test for calculations invariance (Property 6: UnitType does not affect calculations)
    - **Property 6: UnitType does not affect calculations**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Generate random item lists, compute totals, change all unitTypes randomly, recompute, assert totals are equal

- [ ] 8. Localization: Add unit type labels to i18n files
  - [x] 8.1 Add unit type translation keys to `src/i18n/en.ts` and `src/i18n/ptBR.ts`
    - Add keys for the unit type selector label (e.g., "Unit", "Unidade")
    - Ensure i18n integration is consistent with existing patterns in the app
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9. Final integration and wiring
  - [ ] 9.1 Wire all components together and verify end-to-end flow
    - Ensure `ItemForm` passes `unitType` to `ListsContext` on add/edit
    - Ensure `ItemRow` reads `unitType` from context state
    - Ensure storage migration runs on app load
    - Ensure export includes `unitType` and import normalizes missing values
    - _Requirements: 1.2, 1.3, 2.4, 3.1, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 9.2 Write integration tests for end-to-end unitType flow
    - Test: create item with unit type -> verify storage -> reload -> verify persistence
    - Test: load old-format data without unitType -> verify items display correctly
    - Test: export list -> remove unitType from JSON -> import -> verify defaults applied
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- `fast-check` needs to be installed as a dev dependency (task 1.3)
- The `unitType` field is optional on the `Item` interface for backward compatibility; migration normalizes missing values to `'unit'`
- Calculations (`calcTotals`, `calcSplit`) require NO changes — unit types are informational only

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "2.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.3", "2.4", "8.1"] },
    { "id": 3, "tasks": ["4.1", "5.1", "7.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.2", "7.2", "7.3"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2"] }
  ]
}
```
