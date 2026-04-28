# Implementation Plan — List Sections

## Problem Statement

Users need to visually group items within a list into named sections (e.g., "Dairy", "Produce"). Items not assigned to any section appear below all sections. Sections are collapsible, reorderable, and purely visual — they don't affect totals.

## Requirements

- Sections belong to a `List` and have a name, an ordered list of item IDs, and a collapsed state
- A "New Section" button sits alongside the existing "+" item button
- Clicking a section header toggles collapse of its items
- Editing a section opens a modal with checkboxes; only items not already in another section are shown
- Deleting a section moves its items back to root (unassigned); items are not deleted
- Unassigned items always render below all sections
- Sections and items within sections are reorderable: drag-and-drop on desktop, up/down buttons on mobile
- Import/export includes sections data; `validateImportData` is updated accordingly
- Totals are unaffected (purely visual grouping)

## Data Model Changes

```typescript
// New type in src/types/index.ts
export interface Section {
  id: string
  name: string
  itemIds: string[]   // ordered list of item IDs belonging to this section
  collapsed: boolean
}

// Updated List type
export interface List {
  // ...existing fields...
  sections: Section[]  // new field, default []
}
```

## Proposed Solution

Sections are stored on the `List` object as an ordered array. The render order in `ListDetail` is: sections first (in their order), then unassigned items. Item membership is determined by checking `section.itemIds`. All new context operations follow the existing pattern.

## Architecture

```
ListDetail
├── SectionBlock (× N, in order)
│   ├── SectionHeader (name, collapse toggle, edit/delete, reorder)
│   │   ├── SectionForm modal (name input)
│   │   └── SectionItemsModal (checkbox list of assignable items)
│   └── ItemRow × N (indented, reorderable within section)
└── UnassignedItems (items not in any section)
```

---

## Task Breakdown

### Task 1: Extend the data model and update storage/import-export

- Add the `Section` interface to `src/types/index.ts`
- Add `sections: Section[]` to the `List` interface
- Update `loadState` in `storage.ts` to migrate existing lists (add `sections: []` if missing)
- Update `validateImportData` in `importExport.ts` to validate the `sections` array and each section's shape
- Tests: update `src/types/index.test.ts`, `src/lib/storage.test.ts`, importExport validation tests

### Task 2: Add section CRUD operations to ListsContext

- `addSection(listId, name)` — appends a new section with `id`, `name`, `itemIds: []`, `collapsed: false`
- `updateSection(listId, sectionId, updates)` — updates `name` or `itemIds`
- `deleteSection(listId, sectionId)` — removes the section; items remain in `list.items`
- `reorderSection(listId, fromIndex, toIndex)` — reorders the `sections` array
- `reorderItemInSection(listId, sectionId, fromIndex, toIndex)` — reorders `itemIds` within a section
- `deleteItem` must also remove the item's ID from any section's `itemIds`
- Tests: add cases to `src/contexts/ListsContext.test.tsx`

### Task 3: Build the `SectionForm` modal component

- `src/components/SectionForm/SectionForm.tsx`
- Props: `initialName?: string`, `onSubmit(name: string)`, `onCancel()`
- Validates that name is non-empty
- Tests: `SectionForm.test.tsx`

### Task 4: Build the `SectionItemsModal` component

- `src/components/SectionItemsModal/SectionItemsModal.tsx`
- Props: `allItems: Item[]`, `assignedItemIds: string[]`, `unavailableItemIds: string[]`, `onSave(selectedIds: string[])`, `onCancel()`
- Only items not in another section are shown; items in this section are pre-checked
- Tests: `SectionItemsModal.test.tsx`

### Task 5: Build the `SectionBlock` component and wire into `ListDetail`

- `src/components/SectionBlock/SectionBlock.tsx`
- Section header: name (bold header style), collapse toggle, Edit, Delete (with ConfirmDialog), reorder controls
- Items inside are indented (`pl-6`)
- Update `ListDetail.tsx`: render sections first, unassigned items below, add "New Section" FAB
- Tests: `SectionBlock.test.tsx`

---

## Implementation Notes

- Follow existing code style (no new libraries)
- Minimal code — only what directly contributes to the solution
- Reuse existing item row markup from ListDetail for items inside sections
- Reuse ConfirmDialog for section delete confirmation
- Mobile reorder: ▲▼ buttons; Desktop reorder: drag-and-drop (same pattern as existing items)
- `sections` field defaults to `[]` — backward compatible with existing stored data

## File Changes Summary

| File | Change |
|------|--------|
| `src/types/index.ts` | Add Section interface, add sections to List |
| `src/lib/storage.ts` | Migrate missing sections field |
| `src/lib/importExport.ts` | Validate sections in validateImportData |
| `src/contexts/ListsContext.tsx` | Add 5 new operations, update deleteItem |
| `src/components/SectionForm/SectionForm.tsx` | New file |
| `src/components/SectionForm/SectionForm.test.tsx` | New file |
| `src/components/SectionItemsModal/SectionItemsModal.tsx` | New file |
| `src/components/SectionItemsModal/SectionItemsModal.test.tsx` | New file |
| `src/components/SectionBlock/SectionBlock.tsx` | New file |
| `src/components/SectionBlock/SectionBlock.test.tsx` | New file |
| `src/components/ListDetail/ListDetail.tsx` | Wire everything together |
