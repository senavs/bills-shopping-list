# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an offline-first web application for tracking expenses while shopping or dining out. It's built with React, TypeScript, and Vite, using Tailwind CSS for styling. Data is persisted in LocalStorage with no backend required.

Key features:
- Create and manage shopping/restaurant lists
- Real-time expense tracking with tax calculations
- Item management with quantity and pricing
- Archive/unarchive lists
- Import/Export data as JSON
- Dark mode support
- Fully offline - no backend required

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

## Architecture Overview

### Core Structure
```
src/
├── App.tsx                 # Main application component with routing setup
├── main.tsx                # Application entry point
├── index.css               # Global CSS styles
├── vite-env.d.ts           # Vite environment declarations
├── components/             # React components organized by feature
│   ├── Dashboard/          # Dashboard view showing all lists
│   │   ├── Dashboard.tsx   # Main dashboard component
│   │   ├── ListCard.tsx    # Individual list card component
│   │   └── Dashboard.test.tsx # Dashboard tests
│   ├── ListDetail/         # List detail view with items
│   │   └── ListDetail.tsx  # Component for viewing/editing list items
│   ├── ListForm/           # Form for creating/editing lists
│   │   ├── ListForm.tsx    # List creation/editing form
│   │   └── ListForm.test.tsx # List form tests
│   ├── ItemForm/           # Form for creating/editing items
│   │   └── ItemForm.tsx    # Item creation/editing form
│   ├── TotalsBar/          # Bottom bar showing calculation totals
│   │   └── TotalsBar.tsx   # Totals display component
│   └── shared/             # Shared UI components
│       └── ConfirmDialog.tsx # Reusable confirmation dialog
├── contexts/               # React contexts for global state
│   ├── ListsContext.tsx    # Central state management for lists/items
│   ├── ListsContext.test.tsx # Tests for ListsContext
│   └── DarkModeContext.tsx # Theme management context
├── hooks/                  # Custom React hooks
│   └── useLists.ts         # Hook to access ListsContext
├── lib/                    # Utility functions
│   ├── storage.ts          # LocalStorage persistence utilities
│   ├── storage.test.ts     # Storage utility tests
│   ├── calculations.ts      # Tax and total calculation functions
│   ├── calculations.test.ts # Calculation function tests
│   └── importExport.ts     # Data import/export functionality
├── types/                  # TypeScript type definitions
│   ├── index.ts            # Core data types (List, Item, AppState)
│   └── index.test.ts       # Type validation tests
└── assets/                 # Static assets (if any)
```

### State Management
The application uses React Context API for global state management with two primary contexts:

1. **ListsContext** (`src/contexts/ListsContext.tsx`)
   - Central state management for all lists and items
   - Provides CRUD operations for lists and items:
     - `createList`: Create a new list with initial metadata
     - `updateList`: Update list properties (name, tax %, etc.)
     - `deleteList`: Remove a list entirely
     - `archiveList`/`unarchiveList`: Toggle list archival status
     - `duplicateList`: Create a copy of an existing list
     - `addItem`: Add a new item to a specific list
     - `updateItem`: Modify an existing item's properties
     - `deleteItem`: Remove an item from a list
     - `reorderItem`: Change item position within a list
   - Automatically persists state to LocalStorage via effect hook
   - Generates unique IDs using `crypto.randomUUID()`

2. **DarkModeContext** (`src/contexts/DarkModeContext.tsx`)
   - Manages application theme (light/dark mode)
   - Persists user preference in LocalStorage
   - Toggles document class for Tailwind dark mode styling

### Key Components and Their Relationships

#### Entry Point and Routing (`src/App.tsx`, `src/main.tsx`)
- `App.tsx` wraps the entire application with context providers
- Uses `react-router-dom` with hash-based routing for GitHub Pages compatibility
- Defines four main routes:
  - `/` → Dashboard (shows active/archived lists)
  - `/lists/new` → ListForm (create new list)
  - `/lists/:id` → ListDetail (view/edit list items)
  - `/lists/:id/edit` → ListForm (edit existing list)

#### Dashboard (`src/components/Dashboard/`)
- Main view showing all lists in card format
- Tabs to filter between active and archived lists
- Import/Export functionality for data backup/restoration
- Floating "+" button to create new lists
- Each ListCard provides quick actions (edit/archive/delete/duplicate)

#### List Management (`src/components/ListForm/`)
- Form component for creating and editing lists
- Collects metadata: name, type (shopping/restaurant), currency, tax percentage
- Validates inputs before submission
- Uses `useNavigate` hook for programmatic navigation

#### Item Management (`src/components/ListDetail/`, `src/components/ItemForm/`)
- ListDetail displays all items in a list with drag-and-drop reordering
- Items can be selected/deselected and marked for tax inclusion
- Each item shows calculated total (quantity × unit price)
- Floating "+" button opens ItemForm modal for adding new items
- ItemForm validates quantity and price inputs

#### Calculations (`src/lib/calculations.ts`)
- Calculates various totals for a list:
  - `totalAll`: Sum of all items regardless of selection
  - `totalSelected`: Sum of only selected items
  - `totalAllWithTax`: Total with tax applied to taxable items
  - `totalSelectedWithTax`: Selected total with tax applied
- Handles complex tax logic (only applying tax to items marked as taxable)

#### Data Persistence (`src/lib/storage.ts`)
- Handles LocalStorage operations with error handling
- `loadState`: Loads app state from LocalStorage or returns defaults
- `saveState`: Serializes and saves app state to LocalStorage
- Uses "app" as the storage key

#### Import/Export (`src/lib/importExport.ts`)
- `exportData`: Creates downloadable JSON file of all app data
- `importData`: Reads and validates uploaded JSON files
- `validateImportData`: Ensures imported data matches expected schema
- Integrates with Dashboard component for UI controls

### Data Flow

1. **Application Startup**
   ```
   main.tsx → App.tsx → DarkModeProvider → ListsProvider → HashRouter
   ```

2. **Loading Data**
   ```
   ListsProvider (useState initializer) → storage.loadState() → LocalStorage
   ```

3. **Creating a New List**
   ```
   Dashboard (+ button) → ListForm (/lists/new) → createList() → ListsProvider.setState() → storage.saveState()
   ```

4. **Adding an Item**
   ```
   ListDetail (+ button) → ItemForm → addItem() → ListsProvider.setState() → storage.saveState()
   ```

5. **Calculating Totals**
   ```
   ListDetail → TotalsBar → calcTotals() → Display formatted values
   ```

### Data Model (`src/types/index.ts`)
- **AppState**: Root state object `{ lists: List[] }`
- **List**: 
  ```typescript
  {
    id: string,
    name: string,
    type: 'shopping' | 'restaurant',
    currency: 'BRL' | 'USD',
    taxPercentage: number,
    items: Item[],
    archived: boolean
  }
  ```
- **Item**:
  ```typescript
  {
    id: string,
    name: string,
    quantity: number,
    unitPrice: number,
    selected: boolean,
    includeInTax: boolean
  }
  ```

### Component Relationships
```
App (provides contexts)
├── HashRouter (routing)
│   ├── Route(/) → Dashboard
│   │   ├── ListCard (for each list)
│   │   └── ConfirmDialog (for deletions)
│   ├── Route(/lists/new) → ListForm
│   ├── Route(/lists/:id) → ListDetail
│   │   ├── ItemForm (modal for adding/editing items)
│   │   └── TotalsBar (fixed bottom bar)
│   └── Route(/lists/:id/edit) → ListForm
└── Context Providers
    ├── ListsProvider (uses storage.ts)
    └── DarkModeProvider
```

### Testing
Unit tests use Vitest with React Testing Library. Test files are colocated with implementation files:
- `src/components/Dashboard/Dashboard.test.tsx` - Dashboard component tests
- `src/components/ListForm/ListForm.test.tsx` - List form component tests
- `src/contexts/ListsContext.test.tsx` - Context functionality tests
- `src/lib/storage.test.ts` - Storage utility tests
- `src/lib/calculations.test.ts` - Calculation function tests
- `src/types/index.test.ts` - Type validation tests