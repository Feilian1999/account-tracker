# 📒 Account Tracker

> A multilingual personal finance and group expense-splitting app — installable on Android & iOS as a PWA.

🔗 **Live Demo**: [feilian1999.github.io/account-tracker](https://feilian1999.github.io/account-tracker/)

---

## What is this project?

**Account Tracker** is a mobile-first Progressive Web App (PWA) that helps you manage both **personal finances** and **shared group expenses**.

Whether you're tracking your daily spending or splitting a trip's costs with friends, Account Tracker keeps everything organized in one place.

### Key Features

| Feature | Description |
|---|---|
| 💰 **Personal Records** | Log income and expense entries with categories, amounts, dates, and notes |
| 📒 **Shared Books** | Create expense books for trips or groups with multiple members |
| ⚖️ **Smart Settlement** | Automatically calculates who owes whom using a greedy debt-minimization algorithm |
| 🌐 **Multilingual** | Fully supports Traditional Chinese, English, and Japanese |
| 🌙 **Dark Mode** | System-aware theme with manual toggle |
| 🏷️ **Custom Categories** | Add personalized income/expense categories on top of built-in defaults |
| 📱 **Installable PWA** | Works offline and can be installed to your Android/iOS home screen |

---

## Tech Stack

### Frontend
| Technology | Role |
|---|---|
| [Vue 3](https://vuejs.org/) + Composition API | Core UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Pinia](https://pinia.vuejs.org/) | Global state management |
| [Vue Router 5](https://router.vuejs.org/) | Client-side navigation |
| [Vue I18n 11](https://vue-i18n.intlify.dev/) | Internationalization (zh-TW / en / ja) |
| [Tailwind CSS 3](https://tailwindcss.com/) | Utility-first styling |
| [Material Symbols](https://fonts.google.com/icons) | Icon set |

### Tooling & Infrastructure
| Technology | Role |
|---|---|
| [Vite 4](https://vitejs.dev/) | Build tool & dev server |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + Workbox | PWA service worker & offline caching |
| [GitHub Actions](https://github.com/features/actions) | CI/CD — auto-build & deploy on every push |
| [GitHub Pages](https://pages.github.com/) | Static hosting |

### Data Storage
- **`localStorage`** — All data is stored locally on the device. No backend, no cloud, full privacy.

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/Feilian1999/account-tracker.git
cd account-tracker

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
```

Output goes to `dist/`. The PWA service worker and `manifest.webmanifest` are automatically generated.

---

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── home/           # Home page sheets (Add Record, Import from Book)
│   └── books/          # Book-related sheets (Create, Settlement)
├── views/              # Page-level views (Home, Books, Profile, Setup)
├── stores/
│   └── tracker.ts      # Central Pinia store — all state & business logic
├── locales/            # i18n translation files (zh-TW, en, ja)
├── utils/
│   └── category.ts     # Category color/icon helpers
├── router/             # Vue Router config
└── i18n.ts             # i18n initialization
```

---

## Installing on Android / iOS

Because this is a PWA, no app store is needed.

1. Open the [live demo URL](https://feilian1999.github.io/account-tracker/) in **Chrome** (Android) or **Safari** (iOS)
2. Tap the browser menu (⋮ on Android / Share on iOS)
3. Select **"Add to Home Screen"** / **"Install App"**
4. The app icon will appear on your home screen and launches in full-screen mode

---

## Deployment

This project auto-deploys via **GitHub Actions** on every push to `main`.

The workflow (`/.github/workflows/deploy.yml`) runs:
```
npm ci → npm run build → deploy dist/ to GitHub Pages
```

---

## Architecture Highlights

- **Greedy Debt Settlement Algorithm** — Minimizes the number of transactions required to settle all debts within a group
- **Offline-first PWA** — Service worker pre-caches all assets including Google Fonts; the app works with no internet connection after first load
- **No Backend Required** — All data lives in `localStorage`. Zero server costs, zero privacy concerns
- **i18n Auto-detection** — Automatically selects language based on `navigator.language` on first launch

---

## License

MIT
