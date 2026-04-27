# 📋 spec.md — Offline Bills & Shopping List Web App

## Problem Statement

Users need a fast, friction-free way to track and estimate expenses in real-time
while shopping at a supermarket or consuming at a restaurant — fully offline,
with no account required.

---

## Requirements

### Functional
- Create, edit, duplicate, archive, and delete lists (shopping / restaurant)
- Add, edit, and delete items with name, quantity, unit price, and flags
- Real-time totals: all items, selected items, with/without tax
- Tax/tip percentage configurable per list
- Toggle item as selected (picked/consumed) and include-in-tax
- Dashboard with Active / Archived tabs
- Export all data as JSON; import JSON (replaces all data)
- Dark mode toggle (manual)
- Delete confirmation modal

### Non-Functional
- Mobile-first, responsive UI (Tailwind CSS)
- Fully offline — no backend, no auth
- Data persisted in LocalStorage (single JSON blob)
- Hosted on GitHub Pages
- Must work within ~5 MB LocalStorage limit

### Out of Scope (MVP)
- User accounts, cloud sync, bill splitting, OCR/barcode, currency conversion

---

## Data Model

```ts
interface Item {
  id: string;
  name: string;           // required
  quantity: number;       // default 1, >= 0, decimal allowed
  unitPrice: number;      // default 0, >= 0
  selected: boolean;
  includeInTax: boolean;  // default true
}

interface List {
  id: string;
  name: string;           // required
  type: 'shopping' | 'restaurant';
  currency: 'BRL' | 'USD';
  taxPercentage: number;  // >= 0
  items: Item[];
  archived: boolean;
}

interface AppState {
  lists: List[];
}
```

---

## Calculation Rules

| Metric                    | Formula |
|---------------------------|---------|
| Total (all)               | Σ (qty × unitPrice) for all items |
| Total (selected)          | Σ (qty × unitPrice) for selected items |
| Tax base                  | Σ (qty × unitPrice) for items where includeInTax = true |
| Total + tax (all)         | Total (all) + taxBase × (taxPct / 100) |
| Total + tax (selected)    | Total (selected) + taxBase_selected × (taxPct / 100) |

---

## Architecture

```
src/
├── components/
│   ├── Dashboard/          # Home screen, tabs, list cards
│   ├── ListDetail/         # Item list, FAB, totals bar
│   ├── ItemForm/           # Add/edit item modal/sheet
│   ├── ListForm/           # Create/edit list form
│   └── shared/             # Modal, ConfirmDialog, DarkModeToggle
├── hooks/
│   ├── useLists.ts         # CRUD + persistence for lists
│   └── useCalculations.ts  # Pure calculation logic
├── lib/
│   ├── storage.ts          # LocalStorage read/write helpers
│   ├── calculations.ts     # Pure functions for totals
│   └── importExport.ts     # JSON export/import logic
├── types/
│   └── index.ts            # Item, List, AppState interfaces
├── App.tsx                 # Router + dark mode context
└── main.tsx
```

---

## Task Breakdown

### Task 1: Project Scaffold & Tooling
**Objective:** Bootstrap a working React + Tailwind + Vite project deployable to GitHub Pages.

**Implementation guidance:**
- `npm create vite@latest` with React + TypeScript template
- Install and configure Tailwind CSS v3
- Add `vite-plugin-gh-pages` (or `gh-pages` npm script) for deployment
- Set up Vitest for unit testing
- Add `src/types/index.ts` with `Item`, `List`, `AppState` interfaces

**Tests:** TypeScript compiles with zero errors; `npm test` runs (empty suite passes).

**Demo:** `npm run dev` opens a blank page; `npm run build` succeeds.

---

### Task 2: Storage & Calculation Layer
**Objective:** Implement the pure data layer — LocalStorage helpers and calculation functions.

**Implementation guidance:**
- `src/lib/storage.ts`: `loadState(): AppState`, `saveState(state): void` — reads/writes a single `"app"` key in LocalStorage; returns `{ lists: [] }` on first load
- `src/lib/calculations.ts`: pure functions `calcTotals(list: List)` returning `{ totalAll, totalSelected, totalAllWithTax, totalSelectedWithTax }`
- `src/hooks/useLists.ts`: React hook wrapping state + storage; exposes `lists`, `createList`, `updateList`, `deleteList`, `archiveList`, `duplicateList`

**Tests:**
- Unit tests for all `calculations.ts` functions (normal case, zero price, tax exclusion, empty list)
- Unit tests for `storage.ts` (mock localStorage)

**Demo:** Tests pass; hook can be imported and used in a scratch component.

---

### Task 3: Dashboard Screen
**Objective:** Render the home screen with Active / Archived tabs and list cards.

**Implementation guidance:**
- `src/components/Dashboard/Dashboard.tsx`: two tabs (Active / Archived), renders `ListCard` per list
- `ListCard` shows: name, type icon, item count, currency, archive/delete/duplicate actions
- Delete triggers a `ConfirmDialog` (`src/components/shared/ConfirmDialog.tsx`)
- Wire `useLists` hook; all mutations update LocalStorage immediately
- React Router `<Route path="/" />` renders Dashboard

**Tests:** Render tests — dashboard shows correct tab content; delete confirmation appears before deletion.

**Demo:** Lists can be created (hardcoded seed), displayed, archived, and deleted from the dashboard.

---

### Task 4: Create / Edit List Form
**Objective:** Allow users to create and edit lists via a dedicated form page.

**Implementation guidance:**
- `src/components/ListForm/ListForm.tsx`: fields for name, type (radio), currency (select), taxPercentage (number input)
- Validation: name required, taxPercentage >= 0
- Route: `<Route path="/lists/new" />` and `<Route path="/lists/:id/edit" />`
- On submit: calls `createList` or `updateList`, navigates back to dashboard
- "Create list in < 10 seconds" UX target — keep the form minimal

**Tests:** Form validation rejects empty name and negative tax; submit calls the correct hook action.

**Demo:** User can create a new list from the dashboard FAB and see it appear in the Active tab.

---

### Task 5: List Detail Page & Item Management
**Objective:** Display items in a list and allow adding, editing, and deleting them.

**Implementation guidance:**
- `src/components/ListDetail/ListDetail.tsx`: renders item rows, empty state hint, floating "+" FAB
- `src/components/ItemForm/ItemForm.tsx`: modal/bottom-sheet with name (required), quantity, unitPrice fields
- Item row: shows name, qty × price, selected checkbox, includeInTax toggle, edit/delete icons
- `useLists` hook extended with `addItem`, `updateItem`, `deleteItem`
- Route: `<Route path="/lists/:id" />`

**Tests:** Adding an item updates the list in state and LocalStorage; deleting removes it; validation rejects empty name.

**Demo:** User opens a list, adds items via FAB, edits inline, toggles selected/includeInTax — all persisted on refresh.

---

### Task 6: Real-Time Totals Bar
**Objective:** Show live totals at the bottom of the List Detail page.

**Implementation guidance:**
- `src/components/ListDetail/TotalsBar.tsx`: sticky footer displaying the four totals from `calcTotals(list)`
- Format currency using `Intl.NumberFormat` with the list's `currency` field
- Totals re-compute on every item change (derived from state, no extra effect needed)

**Tests:** Unit test that `TotalsBar` renders correct values for a known list fixture; verify tax-excluded items don't affect tax total.

**Demo:** Checking/unchecking items and changing prices updates all four totals instantly.

---

### Task 7: Import / Export
**Objective:** Let users back up and restore all data via JSON file.

**Implementation guidance:**
- `src/lib/importExport.ts`: `exportData(state): void` — triggers browser download of `lists-backup.json`; `importData(file: File): Promise<AppState>` — parses and validates JSON shape
- Export button in Dashboard header; Import button opens a hidden `<input type="file">`
- Import replaces entire state after user confirms via `ConfirmDialog`
- Basic schema validation: must have `{ lists: [...] }` shape

**Tests:** `exportData` produces correct JSON string; `importData` rejects malformed JSON and wrong schema.

**Demo:** Export downloads a valid JSON file; re-importing it restores all lists exactly.

---

### Task 8: Dark Mode
**Objective:** Add a manual dark mode toggle that persists across sessions.

**Implementation guidance:**
- Store preference in LocalStorage key `"theme"` (`"light"` | `"dark"`)
- Toggle `class="dark"` on `<html>` element (Tailwind `darkMode: 'class'`)
- `DarkModeToggle` button in the top navigation bar
- Apply dark variants to all existing components

**Tests:** Toggle switches the `dark` class on `<html>`; preference survives page reload.

**Demo:** Clicking the toggle switches the entire app between light and dark themes; preference is remembered.

---

### Task 9: Polish, Validation & GitHub Pages Deploy
**Objective:** Final UX pass, edge-case hardening, and production deployment.

**Implementation guidance:**
- Add input constraints (min values, maxLength on name fields)
- Ensure all empty states are handled (no lists, no items)
- Verify LocalStorage error handling (quota exceeded → show toast)
- Configure `vite.config.ts` `base` for GitHub Pages subdirectory
- Add `deploy` npm script; verify build output is correct
- Run full test suite; fix any failures

**Tests:** Full suite green; manual smoke test on mobile viewport.

**Demo:** App is live on GitHub Pages, fully functional offline, all features working end-to-end.
