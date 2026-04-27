# Bills & Shopping List

Offline-first web app for tracking expenses while shopping or dining out.

## Features

- ✅ Create and manage shopping/restaurant lists
- ✅ Real-time expense tracking with tax calculations
- ✅ Item management with quantity and pricing
- ✅ Select items and see selected totals
- ✅ Archive/unarchive lists
- ✅ Import/Export data as JSON
- ✅ Dark mode support
- ✅ Fully offline - no backend required
- ✅ Mobile-first responsive design
- ✅ Data persisted in LocalStorage

## Tech Stack

- React 18 + TypeScript
- Vite 4
- Tailwind CSS 3
- Vitest for testing
- LocalStorage for persistence
- GitHub Pages deployment

## Development

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
```

## Deployment to GitHub Pages

```bash
# Deploy to GitHub Pages
npm run deploy
```

This will build the project and deploy to the `gh-pages` branch.

## Project Structure

```
src/
├── components/     # React components
│   ├── Dashboard/  # Main dashboard with list cards
│   ├── ListForm/   # Create/edit list form
│   ├── ListDetail/ # List detail with items
│   ├── ItemForm/   # Add/edit item modal
│   ├── TotalsBar/  # Real-time totals display
│   └── shared/     # Shared components
├── contexts/       # React contexts (Lists, DarkMode)
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
│   ├── storage.ts       # LocalStorage helpers
│   ├── calculations.ts  # Tax/total calculations
│   └── importExport.ts  # Data import/export
└── types/          # TypeScript type definitions
```

## Usage

1. **Create a list**: Click the + button at the bottom right
2. **Add items**: Open a list and click the + button to add items
3. **Track expenses**: Check off items as you shop and see totals update in real-time
4. **Manage lists**: Archive, duplicate, or delete lists from the dashboard
5. **Backup data**: Use Export to download your data, Import to restore it
6. **Dark mode**: Toggle with the moon/sun button in the header

## License

MIT
