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
- ✅ PWA - installable on iOS and Android

## Tech Stack

- React 18 + TypeScript
- Vite 4
- Tailwind CSS 3
- Vitest for testing
- vite-plugin-pwa (service worker + web manifest)
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
```

## Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

> **Note:** On Node 18, the build requires the crypto polyfill included in the repo. The `build` script already handles this automatically.

## Deploy

### Cloud sync (optional)

Google sign-in + Firestore sync is enabled only when the Firebase web config is
present at build time. Create a `.env.local` (git-ignored) with the values from
Firebase console → Project settings → Your apps:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_GOOGLE_CLIENT_ID=   # Google Cloud → Credentials → "Web client (auto created by Google Service)"
```

Without it the app builds and runs fully local, with the header sync icon in red.

#### Working in a git worktree

`.env.local` is git-ignored, so a new worktree (e.g. `.claude/worktrees/<name>`) does
not have it. Copy it from the main checkout before running `npm run dev` or
`npm run deploy` there (the deploy aborts without it):

```bash
# from the worktree root
cp "$(git rev-parse --path-format=absolute --git-common-dir)/../.env.local" .env.local
```

#### SOP: recover the `.env.local` values (new machine, or file lost)

1. **Firebase values** — open the [Firebase console](https://console.firebase.google.com/),
   select the BillBuddy project → ⚙️ **Project settings** → **General** → **Your apps** →
   the web app → **SDK setup and configuration** → **Config**. Copy from the `firebaseConfig`
   object:

   | `firebaseConfig` field | `.env.local` variable       |
   |------------------------|-----------------------------|
   | `apiKey`               | `VITE_FIREBASE_API_KEY`     |
   | `authDomain`           | `VITE_FIREBASE_AUTH_DOMAIN` |
   | `projectId`            | `VITE_FIREBASE_PROJECT_ID`  |
   | `appId`                | `VITE_FIREBASE_APP_ID`      |

2. **Google OAuth client id** — open the [Google Cloud console](https://console.cloud.google.com/)
   with the same project selected → **APIs & Services** → **Credentials** → under
   **OAuth 2.0 Client IDs**, open **Web client (auto created by Google Service)** and copy
   the **Client ID** (ends in `.apps.googleusercontent.com`) into `VITE_GOOGLE_CLIENT_ID`.
   While there, confirm the **Authorized redirect URIs** listed below.
3. Save the file as `.env.local` in the repo root (never commit it) and check it:

   ```bash
   node scripts/check-deploy-env.js   # prints "Deploy env check passed."
   npm run dev                        # header cloud icon is no longer red
   ```

4. To deploy Firestore rules from the new machine, install the Firebase CLI and run
   `firebase login` once (see the rules commands below).

Sign-in uses a full-page Google OAuth redirect (popups never return to an
installed iOS PWA). The OAuth client must list these **Authorized redirect URIs**:
`https://senavs.github.io/bills-shopping-list/` and, for local dev,
`http://localhost:5173/bills-shopping-list/`.

```bash
# Firestore security rules (after editing firestore.rules)
npm run test:rules                                   # needs Firebase CLI + Java
firebase deploy --only firestore:rules --project <projectId>
```

The web config ends up in the public bundle by design — it identifies the project,
it is not a secret. Access is protected by the Firestore rules, the Auth authorized
domains and the API key's referrer restriction.

```bash
# Build and deploy to GitHub Pages (predeploy checks the VITE_* vars above, then builds)
npm run deploy
```

This will build the project and publish the `dist/` folder to the `gh-pages` branch. The app is available at:

👉 https://senavs.github.io/bills-shopping-list/

## Install on iOS (iPhone/iPad)

This app is a Progressive Web App (PWA). You can install it on your iOS device and use it like a native app — no App Store needed.

1. Open **Safari** on your iPhone or iPad
2. Navigate to https://senavs.github.io/bills-shopping-list/
3. Tap the **Share** button (square with an arrow pointing up)
4. Scroll down and tap **Add to Home Screen**
5. Tap **Add** in the top right corner

The app will appear on your home screen with its own icon. It launches full-screen (no browser bar), works completely offline, and persists your data locally.

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
