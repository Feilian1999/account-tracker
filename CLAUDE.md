# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS v4
- **Routing**: Vue Router v5
- **Storage**: IndexedDB via `idb` (offline-first)
- **HTTP**: Axios (`src/utils/api.ts`)
- **Mobile**: Capacitor 8 (iOS/Android wrapper)
- **i18n**: vue-i18n, locales at `src/locales/en.ts` & `zh-TW.ts`
- **Backend**: Go + Gin + PostgreSQL (Neon DB), repo: `../account-tracker-backend`
- **Deploy**: Vercel (frontend static, backend serverless via `api/index.go`)

## Commands

```bash
npm run dev       # dev server (localhost:5173)
npm run build     # vue-tsc + vite build
npm run preview   # preview build
```

Backend (in `../account-tracker-backend`):
```bash
go run main.go                    # local server (port 8080)
GIN_MODE=release go run main.go
```

## File Map

```
src/
├── stores/
│   ├── types.ts          # All interfaces: Book, RecordItem, PersonalRecord, Category, RecordTemplate, UserProfile
│   ├── constants.ts      # defaultCategories[]
│   ├── storage.ts        # IndexedDB helpers (loadFromStorage/saveToStorage) + STORAGE_KEYS
│   ├── tracker.ts        # Root Pinia store — composes all submodules, owns all state refs
│   ├── books.ts          # Book/RecordItem CRUD + shared book sync (pullSharedBook/syncSharedBook)
│   ├── personal.ts       # PersonalRecord CRUD
│   ├── categories.ts     # Custom category CRUD (default categories are in constants.ts)
│   ├── templates.ts      # RecordTemplate CRUD
│   ├── user.ts           # User profile actions (login, theme, animations)
│   └── cloud-sync.ts     # Cloud push/pull/merge logic (see Sync section below)
├── utils/
│   ├── api.ts            # Axios instance + all API call functions
│   ├── piggyImport.ts    # Parser for 小豬記帳本 .txt backup
│   └── everydayImport.ts # Parser for 天天記帳 .csv backup
├── views/
│   ├── Login.vue         # Anonymous name-entry screen (sets profile name, then → /dashboard)
│   ├── Profile.vue       # Settings, cloud sync buttons, UUID backup/restore
│   ├── Home.vue          # Personal records tab
│   ├── Books.vue         # Shared books tab
│   └── Statistics.vue    # Spending charts
├── components/           # UI components (modals, sheets, calculator keyboard, etc.)
├── locales/              # en.ts, zh-TW.ts — add new keys to BOTH files
└── i18n.ts               # vue-i18n setup
```

## Data Models (key fields only)

```typescript
Book            { id, name, members[], createdAt, shareCode?, isSynced? }
Member          { id, name, userId? }  // userId links member to a UserProfile
RecordItem      { id, bookId, type, amount, category, date, note, paidById, splitAmongIds[], splitCustomAmounts?, isSynced? }
PersonalRecord  { id, type, amount, category, date, note, sourceBookId?, isSynced? }
Category        { id, name, type, icon, color, isDefault, isSynced? }
RecordTemplate  { id, name, type, amount, category, note, isSynced? }
UserProfile     { id, memberId, name, theme, animations }
```

`isSynced?: boolean` — `undefined`/`false` = not yet backed up to cloud; `true` = backed up.

`UserProfile.id` is the **secret** cloud-backup key (never leaves the device except to the backup endpoint). `UserProfile.memberId` is the **public** identity embedded in shared-book member lists. They are deliberately different so joining a shared book never leaks the backup key. There are no accounts/login — every user is anonymous.

## Sync Architecture

Two separate cloud paths (no Google/JWT — that was removed):

### 1. UUID Backup (`/api/sync/push-uuid`, `/api/sync/pull-uuid/{uuid}`)
- Identified by the user's secret local UUID (`userProfile.id`); no auth.
- Push = full replace on backend (DELETE all → INSERT all, one transaction).
- Manual only, from Profile.vue (`backupByUUID`, `restoreByUUID`).
- On backup success: all entities marked `isSynced=true`, all tombstones cleared.

### 2. Shared Book Sync (`/api/shared/{code}`)
- No auth, identified by share code. Members embed `memberId` (not the backup id).
- Per-book: `updateSharedBook` (push, backend MERGES by record id + `deletedIds`), `fetchSharedBook` (pull).
- Auto-triggered: every `addRecord`/`updateRecord`/`deleteRecord` — debounced 300ms **per book** (keyed timer).
- Auto-pulled: on `selectBook` / `watch(currentBookId)`. Pull only overwrites book name/members when there is no pending local edit (`book.isSynced !== false`).

## Pending Sync & Tombstone System

Protects locally-created/modified data from being overwritten by cloud pulls.

### `isSynced` flag
Set to `false` on: `addRecord`, `updateRecord`, `createBook`, `updateBook`, `addMemberToBook`, `addPersonalRecord`, `updatePersonalRecord`, `addCustomCategory`, `addTemplate`, `updateTemplate`, `importPersonalRecords`

Set to `true` on: successful `backupByUUID`; shared-book records after a successful shared push; items from `restoreByUUID`

### Tombstone arrays (stored in IndexedDB)
```
pendingDeleteRecordIds[]          // STORAGE_KEYS.PENDING_DELETE_RECORDS
pendingDeletePersonalRecordIds[]  // STORAGE_KEYS.PENDING_DELETE_PERSONAL_RECORDS
pendingDeleteBookIds[]            // STORAGE_KEYS.PENDING_DELETE_BOOKS
pendingDeleteCustomCategoryIds[]  // STORAGE_KEYS.PENDING_DELETE_CUSTOM_CATEGORIES
pendingDeleteTemplateIds[]        // STORAGE_KEYS.PENDING_DELETE_TEMPLATES
```
Added to on: every `delete*()` call (regardless of `isSynced` state)
Cleared on: successful `backupByUUID`; record tombstones for a shared book are also cleared after that book's successful shared push (so deletes propagate via `deletedIds`).

### `restoreByUUID`
Explicit user action = full overwrite of local state with the backup. Shows `sync.confirmOverwriteWithPending` warning if `countPending() > 0`, and adopts the restored UUID as the local backup key.

## Storage Keys (IndexedDB)

All defined in `STORAGE_KEYS` in `storage.ts`:
`tracker_books`, `tracker_records_v2`, `tracker_current_book`, `tracker_personal_records`,
`tracker_user_profile`, `tracker_custom_categories`, `tracker_deleted_categories`, `tracker_templates`,
`tracker_pending_delete_records`, `tracker_pending_delete_personal_records`,
`tracker_pending_delete_books`, `tracker_pending_delete_custom_categories`, `tracker_pending_delete_templates`

`tracker_deleted_categories` = hides default categories locally (different from tombstone system)

## Environment

```
VITE_API_URL=http://localhost:8080/api   # backend base URL
```

Backend `.env`:
```
DATABASE_URL=postgresql://...
CORS_ORIGINS=...   # optional, extra comma-separated allowed origins
PORT=8080
```

## Key Patterns

- **`tracker.ts` is the only store** — all submodules (`setupBookActions`, etc.) are functions that receive refs and return actions, composed in `tracker.ts`. Never import submodule setup functions directly in components.
- **`save()`** persists ALL state to IndexedDB atomically (including tombstones). Called after every mutation.
- **`init()`** is idempotent and lazy — only runs once, returns the same promise if called again.
- **Adding i18n keys**: always add to BOTH `en.ts` and `zh-TW.ts`.
- **Shared book records** use the same `RecordItem` type but also sync via shared book API. `isSynced` tracks main cloud sync state only.
- **`deletedCategoryIds`** (existing) hides default built-in categories locally — separate from the tombstone `pendingDeleteCustomCategoryIds` which tracks unsynced custom category deletions.
