# Account Tracker

An offline-first personal and shared expense tracker. A Vue 3 PWA, also wrapped
as a native iOS/Android app with Capacitor. Everything is stored on the device
first; the [backend](../account-tracker-backend) is only used for cloud backup
and shared books. There are no accounts — the app identifies a device with a
locally generated UUID.

## Features

- **Personal records** with categories, templates and a built-in calculator
- **Shared books** for splitting expenses: equal or custom splits (amounts,
  expressions like `1,000` or `20%`), settlement suggestions, per-member
  category breakdowns
- **Members** managed one per row with avatars; friends join with an 8-character
  share code and pick which member they are
- **Multiple currencies** — TWD, JPY, USD, THB, VND, CNY, EUR, KRW, GBP — with the
  day's exchange rate fetched automatically (editable, cached for offline use).
  Each book has its own currency; personal records total in a switchable base
  currency
- **Statistics** by year/month with trends and category breakdowns
- **Cloud backup** by UUID, and import from 小豬記帳本 (.txt) and 天天記帳 (.csv)
- Traditional Chinese, English and Japanese; light, dark, system and sheep themes;
  keyboard shortcuts (`Ctrl/⌘ + /` lists them)

## Stack

Vue 3 (Composition API, `<script setup>`) · TypeScript · Pinia · Vue Router ·
Tailwind CSS v4 · IndexedDB (`idb`) · vue-i18n · Vite · Vitest · Capacitor 8 ·
deployed on Vercel

## Getting started

Requires Node.js 20+.

```bash
npm install
echo "VITE_API_URL=http://localhost:8080/api" > .env   # the backend's /api URL
npm run dev                                            # http://localhost:5173
```

| Command | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | type-check + production build to `dist/` |
| `npm run preview` | serve the production build |
| `npm run test` | unit and component tests |
| `npm run lint` | Prettier check |

Production sets `VITE_API_URL` in the Vercel project; without it a build talks to
`localhost`.

### Mobile (Capacitor)

```bash
npm run build
npx cap sync
npx cap open ios        # requires Xcode
```

## Project structure

```
src/
├── stores/       Pinia store (tracker.ts) and its modules: books, personal, sync, …
├── components/   shared UI, plus books/, home/, statistics/
├── composables/  toasts, Escape/Back handling, primary action, currency input
├── utils/        currency, exchange rates, settlement, dates, importers, API client
├── views/        Home, Books, Statistics, Profile, Landing, Login, legal pages
└── locales/      en, zh-TW, ja
tests/            Vitest suites
```

Architecture, data model and conventions are documented in [`CLAUDE.md`](CLAUDE.md).

## License

MIT
