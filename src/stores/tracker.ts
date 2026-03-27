import { defineStore } from "pinia";
import { ref } from "vue";
import type { Book, RecordItem, PersonalRecord, UserProfile, Category, RecordTemplate } from "./types";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "./storage";
import { setupUserActions } from "./user";
import { setupCategoryActions } from "./categories";
import { setupBookActions } from "./books";
import { setupPersonalActions } from "./personal";
import { setupTemplateActions } from "./templates";
import { setupCloudSyncActions } from "./cloud-sync";

// Re-export types & constants for backward compatibility
export type { Member, Book, RecordItem, PersonalRecord, RecordTemplate, UserProfile, Category, Settlement } from "./types";
export { defaultCategories } from "./constants";

export const useTrackerStore = defineStore("tracker", () => {
  // =====================
  //  Reactive State
  // =====================
  const books = ref<Book[]>(loadFromStorage(STORAGE_KEYS.BOOKS, []));
  const records = ref<RecordItem[]>(loadFromStorage(STORAGE_KEYS.RECORDS, []));
  const currentBookId = ref<string | null>(loadFromStorage(STORAGE_KEYS.CURRENT_BOOK, null));
  const personalRecords = ref<PersonalRecord[]>(loadFromStorage(STORAGE_KEYS.PERSONAL_RECORDS, []));

  const userProfileDefaults: UserProfile = { name: "", theme: "system", animations: true, isLoggedIn: false };
  const userProfile = ref<UserProfile>({
    ...userProfileDefaults,
    ...loadFromStorage(STORAGE_KEYS.USER_PROFILE, userProfileDefaults),
  });

  const customCategories = ref<Category[]>(loadFromStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, []));
  const deletedCategoryIds = ref<string[]>(loadFromStorage(STORAGE_KEYS.DELETED_CATEGORIES, []));
  const recordTemplates = ref<RecordTemplate[]>(loadFromStorage(STORAGE_KEYS.TEMPLATES, []));

  // =====================
  //  Persistence
  // =====================
  const save = () => {
    saveToStorage(STORAGE_KEYS.BOOKS, books.value);
    saveToStorage(STORAGE_KEYS.RECORDS, records.value);
    saveToStorage(STORAGE_KEYS.CURRENT_BOOK, currentBookId.value);
    saveToStorage(STORAGE_KEYS.PERSONAL_RECORDS, personalRecords.value);
    saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile.value);
    saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value);
    saveToStorage(STORAGE_KEYS.TEMPLATES, recordTemplates.value);
  };

  // =====================
  //  Compose Sub-modules
  // =====================
  const userActions = setupUserActions(userProfile, save);
  const categoryActions = setupCategoryActions(customCategories, deletedCategoryIds);
  const bookActions = setupBookActions(books, records, currentBookId, userProfile, save);
  const personalActions = setupPersonalActions(personalRecords, bookActions.memberStats, bookActions.currentBook, save);
  const templateActions = setupTemplateActions(recordTemplates, save);
  const cloudSyncActions = setupCloudSyncActions(userProfile, books, records, personalRecords, customCategories, recordTemplates, save);

  // =====================
  //  Return All
  // =====================
  return {
    // State
    userProfile,
    books,
    records,
    currentBookId,
    personalRecords,
    customCategories,
    recordTemplates,

    // User
    ...userActions,

    // Categories
    ...categoryActions,

    // Books (CRUD + Settlement + Shared Sync)
    ...bookActions,

    // Personal Records
    ...personalActions,

    // Templates
    ...templateActions,

    // Cloud Sync
    ...cloudSyncActions,
  };
});
