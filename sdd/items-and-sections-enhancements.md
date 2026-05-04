# ItemForm: Selected Checkbox & Section Assignment

## Problem Statement

`ItemForm` currently lacks two fields that force users into extra steps:
1. Marking an item as selected requires closing the form and tapping the checkbox separately.
2. Assigning an item to a section requires a separate SectionItemsModal workflow.

Both should be doable inline during create/edit.

## Requirements

- Add a "Selected" checkbox to `ItemForm` (mirrors the existing `includeInTax` checkbox pattern)
- Add a "Section" dropdown to `ItemForm` with a "No section" default option and all available sections listed
- When editing an item that belongs to a section and the user picks a different section (or "No section"), the item is moved: removed from the old section and added to the new one
- `ItemForm` receives `sections` as a prop (array of `{ id, name }`)
- `ListDetail` passes `list.sections` to `ItemForm` when opening it for both add and edit
- `CLAUDE.md` updated to reflect sections/sublist feature and these new changes

## Background

- `ItemForm` currently hardcodes `selected: item?.selected || false` — it never exposes a UI control for it
- Section membership is stored in `Section.itemIds` (not on the `Item` itself), so section assignment in `ItemForm` requires a callback to update the section, not just the item
- `ListDetail` already has `list.sections` and calls both `addItem` and `updateItem` — it's the right place to handle section reassignment logic
- `ListsContext` already has `updateSection` which can update `itemIds` — no new context methods needed

## Proposed Solution

Extend `ItemForm` with two new fields (`selected` checkbox, `sectionId` dropdown). Pass `sections` and the item's current `sectionId` as props. `ListDetail` computes `currentSectionId` for the item being edited and handles the section move logic after the item is saved.

## Task Breakdown

### Task 1: Add `selected` state and checkbox to `ItemForm`

- Add `selected` to local state, initialized from `item?.selected ?? false`
- Add a checkbox below `includeInTax`, following the exact same pattern (label + `input[type=checkbox]`)
- Include `selected` in the `onSubmit` payload (replace the current hardcoded `item?.selected || false`)
- Update the `useEffect` sync to also set `selected`
- **Tests:** Add `ItemForm.test.tsx` verifying the checkbox renders, defaults to unchecked on create, reflects the item value on edit, and the submitted payload includes the correct `selected` value

### Task 2: Add `sections` prop and section dropdown to `ItemForm`

- Add `sections: Pick<Section, 'id' | 'name'>[]` and `initialSectionId?: string` props to `ItemFormProps`
- Add `sectionId` local state initialized from `initialSectionId ?? ''` (empty string = no section)
- Render a `<select>` below the checkboxes only when `sections.length > 0`: first option is `<option value="">No section</option>`, followed by one option per section
- Change `onSubmit` to `(item: Omit<Item, 'id'>, sectionId: string) => void` to expose the selected section to the caller
- **Tests:** Verify dropdown renders with "No section" default, shows section names, and the submitted `sectionId` matches the selection

### Task 3: Change `addItem` to return new id; wire section assignment in `ListDetail`

- Change `addItem` in `ListsContext` to return the new item's `id` (`string`)
- In `ListDetail`, compute `currentSectionId` for `editingItem`: find which section (if any) contains `editingItem.id`
- Pass `sections={list.sections}` and `initialSectionId={currentSectionId}` to both `ItemForm` instances (add and edit)
- Update `handleAddItem(item, sectionId)`: after `addItem(...)`, if `sectionId` is non-empty, call `updateSection` to append the new id to that section's `itemIds`
- Update `handleEditItem(item, sectionId)`: after `updateItem(...)`, if `sectionId !== currentSectionId`, remove from old section and add to new one via `updateSection`. If `sectionId` is empty, only remove from old section.
- **Tests:** Test that editing an item and changing its section moves it; test adding an item with a section assigns it immediately

### Task 4: Update `CLAUDE.md`

- Add `sections` field to the `List` data model documentation
- Add `Section` type documentation (`{ id, name, itemIds, collapsed }`)
- Add `SectionBlock`, `SectionForm`, `SectionItemsModal`, `shared/ItemRow` to the component tree and descriptions
- Document the new `selected` checkbox and section dropdown in `ItemForm`
- Update `ListsContext` operations list to include section CRUD methods: `addSection`, `updateSection`, `deleteSection`, `reorderSection`, `reorderItemInSection`
- Update the architecture overview to reflect current file structure

## Key Implementation Notes

- `addItem` return type changes from `void` to `string` (returns the new item id)
- `onSubmit` prop of `ItemForm` changes from `(item: Omit<Item, 'id'>) => void` to `(item: Omit<Item, 'id'>, sectionId: string) => void`
- Section dropdown only renders if `sections.length > 0`
