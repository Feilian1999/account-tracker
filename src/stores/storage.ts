/**
 * Typed localStorage helpers with error handling.
 */

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    console.warn(`[storage] Failed to read key "${key}", using fallback.`);
    return fallback;
  }
}

export function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[storage] Failed to save key "${key}":`, e);
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
} as const;
