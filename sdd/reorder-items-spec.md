# 🔄 reorder-items-spec.md — Item Reordering Feature

## Problem Statement

Users need to be able to reorder items within a list to organize them logically (e.g., grouping similar items together, organizing by shopping aisle, or prioritizing items). Currently, items are displayed in the order they were added with no ability to change their sequence.

---

## Requirements

### Functional
- Add drag-and-drop reordering capability to list items in the List Detail view
- Provide visual feedback during dragging (item elevation, drop zones)
- Preserve item state (selection, tax inclusion) during reordering
- Persist reordered item positions to LocalStorage
- Alternative: Up/down arrow buttons for reordering (for accessibility/mobile)

### Non-Functional
- Smooth, responsive drag interactions
- Touch-friendly for mobile devices
- Keyboard accessible (arrow keys, enter to move)
- Maintain existing calculation logic unaffected
- No performance degradation with lists up to 100 items

### Out of Scope
- Cross-list item moving
- Batch reordering operations
- Sorting by attributes (price, name, etc.)

---

## Data Model Impact

No changes to the data model. The existing `Item` interface and `List.items` array already support ordering through array position:

```ts
interface List {
  // ... existing properties
  items: Item[]; // Order in array determines display order
}

interface Item {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selected: boolean;
  includeInTax: boolean;
  // No position property needed - array order suffices
}
```

---

## Architecture

The reordering functionality will integrate with the existing `ListDetail` component and `useLists` hook:

```
src/
├── components/
│   ├── ListDetail/
│   │   ├── ListDetail.tsx        # Main list view - add drag handlers
│   │   ├── ListItem.tsx          # Individual item row - add drag props
│   │   └── ReorderControls.tsx   # Optional arrow buttons for reordering
├── hooks/
│   └── useLists.ts              # Extend with reorderItem function
├── lib/
│   └── storage.ts               # No changes needed - order preserved in array
└── contexts/
    └── ListsContext.tsx         # Add reorderItem action
```

---

## Implementation Plan

### Task 1: Add Reordering Logic to State Management
**Objective:** Extend the lists context with item reordering capabilities.

**Implementation guidance:**
- Add `reorderItem(listId: string, itemId: string, newIndex: number)` to `ListsContextType`
- Implement the function in `ListsProvider` to reorder items within a list
- Update `useLists` hook to expose the new function
- Preserve all existing item properties during reordering

**Tests:**
- Unit tests for reorder function with various positions (first, middle, last)
- Integration tests ensuring LocalStorage updates with new order

---

### Task 2: Implement Drag-and-Drop UI
**Objective:** Add visual drag-and-drop interactions to the list detail page.

**Implementation guidance:**
- Use HTML5 drag-and-drop API or a lightweight library like `react-beautiful-dnd`
- Add visual indicators during drag (placeholder, drop zones)
- Implement `ListItem` component with draggable properties
- Handle drop events to calculate new item positions
- Add hover effects and cursor changes for better UX

**Tests:**
- Visual testing of drag states
- End-to-end tests of drag-and-drop functionality
- Accessibility testing with keyboard navigation

---

### Task 3: Add Alternative Reordering Controls
**Objective:** Provide keyboard/screen reader friendly reordering options.

**Implementation guidance:**
- Add up/down arrow buttons to each `ListItem`
- Implement keyboard shortcuts (Ctrl+ArrowUp/Down) for reordering
- Ensure focus management follows moved items
- Add aria labels for accessibility

**Tests:**
- Keyboard navigation tests
- Screen reader compatibility verification

---

### Task 4: Update ListDetail Component
**Objective:** Integrate reordering into the existing list detail view.

**Implementation guidance:**
- Modify `ListDetail.tsx` to support draggable items
- Add reorder controls to `ListItem.tsx`
- Update styling to accommodate drag handles/controls
- Ensure totals calculation remains unaffected by reordering

**Tests:**
- Integration tests with full list rendering
- Performance tests with larger lists (50+ items)

---

### Task 5: Polish and Accessibility
**Objective:** Ensure the reordering feature is polished and accessible.

**Implementation guidance:**
- Add smooth animations for item movement
- Implement proper focus management
- Add aria-live regions for screen reader announcements
- Add touch-friendly targets for mobile devices
- Update documentation and tooltips

**Tests:**
- Accessibility audit
- Mobile device testing
- Performance benchmarking