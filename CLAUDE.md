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
├── components/     # React components organized by feature
├── contexts/       # React contexts for global state (Lists, DarkMode)
├── hooks/          # Custom React hooks
├── lib/            # Utility functions (storage, calculations, import/export)
└── types/          # TypeScript type definitions
```

### State Management
- Uses React Context API for global state management
- ListsContext provides all list/item CRUD operations
- DarkModeContext manages theme switching
- Data persistence through LocalStorage with load/save utilities

### Key Components
1. **ListsContext** (`src/contexts/ListsContext.tsx`) - Central state management for all lists and items
2. **Storage utilities** (`src/lib/storage.ts`) - Handles LocalStorage persistence
3. **Calculation utilities** (`src/lib/calculations.ts`) - Tax and total calculations
4. **Import/Export utilities** (`src/lib/importExport.ts`) - Data backup and restoration

### Data Model
- **List**: Contains items, metadata (name, type, currency, tax info), and archival status
- **Item**: Individual items with quantity, price, selection status, and tax inclusion flag
- **AppState**: Root state object containing all lists

### Routing
Uses react-router-dom with hash-based routing for GitHub Pages compatibility:
- `/` - Dashboard showing active/archived lists
- `/lists/new` - Create new list form
- `/lists/:id` - View list details
- `/lists/:id/edit` - Edit existing list

### Testing
Unit tests use Vitest with React Testing Library. Test files are colocated with implementation files.