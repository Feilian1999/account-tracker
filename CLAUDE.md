# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

An offline-first personal + shared expense tracker. Vue 3 SPA, deployed as a PWA
on Vercel and wrapped with Capacitor for iOS/Android. There are **no user
accounts**; identity is a locally generated UUID.

---

## 1. Commands

```bash
npm run dev       # Vite dev server → http://localhost:5173
npm run build     # vue-tsc -b && vite build  (typecheck is part of the build)
npm run preview   # serve the production build
npm run test      # vitest run
npm run lint      # prettier --check (see caveat below)
```

Backend lives in `../account-tracker-backend` (Go + Gin + PostgreSQL/Neon):

```bash
cd ../account-tracker-backend
go run main.go                    # :8080, loads .env
GIN_MODE=release go run main.go
```

**Before declaring work done**: `npm run build` (typecheck + build) and
`npm run test` must pass.

**`npm run lint` caveat**: it prettier-checks a hardcoded allowlist of ~11 files,
not the project, and three of those files already fail on `main`
(`BookAddRecordSheet.vue`, `stores/personal.ts`,
`tests/member-breakdown.test.ts`). Treat a failure there as pre-existing unless
it names a file you touched. New/edited files should be prettier-clean:
`npx prettier --write <file>`.

---

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Vue 3.5 (`<script setup lang="ts">`, Composition API only) |
| Build | Vite 7, `vue-tsc` for typecheck |
| State | Pinia 3 — one store, see §4 |
| Routing | Vue Router 5 (`createWebHistory`), guard in `src/router/index.ts` |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` (no `tailwind.config` content globs needed) |
| Persistence | IndexedDB via `idb` — `src/stores/storage.ts` |
| HTTP | Axios instance in `src/utils/api.ts` |
| i18n | vue-i18n 11 — `en`, `zh-TW`, `ja` |
| Icons | Material Symbols (ligature font) + `@heroicons/vue` |
| Tests | Vitest 4 + `@vue/test-utils`, `jsdom`, globals enabled |
| PWA | `vite-plugin-pwa`, `registerType: autoUpdate` |
| Native | Capacitor 8 (`ios/`, `capacitor.config.ts`) |
| Analytics | `@vercel/analytics` — `inject()` in `main.ts`, production only |

TypeScript is `strict` with `noUnusedLocals` / `noUnusedParameters`. An unused
import fails the build, not just the linter.

---

## 3. Layout

```
src/
├── main.ts                 # app bootstrap: pinia → router → i18n, analytics inject
├── App.vue                 # theme application (incl. live 'system' listener), toasts
├── router/index.ts         # routes + guard: awaits store.init(), gates on isProfileSet
├── stores/
│   ├── tracker.ts          # THE store — owns all state refs, composes the modules below
│   ├── books.ts            # book/record CRUD, settlement, shared-book push/pull
│   ├── personal.ts         # personal record CRUD
│   ├── categories.ts       # custom category CRUD + allCategories
│   ├── templates.ts        # record template CRUD
│   ├── user.ts             # profile name, theme, animations
│   ├── cloud-sync.ts       # UUID backup/restore
│   ├── storage.ts          # IndexedDB get/put + STORAGE_KEYS
│   ├── constants.ts        # defaultCategories (ids "e1".."e8", "i1".."i4")
│   └── types.ts            # all shared interfaces
├── components/
│   ├── Base*.vue           # BaseBottomSheet, BaseButton — reusable primitives
│   ├── RecordSheetLayout   # dual-layer layout for the record/template sheets
│   ├── CategoryPickerSheet # category chooser, stacked above a record sheet
│   ├── books/ home/ statistics/   # feature-scoped components
├── composables/
│   ├── useToast.ts         # toast queue
│   └── useEscapeKey.ts     # shared Escape stack — closes only the TOP overlay
├── utils/
│   ├── api.ts              # axios instance + every endpoint call
│   ├── category.ts date.ts memberBreakdown.ts
│   └── piggyImport.ts everydayImport.ts   # third-party backup parsers
├── views/                  # Landing, Login, Home, Books, Statistics, Profile, legal
└── locales/                # en.ts, zh-TW.ts, ja.ts
tests/                      # *.test.ts, mirrors the unit under test
```

---

## 4. Store architecture (the main invariant)

`tracker.ts` is the **only** Pinia store. Everything else is a plain setup
function that receives refs and returns actions:

```ts
const bookActions = setupBookActions(books, records, currentBookId, userProfile, …, save);
return { ...bookActions, ...personalActions, /* … */ };
```

Rules:

- **Never import a `setup*Actions` function in a component.** Use
  `useTrackerStore()`; every action is flattened onto it.
- **State lives in `tracker.ts`** as `ref`s and is passed down. Modules do not
  own state.
- **`save()` persists everything** to IndexedDB (including tombstones). Call it
  after any mutation. It never throws — `saveToStorage` returns `false` on
  failure and logs.
- **`init()` is idempotent and lazy**; it returns the same promise on re-entry.
  The router guard awaits it before evaluating any rule.
- Adding a domain? New `setup*Actions` module + refs in `tracker.ts` + a
  `STORAGE_KEYS` entry + include it in `save()`/`init()`.

### Data model (key fields)

```ts
Book            { id, name, members[], createdAt, shareCode?, isSynced? }
Member          { id, name, userId? }        // userId = the owner's PUBLIC memberId
RecordItem      { id, bookId, type, amount, category, date, note,
                  paidById, splitAmongIds[], splitCustomAmounts?, isSynced? }
PersonalRecord  { id, type, amount, category, date, note, sourceBookId?, isSynced? }
Category        { id, name, type, icon, color, isDefault, isSynced? }
RecordTemplate  { id, name, type, amount, category, note, isSynced? }
UserProfile     { id, memberId, name, theme, animations }
```

**`UserProfile.id` vs `memberId` — do not conflate them.** `id` is the secret
cloud-backup key (a capability token; it must never leave the device except to
the backup endpoint). `memberId` is the public identity embedded in shared-book
member lists. They are deliberately distinct so joining a shared book cannot
leak the backup key.

Money is stored as a `number` in major units with 2 decimals. Never floor or
truncate it. Split maths is done in **cents** (integers) with the remainder
distributed, so settlements sum to exactly zero — see `memberStats` and
`calcMemberCategoryBreakdown`.

---

## 5. Sync

Two independent, unauthenticated paths.

### UUID backup — manual, full replace

`POST /api/sync/push-uuid`, `GET /api/sync/pull-uuid/{uuid}`, keyed by
`userProfile.id`. Triggered only from `Profile.vue` (`backupByUUID`,
`restoreByUUID`). Push replaces everything server-side in one transaction; on
success all entities get `isSynced = true` and every tombstone is cleared.
`restoreByUUID` is a full local overwrite and adopts the restored UUID as the
local backup key.

These two calls use a 60s timeout, not the 15s axios default: the payload
carries every record the user owns, and a cold serverless start pays for the DB
connect and migration check first.

### Shared books — automatic, merge

`POST /api/shared/share`, `GET|PUT /api/shared/{code}`, keyed by share code.
Push is debounced **300ms per book** (a single shared timer previously let one
book cancel another's pending sync). The backend **merges**: records unioned by
id, ids in `deletedIds` removed, members unioned.

`pullSharedBook` invariants — both exist to prevent data loss, don't "simplify"
them away:

1. Cloud `name`/`members` are adopted only when the book has no pending local
   edit (`isSynced !== false`), so a pull can't revert a rename awaiting push.
   When there *is* a pending edit, cloud members the device doesn't have are
   still unioned in — the incoming records may be paid by them, and a record
   whose `paidById` matches no member breaks settlement and hard-fails the whole
   UUID backup (`records.paid_by_id` is an FK).
2. Local unsynced records win over the cloud copy of the same id, and tombstoned
   ids are filtered out of the incoming set.

### Pending-sync + tombstones

`isSynced: false` marks locally-modified records; `pendingDelete*Ids[]` arrays
(one per entity, persisted in IndexedDB) are tombstones added on every
`delete*()`. Both are cleared by a successful `backupByUUID`; record tombstones
for a shared book also clear after that book's successful shared push, which is
what propagates deletions.

`deletedCategoryIds` is unrelated to tombstones — it hides *default* categories
locally.

---

## 6. UI conventions

- **Overlays**: build on `BaseBottomSheet` (`Teleport` to body, `role="dialog"`,
  `aria-modal`, labelled by title, Escape wired) rather than hand-rolling a
  fixed-position div. It takes `maxHeight`, `roundedClass`, `contentClass` and
  `zClass`.
- **Stacking**: a sheet opened from another sheet must be raised — pass
  `zClass="z-60"` (base sheets are `z-50`). Tailwind v4 generates any `z-<n>`.
- **Escape**: `useEscapeKey(isActiveRef, close)`. All dialogs share one listener
  and a stack so a press closes only the top-most one. Register, never add your
  own `keydown` listener.
- **Category selection** goes through `CategoryPickerSheet`, opened from a
  tappable field row. Do not put a selection grid in `RecordSheetLayout`'s dim
  backdrop — the sheet grows to 90vh and leaves it a sliver, and a mis-tap there
  dismisses the whole sheet.
- **Animations** must respect `store.userProfile.animations` (transitions are
  named conditionally, e.g. `:name="animations ? 'fade' : ''"`).
- **Dark mode**: every colour needs a `dark:` counterpart. Themes are `light`,
  `dark`, `system` (tracked live via `matchMedia`) and `sheep`; never override a
  user's explicit choice during migration.
- **Safe areas**: bottom-anchored UI uses `env(safe-area-inset-bottom)` (see the
  `pb-safe` pattern in the sheets and `BottomNav`).
- Prefer semantic interactive elements: a tappable row is a `<button
  type="button">`, not a `<div>` with `@click`. Note that a `<button>` may not
  contain `<label>`/block-level form elements — use `<span>` inside.

---

## 7. i18n

- Every user-visible string goes through `t()` / `$t()`. No hardcoded copy.
- **A new key must be added to all three locales**: `en.ts`, `zh-TW.ts`,
  `ja.ts`. `fallbackLocale` is `en`, so a key missing from `zh-TW`/`ja`
  silently renders in English — it looks fine in testing and ships untranslated.
  A key missing from `en` too renders as the raw key path.
- Locale is detected from `navigator.language` on first run and persisted under
  `account-tracker-lang`.
- Category labels: default categories are translated by id
  (`categories.e1`, …), custom ones are not. Hence the pervasive
  `$te('categories.'+id) ? $t('categories.'+id) : cat.name` fallback.
  See `src/i18n.ts`.

---

## 8. Testing

Vitest + `@vue/test-utils`, `jsdom`, globals on. Component tests stub the shared
primitives and mock the store/i18n rather than mounting the whole app:

```ts
vi.mock("../src/stores/tracker", () => ({ useTrackerStore: () => store }));
mount(Component, {
  global: {
    mocks: { $t: (k: string) => k, $te: () => false },
    stubs: { BaseBottomSheet: { template: "<div><slot /></div>" }, CategoryIcon: { template: "<span />" } },
  },
});
```

Assert behaviour and emitted events, not markup detail. Pure logic
(`utils/date.ts`, `utils/memberBreakdown.ts`) is tested directly — prefer
extracting logic into `utils/` over testing it through a component.

---

## 9. Environment

```bash
# frontend .env
VITE_API_URL=http://localhost:8080/api    # falls back to this literal if unset
```

Production sets `VITE_API_URL` in the Vercel project. A build without it
silently produces an app that talks to localhost.

```bash
# backend .env
DATABASE_URL=postgresql://…
CORS_ORIGINS=…    # optional extra comma-separated origins
PORT=8080
```

The backend CORS allowlist is explicit and includes the Capacitor native
origins; a new frontend origin will not work until it is added there.
`GET /ping` reports `db` status and the deployed `commit`.

---

## 10. Gotchas

- IndexedDB cannot structured-clone Vue reactive proxies; `saveToStorage`
  deep-clones via `JSON.parse(JSON.stringify(...))`. Anything non-serialisable
  in state will be silently dropped.
- Dates are `YYYY-MM-DD` local strings, not `Date` objects. Use
  `getLocalDateString()` / `parseLocalDateString()` from `utils/date.ts`;
  `new Date("YYYY-MM-DD")` parses as UTC and shifts the day. An empty date
  string crashes Home's grouping — guard before submit.
- Record ids and every other id are v4 UUIDs because the backend columns are
  `UUID`; a non-UUID id fails the whole backup push.
- The default categories are the exception: their ids are `"e1"`…`"i4"` and they
  live only in `constants.ts`. They are never pushed to the backend.
- Guard double submits: the sheets use a `submitting` flag.
