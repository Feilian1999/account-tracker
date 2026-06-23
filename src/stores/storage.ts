import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "account-tracker-db";
const STORE_NAME = "key-value-store";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
  }
  return dbPromise;
}

/**
 * Migration from localStorage to IndexedDB.
 * Should be called during store initialization.
 */
export async function migrateFromLocalStorage() {
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    const localData = localStorage.getItem(storageKey);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        await saveToStorage(storageKey, parsed);
        // After successful migration to IDB, we can optionally clear localStorage
        // but it's safer to keep it for one more version or clear it specifically.
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error(`[storage] Failed to migrate ${key}:`, e);
      }
    }
  }
}

export async function loadFromStorage<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await getDB();
    const data = await db.get(STORE_NAME, key);
    // Treat both undefined and null as "not found" to use fallback
    return (data !== undefined && data !== null) ? data : fallback;
  } catch (e) {
    console.warn(`[storage] Failed to read key "${key}" from IndexedDB, using fallback.`, e);
    return fallback;
  }
}

export async function saveToStorage(key: string, data: unknown) {
  try {
    const db = await getDB();
    // Deep-clone to strip Vue reactive Proxy wrappers — IndexedDB's
    // structured-clone algorithm cannot handle Proxy objects.
    const raw = JSON.parse(JSON.stringify(data));
    await db.put(STORE_NAME, raw, key);
  } catch (e) {
    console.error(`[storage] Failed to save key "${key}" to IndexedDB:`, e);
  }
}

// Storage key constants
export const STORAGE_KEYS = {
  BOOKS: "tracker_books",
  RECORDS: "tracker_records_v2",
  CURRENT_BOOK: "tracker_current_book",
  PERSONAL_RECORDS: "tracker_personal_records",
  USER_PROFILE: "tracker_user_profile",
  CUSTOM_CATEGORIES: "tracker_custom_categories",
  DELETED_CATEGORIES: "tracker_deleted_categories",
  TEMPLATES: "tracker_templates",
  // Tombstone keys: IDs of locally-deleted items not yet pushed to cloud
  PENDING_DELETE_RECORDS: "tracker_pending_delete_records",
  PENDING_DELETE_PERSONAL_RECORDS: "tracker_pending_delete_personal_records",
  PENDING_DELETE_BOOKS: "tracker_pending_delete_books",
  PENDING_DELETE_CUSTOM_CATEGORIES: "tracker_pending_delete_custom_categories",
  PENDING_DELETE_TEMPLATES: "tracker_pending_delete_templates",
} as const;
