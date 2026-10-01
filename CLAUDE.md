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

**`npm run lint` caveat**: it prettier-checks a hardcoded allowlist of ~11 files
(plus `tests/*.ts`), not the project. The allowlist currently passes, so a
failure there is yours. Files outside it (most components) are not
prettier-formatted — do not reformat them wholesale in an
unrelated change; the diff will bury the real edit. New files should be
prettier-clean: `npx prettier --write <file>`.

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
├── App.vue                 # theme application (incl. live 'system' listener), toasts,
│                           #   global keyboard shortcuts + shortcut help sheet
├── style.css               # Tailwind entry, `.theme-sheep` overrides, @layer components
├── router/index.ts         # routes + guard: awaits store.init(), gates on isProfileSet
├── stores/
│   ├── tracker.ts          # THE store — owns all state refs, composes the modules below
│   ├── books.ts            # book/record CRUD, settlement, shared-book push/pull
│   ├── personal.ts         # personal record CRUD
│   ├── categories.ts       # custom category CRUD + allCategories
│   ├── templates.ts        # record template CRUD
│   ├── user.ts             # profile name, theme, animations
│   ├── base-currency.ts    # base currency + re-expressing personal records (§5a)
│   ├── cloud-sync.ts       # UUID backup/restore
│   ├── storage.ts          # IndexedDB get/put + STORAGE_KEYS
│   ├── constants.ts        # defaultCategories (ids "e1".."e8", "i1".."i4")
│   └── types.ts            # all shared interfaces
├── components/
│   ├── Base*.vue           # BaseBottomSheet, BaseButton — reusable primitives
│   ├── RecordSheetLayout   # dual-layer layout for the record/template sheets
│   ├── CategoryPickerSheet # category chooser, stacked above a record sheet
│   ├── CurrencySelect FxRateRow RecordAmount   # currency picker, rate row, record amount
│   ├── books/ home/ statistics/   # feature-scoped components
├── composables/
│   ├── useToast.ts         # toast queue
│   ├── useEscapeKey.ts     # shared Escape stack — closes only the TOP overlay
│   ├── useFxInput.ts       # record-form currency + rate state (fetch, pin, build)
│   ├── usePrimaryAction.ts # Ctrl/⌘+Enter registry — highest active priority wins
│   └── useFitText.ts       # shrink a total's font to fit one line (wraps only at min)
├── utils/
│   ├── api.ts              # axios instance + every endpoint call
│   ├── category.ts         # colorMap, category icon/colour lookup, date formatting
│   ├── date.ts memberBreakdown.ts
│   ├── currency.ts         # currency table, formatMoney, rebaseRecord, splitEvenly…
│   ├── fxRates.ts          # daily rates from the network, cached in IndexedDB
│   ├── settlement.ts       # calcMemberStats / calcSettlements (book currency)
│   ├── amountExpression.ts # "500+250*2", "1,000", "20%" → number (custom split input)
│   └── piggyImport.ts everydayImport.ts   # 小豬記帳本 .txt / 天天記帳 .csv parsers
├── views/                  # Landing, Login, Home, Books, Statistics, Profile, legal
└── locales/                # en.ts, zh-TW.ts, ja.ts
tests/                      # *.test.ts, mirrors the unit under test
docs/superpowers/           # past feature specs/plans (historical, not maintained)
```

Routes: `/` Landing, `/login`, `/privacy`, `/terms` are public; `/dashboard`
(Home, personal records), `/books`, `/statistics`, `/profile` require
`isProfileSet` (a non-empty name — "login" just sets the name). `Books.vue`
switches between `BookList` and `BookDetail` in-page; the selected book is not in
the URL.

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
- Exceptions to "call `save()`": `categories.ts` and `user.ts` (`setTheme`,
  `setAnimations`) write their own keys via `saveToStorage` directly.
  `DELETED_CATEGORIES` is *only* written by `categories.ts` — it is not in
  `save()`.

### Data model (key fields)

```ts
Book            { id, name, members[], createdAt, currency?, shareCode?, isSynced? }
Member          { id, name, userId? }        // userId = the owner's PUBLIC memberId
RecordItem      { id, bookId, type, amount, category, date, note,
                  paidById, splitAmongIds[], splitCustomAmounts?, isSynced?,
                  ...money }
PersonalRecord  { id, type, amount, category, date, note, sourceBookId?, isSynced?,
                  ...money }
money           { amountCurrency?, original?, booked?, fx? }   // see §5a
Category        { id, name, type, icon, color, isDefault, isSynced? }
RecordTemplate  { id, name, type, amount: number|null, currency?, category, note, isSynced? }
UserProfile     { id, memberId, name, theme, animations, baseCurrency? }
```

**Members** are edited as rows (`MemberListEditor`, drafts in
`utils/member.ts`), never as a list of names. Every draft carries an id — an
existing member's, or a fresh UUID made when the row is added (so the avatar
colour, derived from the id, doesn't change on save). `createBook` /
`updateBook` treat a known id as a rename and any other id as a new member;
there is no name matching. The editor enforces unique, non-blank names (joining
suggests a member by name), keeps "me" (the `isSelf` member) unremovable and
blocks removing a member any record involves (`memberRecordCount`, which also
counts legacy `"all"` splits). A book without "me" offers "this is me" on
unlinked rows. `MemberAvatar` renders a member everywhere (initial + colour by
id, using -100/-800 shades because the sheep theme re-colours -50 backgrounds).

`splitAmongIds` may contain the literal `"all"` (legacy records) meaning every
current member; every consumer expands it. `paidById` is `""` for income.

**`category` is not the same kind of value everywhere:**

- `RecordItem.category` / `PersonalRecord.category` store the category **name**
  (for default categories, the zh-TW name in `constants.ts`, e.g. `"飲食"`).
  The sheets resolve the picked id to `cat.name` on submit.
- `RecordTemplate.category` stores the category **id**. `Home.vue`'s one-tap
  template path converts id → name before `addPersonalRecord`.
- Lookups therefore match by name (`utils/category.ts`, Statistics,
  settlement) and some also accept an id (`RecordItem.vue`). Renaming a custom
  category — or a record whose category was deleted — falls back to the
  `more_horiz` icon and the raw string. Keep new code consistent with the field
  it touches; don't "fix" one side without migrating stored data.

**`UserProfile.id` vs `memberId` — do not conflate them.** `id` is the secret
cloud-backup key (a capability token; it must never leave the device except to
the backup endpoint). `memberId` is the public identity embedded in shared-book
member lists. They are deliberately distinct so joining a shared book cannot
leak the backup key.

Money is stored as a `number` in major units, rounded to its currency's
precision (`CURRENCIES[code].decimals`: 0 for TWD/JPY/VND/KRW, 2 for
USD/THB/CNY/EUR/GBP;
older TWD records may still carry 2 decimals). Never floor or truncate it.
Settlement maths (`utils/settlement.ts`) accumulates in integer **cents**;
equal splits are divided in the currency's minor unit via `splitEvenly`
(remainder to the first members), so nets sum to exactly zero.
`calcSettlements` greedily matches creditors/debtors with a 0.005 epsilon.
`calcMemberCategoryBreakdown` is display-only: it divides in floats and rounds
each category to the currency's precision, so it need not sum exactly to `owed`.

Amount inputs accept arithmetic (`new Function` behind a
`/^[\d+\-*/. ()]+$/` whitelist — keep the whitelist if you touch it). Custom
split inputs use `parseAmountExpression`, which also accepts `1,000` and `20%`
of the record total.

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

The payload also carries `profile: { baseCurrency }`; restore adopts it (a
backup without one is all-TWD, so restore sets TWD).

**The backup is still partly lossy.** The backend's typed structs only carry the
columns it stores. Persisted since migration 000003: the currency fields and
`splitCustomAmounts`. Still dropped: `Book.shareCode` (a restored book is no
longer linked to its shared space) and `deletedCategoryIds` (hidden default
categories reappear). Adding a field to a synced entity means a backend column
+ migration + both handlers, not just a TS type. `original`/`booked`/`fx` are
opaque JSONB to the backend, so new keys *inside* them round-trip for free.

### Shared books — CRDT (`utils/crdt.ts`, `utils/hlc.ts`, `/api/shared/v2`)

Each shared book has a **replica doc** in `sharedDocs[bookId]` (tracker ref,
`STORAGE_KEYS.SHARED_DOCS`): `{code, version, doc, pending, base?}`. A doc is
entities (`book`, `members[id]`, `records[id]`) made of immutable fields `f`
and last-writer-wins registers `r: {name: {v, t}}`; `t` is a hybrid logical
clock string (`utils/hlc.ts`, node id per device in `STORAGE_KEYS.CRDT_CLOCK`)
compared as a plain string. Merge = per register, the larger `t` wins; `f`
keys are first-writer-wins. It is commutative, associative and idempotent, so
there is no "last push wins": order of arrival doesn't matter.

Invariants — each exists because breaking it lost data before:

- **Local state is always `materialize(doc)`.** A mutation is staged into the
  doc synchronously (`syncSharedBook` → `stageLocal`, which diffs the local
  book/records against the doc and stamps what changed) before the 300ms
  debounced send, so a pull can't wipe an unsent edit. Never write a shared
  book's records without going through the store actions.
- **Registers are grouped by invariant.** A record's `$money` register holds
  type, amount, currency fields, payer and split together, so concurrent edits
  can't merge into a split that doesn't sum to the amount; `category`, `date`,
  `note` merge independently. Keep new money-related fields in `$money`
  (`MONEY_KEYS`).
- **Nothing is deleted.** A deleted record is `deleted: true` forever (a stale
  device can't resurrect it); a removed member is `archived: true` and stays in
  `book.members` (a concurrent record may involve them — settlement still
  counts them). UI lists use `activeMembers()`. Leaving a shared book
  (`deleteBook`) only drops the local replica, never stages deletions.
- **Stage before any `await`.** Store actions call `syncSharedBook` (which
  stages) right after mutating and only then `await save()`; `runSync` also
  stages before applying a response. Otherwise a response landing during the
  await re-materializes the book and the edit is gone. Same reason
  `publishBook` stages edits made while the create request was out, and
  `rebaseOnLegacy` re-materializes at once.
- **A sync that carried a `base` adopts the server's doc** instead of merging:
  two conversions of different v1 payloads are both stamped `ZERO`, and a merge
  would keep the local, possibly stale, value on every tie.
- **Known limitation:** the book currency is its own register. Changing an
  empty shared book's currency while another device adds its first record can
  leave a record in the old currency (the local lock only sees local records).
- **Never drop a replica on a sync error**: `pending` is the only copy of
  unsent edits (a backup restore is the exception: it clears all replicas, since
  restored books are no longer shared). And compare replicas with `toRaw` — `sharedDocs` is reactive,
  so a state read back from it is a proxy, never `===` the object stored.
- **One sync per book at a time** (`syncNow`): a request while one runs becomes
  a single follow-up. A sync sends `pending` + `since: version` and gets back
  every entity changed after `since`; `ackPending` then removes only the
  registers that were sent, so an edit made during the request stays pending.
- **First contact with a v1 space** (`firstContact`: book has a `shareCode` but
  no doc): the server returns `legacy`; `legacyToDoc` converts it
  deterministically at clock `ZERO`, sent once as `base` with `baseOf` = the
  server's `legacyHash` of the payload it was converted from. If an old client
  wrote in between, the server refuses (409 `base_required` + the current
  payload); `rebaseOnLegacy` reconverts and re-applies the pending writes (real
  clocks, so they still win) and retries. Only what the device still owed is staged — unsynced
  records, v1 tombstones, a pending book edit — and the local copy is replaced
  by the doc immediately; re-staging the stale local copy is exactly how v1
  reverted others' edits.

Endpoints: `POST /shared/v2` (create from `docFromLocal`), `GET
/shared/v2/:code?since=`, `POST /shared/v2/:code/sync`. An upgraded space
answers v1 `PUT` with 409, so old app versions can read but not overwrite; their
unsent edits stay local until the app updates. Wire format and flatten
conventions (`$` groups, `deleted`, `f.created`) are shared with the backend —
see its `CLAUDE.md` before changing either side. `tests/helpers/fakeSharedServer.ts`
implements the server's rules for two-device tests (`tests/shared-sync.test.ts`).

Syncs fire on `currentBookId` change (watcher, `immediate`), on `selectBook`,
when `BookDetail` mounts, and when the add-record or settlement sheet opens.
Errors are only logged — there is no user-visible sync failure state.

Joining is two steps and **never adds a member**. `previewSharedBook(code)`
fetches the doc (converting a v1 space); `JoinBookModal` asks "which one are
you?" — the joiner picks an existing unlinked member (the one with their name
is preselected, not auto-claimed) or joins without one.
`joinSharedBook(code, preview, memberId|null)` adopts the doc, links the pick to
the public `memberId` as a staged register (newer than the server's, so a
concurrent pull can't undo it) and syncs immediately. A joiner already linked
(by `memberId`, or the legacy backup `id` — `isSelf` in `utils/member.ts`)
skips the picker. Joining a book id that already exists locally asks to
overwrite it.

`ImportFromBookSheet` temporarily switches `currentBookId` to read
`memberStats` for another book, then restores it. `importMyShareFromBook`
imports a member's `owed` total once per book (keyed by `sourceBookId`).

### 5a. Currencies

Nine currencies (`CurrencyCode` in `types.ts`, table in `utils/currency.ts`).
Symbols are our own (`NT$ ¥ US$ ฿ ₫ CN¥ € ₩ £`), not Intl's, which disagree by
locale. Always render money with `formatMoney(amount, currency, locale)` —
never `toLocaleString()` or a hardcoded `NT$`.

**Where amounts live.** `amount` is always in `amountCurrency` (missing = TWD,
the only currency before this feature — `currencyOf`/`amountCurrencyOf` apply
that default). Book records are in the book's `currency`; personal records in
`userProfile.baseCurrency`. Every sum reads `amount` — so for personal records
use `sumInCurrency(records, type, baseCurrency)`, which skips records whose
`amountCurrency` differs ("pending", see below).

**Anchors.** A record typed in another currency also stores:

- `original` `{amount, currency}` — what was typed (+ `splitCustomAmounts` as
  typed, for foreign custom splits, so editing shows the typed values);
- `booked` `{amount, currency, rate, rateDate, rateSource}` — the converted
  value the user confirmed; never recomputed (keeps a manual card rate);
- `fx` `{rate, rateDate, source}` — how the current `amount` was derived (shown
  by `RecordAmount`'s ⓘ).

Records typed in their target currency store none of these; `originalOf` /
`bookedOf` synthesise them. Build these fields only with `buildMoneyFields`.

**Changing the base currency** (`changeBaseCurrency`, Profile) re-expresses
personal records with `rebaseRecord`, which works **only from the anchors, never
from the current `amount`**: target = booked currency → booked amount; target =
original currency → original amount; otherwise original × that day's rate. So
switching back is exact and repeated switching never drifts. Don't "simplify"
this into converting `amount`. Rates are prefetched first, then the *current*
records are mapped in one pass and saved once. A record whose rate is
unavailable keeps its old currency → it is pending: shown with a badge,
excluded from totals, counted by `pendingConversionCount` (Home banner →
`convertPendingRecords`). Book records are never rebased; a book's currency is
locked once it has records (`updateBook`, `CreateBookModal`).

**Rates** (`utils/fxRates.ts`): `@fawazahmed0/currency-api` via jsDelivr
(pages.dev fallback) — free, no key, CORS, one file per day with all
currencies; ECB sources lack TWD/VND. Each day is cached in IndexedDB
(`STORAGE_KEYS.FX_RATES`, never synced) as units per 1 USD, so any pair works
offline later. `getRate` = cached day → fetch → nearest cached day (`source:
"cached"`). `getCachedRate` is exact-day, cache-only (use it after
`prefetchRates` for deterministic batch conversion). Dates before
`FIRST_RATE_DATE` (2024-03-02, the API's first file) use that day. Today's file
may not exist yet → "latest".

**Forms.** Record sheets use `useFxInput({target, date, amount})` +
`CurrencySelect` + `FxRateRow`. A foreign record cannot be saved without a rate
(auto or typed). A typed rate, or the booked rate of the record being edited,
is pinned until the currency/date changes. Custom splits are entered in the
typed currency, then carried to the book currency with
`allocateProportionally`, so they still sum exactly. Importing a book share
into personal records converts it once at today's rate.

**Shared books** carry `book.currency` in the JSONB payload; the backend merges
book fields shallowly so older clients that omit `currency` cannot erase it,
and `pullSharedBook` adopts it.

### Pending-sync + tombstones

`isSynced: false` marks locally-modified records; `pendingDelete*Ids[]` arrays
(one per entity, persisted in IndexedDB) are tombstones added on every
`delete*()` — including `pendingDeleteMemberIds`, added by `updateBook` for any
member removed from an unshared book. All are cleared by a successful
`backupByUUID`. They only matter for the UUID backup; shared books carry their
own tombstones in the doc (a v1 book's are folded in on first contact).

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
- **Escape and Back**: `useEscapeKey(isActiveRef, close)`. All layers share one
  listener, and a press closes only the **most recently opened** active one —
  ordered by activation time, because a parent registers after its children
  (Books.vue's "back to list" layer must not beat a sheet opened on top of it).
  The browser/OS back button uses the same stack: a `popstate` flag in
  `router/index.ts` (registered before `createRouter` on purpose) makes the
  guard call `closeTopOverlay()` and cancel the navigation, so Back closes a
  sheet instead of leaving the page. With no history entry to go back to (app
  opened directly on that page) the OS still handles Back itself. Register,
  never add your own `keydown`/`popstate` listener.
- **Keyboard shortcuts** live in `App.vue` (one window listener): Ctrl/⌘+Enter
  runs the primary action, Alt+Shift+1–4 switch tabs, Ctrl/⌘+/ toggles the help
  sheet. They are ignored during IME composition (`isComposing` / keyCode 229)
  and before a profile exists; tab switching is ignored in inputs and while a
  modal is open. A new shortcut must also be listed in the `shortcuts` array
  and the `shortcuts.*` i18n keys.
- **Primary action**: `usePrimaryAction(isActiveRef, run, priority)`. Pages
  register at priority 0 ("add"), forms/sheets at 1 ("submit"). When an
  `aria-modal` dialog is open only priority ≥ 1 runs, so a sheet without a
  registered action swallows the shortcut instead of triggering the page's.
  Any new form sheet should register at priority 1.
- **Category selection** goes through `CategoryPickerSheet`, opened from a
  tappable field row. Do not put a selection grid in `RecordSheetLayout`'s dim
  backdrop — the sheet grows to 90vh and leaves it a sliver, and a mis-tap there
  dismisses the whole sheet.
- **Animations** must respect `store.userProfile.animations` (transitions are
  named conditionally, e.g. `:name="animations ? 'fade' : ''"`).
- **Dark mode**: every colour needs a `dark:` counterpart. Themes are `light`,
  `dark`, `system` (tracked live via `matchMedia`) and `sheep` (the default);
  never override a user's explicit choice during migration. The theme is
  mirrored to `localStorage['account-tracker-theme']` so the inline script in
  `index.html` can apply it before Vue mounts (no flash).
- **Sheep theme** is not a Tailwind variant: `style.css` re-colours specific
  utility classes under `.theme-sheep` with `!important` (`.bg-blue-600`,
  `.text-violet-600`, `.from-indigo-500`, …). A colour class not in that list
  keeps its stock colour in the sheep theme — check `style.css` when
  introducing a new accent colour.
- **Shared classes** in `style.css` `@layer components`: `page-container`,
  `section-title`, `hint-text`, `empty-state`, `record-card`, `record-icon`,
  `input-field`, `label-text`, `btn-primary`/`btn-secondary`/`btn-ghost`
  (the text buttons of the small centred modals; `.theme-sheep .btn-primary`
  is re-coloured explicitly, since `@apply`'d utilities don't match the sheep
  selectors), `btn-delete`, `tag-pill`, `header-chip`. Prefer them over
  re-spelling the utilities.
- **Older overlays** (`JoinBookModal`, `ShareBookModal`,
  `MonthSelector`'s picker) hand-roll `Teleport` + `role="dialog"` instead of
  using `BaseBottomSheet`; they still register with `useEscapeKey`. Confirms and
  prompts use native `confirm()` / `prompt()`.
- **Totals are never truncated.** Home's header is `IncomeExpenseSummary`:
  total income (left) and expense (right), sized by `useFitText`, over
  `WaterBar`: income fills from the left to its share and meets expense at a
  slanted, flowing water surface — a sine strip (`utils/waterBar.ts`) that
  loops by exactly one wavelength, transform-only, with a glint passing
  through the water. The surface rests when
  animations are off or the OS asks for reduced motion. Statistics uses `SummaryBar`
  (one row per total); a book shows its total expense only, and its actions
  (share, settle, edit, delete) sit in one header menu so the title has room. Chart axes use compact notation.
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
(`utils/date.ts`, `utils/memberBreakdown.ts`, `utils/amountExpression.ts`,
`usePrimaryAction`) is tested directly — prefer extracting logic into `utils/`
over testing it through a component. Components that call `useI18n()` also need
`vi.mock("vue-i18n", …)`; `Teleport`ed components need `stubs: { teleport: true }`.

Settlement (`utils/settlement.ts`), currency maths (`currency.ts`, including
the TWD→JPY→TWD round trip), rates (`fx-rates.test.ts`, `fetch` and storage
mocked) and `base-currency.ts` are covered. Still untested: `books.ts`
merge/pull and `cloud-sync.ts`. When changing sync logic, add a test for the
invariant you touch rather than relying on manual checks.

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
origins; a new frontend origin will not work until it is added there (or to
`CORS_ORIGINS`). `GET /ping` reports `db` status and the deployed `commit`.
The backend has its own `CLAUDE.md`; read it before changing a payload shape.

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
- Guard double submits: the sheets use a `submitting` flag. Actions that create
  something remotely also dedupe in the store — `publishBook` shares one
  in-flight request per book, because a second share would create a second
  shared space and swap the code under the user.
- `README.md` is stale (mentions Google login, 6-digit codes, two locales).
  Trust this file and the code over it.
- `.npmrc` sets `legacy-peer-deps=true` for `@vercel/analytics`'s vue-router@4
  peer; removing it breaks `npm ci` on Vercel.
- Capacitor: `appId` `id.account.tracker`, `webDir: dist`. Only `ios/` is
  checked in; run `npm run build && npx cap sync` before opening Xcode.
