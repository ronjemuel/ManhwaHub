# ManhwaHub

ManhwaHub is a browser-based manga, manhwa, and manhua reader built with Next.js, React, and TypeScript. It stores reading data locally and can be exported as a static progressive web app.

## Technologies

- Next.js 16.3.4 and React 19.2.6
- TypeScript and Tailwind CSS 4
- IndexedDB for local library, reading progress, history, and settings
- Zod for validation
- A web app manifest and a generated service worker
- Node's test runner with `tsx` and `fake-indexeddb`

## Implemented features

- Home, search and filters, series details, library, favorites, and reading history
- Vertical, paged, and right-to-left reader modes with chapter navigation
- Local reading positions, themes, source preferences, and validated JSON backups
- Original demo content with optional offline storage
- A Kitsu adapter for live metadata searches

Kitsu supplies metadata only. Full chapter reading is available for the included original demo content; this implementation does not retrieve third-party chapters.

## Development status

This is a version 1 implementation with local browser storage and no account or remote database requirement. Demo reading and live metadata browsing have different capabilities. Offline behavior requires a production build served over HTTPS or localhost. Browser storage belongs to its origin and can be cleared or evicted; use the backup feature when moving data.

Existing architecture and development verification reports are under `docs/`. Their historical results do not represent a fresh build or device test during repository preparation. No application functionality was changed for this repository.

## Install and run

Use Node.js 22.9 or newer and npm. Install the pinned dependencies:

```sh
npm ci
npm run dev
```

Open `http://localhost:4173`. No environment variables or API keys are required for the included demo and Kitsu metadata adapter.

For a production build:

```sh
npm run build
npm start
```

The build creates the static site and service worker in `out/`. `npm start` serves that output on port 4173. A static host must support directory indexes and correct content types; HTTPS is required for service workers outside localhost.

### Existing checks

```sh
npm run typecheck
npm run build
npm test
```

Build before running tests to include the generated service-worker check. That check is skipped when `out/sw.js` is unavailable.

## Repository layout

- `src/app/`: Next.js routes
- `src/components/` and `src/features/`: shared UI and feature screens
- `src/sources/`: demo and Kitsu adapters with a shared registry
- `src/storage/`: IndexedDB and backup handling
- `public/demo/`: original demo assets
- `scripts/`: development serving, production serving, and service-worker generation
- `tests/`: existing behavior checks
- `docs/`: architecture, source integration, and development reports

Dependencies, generated exports, caches, local configuration, and personal backup files are excluded. Included artwork is demo content, not a screenshot of a running application.
