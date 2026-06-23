import { defineStore } from "pinia";
import { ref } from "vue";
import type { Book, RecordItem, PersonalRecord, UserProfile, Category, RecordTemplate } from "./types";
import { loadFromStorage, saveToStorage, STORAGE_KEYS, migrateFromLocalStorage } from "./storage";
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
  const isInitialized = ref(false);
  const books = ref<Book[]>([]);
  const records = ref<RecordItem[]>([]);
  const currentBookId = ref<string | null>(null);
  const personalRecords = ref<PersonalRecord[]>([]);

  const userProfileDefaults: UserProfile = { id: "", name: "", theme: "sheep", animations: true, isLoggedIn: false };
  // Pre-initialize theme from localStorage to prevent flash
  const initialTheme = (localStorage.getItem("account-tracker-theme") as any) || "sheep";
  const userProfile = ref<UserProfile>({ ...userProfileDefaults, theme: initialTheme });

  const customCategories = ref<Category[]>([]);
  const deletedCategoryIds = ref<string[]>([]);
  const recordTemplates = ref<RecordTemplate[]>([]);

  // =====================
  //  Tombstone State (pending deletes not yet pushed to cloud)
  // =====================
  const pendingDeleteRecordIds = ref<string[]>([]);
  const pendingDeletePersonalRecordIds = ref<string[]>([]);
  const pendingDeleteBookIds = ref<string[]>([]);
  const pendingDeleteCustomCategoryIds = ref<string[]>([]);
  const pendingDeleteTemplateIds = ref<string[]>([]);

  // =====================
  //  Persistence
  // =====================

  let initPromise: Promise<void> | null = null;
  /**
   * Initializes the store by migrating from localStorage (if needed)
   * and loading data from IndexedDB.
   */
  const init = () => {
    if (isInitialized.value) return Promise.resolve();
    if (initPromise) return initPromise;

    initPromise = (async () => {
      // 1. One-time migration from localStorage to IDB
      await migrateFromLocalStorage();

      // 2. Load all pieces of state from IndexedDB
      const [
        loadedBooks,
        loadedRecords,
        loadedCurrentBookId,
        loadedPersonalRecords,
        loadedUserProfile,
        loadedCustomCategories,
        loadedDeletedCategories,
        loadedTemplates,
        loadedPendingDeleteRecords,
        loadedPendingDeletePersonalRecords,
        loadedPendingDeleteBooks,
        loadedPendingDeleteCustomCategories,
        loadedPendingDeleteTemplates,
      ] = await Promise.all([
        loadFromStorage(STORAGE_KEYS.BOOKS, []),
        loadFromStorage(STORAGE_KEYS.RECORDS, []),
        loadFromStorage(STORAGE_KEYS.CURRENT_BOOK, null),
        loadFromStorage(STORAGE_KEYS.PERSONAL_RECORDS, []),
        loadFromStorage(STORAGE_KEYS.USER_PROFILE, userProfileDefaults),
        loadFromStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, []),
        loadFromStorage(STORAGE_KEYS.DELETED_CATEGORIES, []),
        loadFromStorage(STORAGE_KEYS.TEMPLATES, []),
        loadFromStorage(STORAGE_KEYS.PENDING_DELETE_RECORDS, []),
        loadFromStorage(STORAGE_KEYS.PENDING_DELETE_PERSONAL_RECORDS, []),
        loadFromStorage(STORAGE_KEYS.PENDING_DELETE_BOOKS, []),
        loadFromStorage(STORAGE_KEYS.PENDING_DELETE_CUSTOM_CATEGORIES, []),
        loadFromStorage(STORAGE_KEYS.PENDING_DELETE_TEMPLATES, []),
      ]);

      books.value = loadedBooks;
      records.value = loadedRecords;
      currentBookId.value = loadedCurrentBookId;
      personalRecords.value = loadedPersonalRecords;

      userProfile.value = { ...userProfileDefaults, ...loadedUserProfile };

      // Ensure user has a UUID
      if (!userProfile.value.id) {
        userProfile.value.id = crypto.randomUUID();
        // Proactively register the new user on the backend
        setTimeout(() => {
          cloudSyncActions.backupByUUID();
        }, 500);
      }

      // Theme migration: if theme was 'system' (old default) or missing, change to 'sheep'
      if (!userProfile.value.theme || userProfile.value.theme === "system") {
        userProfile.value.theme = "sheep";
      }

      customCategories.value = loadedCustomCategories || [];
      deletedCategoryIds.value = loadedDeletedCategories || [];
      recordTemplates.value = loadedTemplates || [];

      pendingDeleteRecordIds.value = loadedPendingDeleteRecords || [];
      pendingDeletePersonalRecordIds.value = loadedPendingDeletePersonalRecords || [];
      pendingDeleteBookIds.value = loadedPendingDeleteBooks || [];
      pendingDeleteCustomCategoryIds.value = loadedPendingDeleteCustomCategories || [];
      pendingDeleteTemplateIds.value = loadedPendingDeleteTemplates || [];

      isInitialized.value = true;

      // Save the migrated profile if needed (theme change or new UUID)
      if (
        (userProfile.value.theme === "sheep" && loadedUserProfile?.theme !== "sheep") ||
        (!loadedUserProfile?.id)
      ) {
        await saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile.value);
      }

    })();

    return initPromise;
  };

  const save = async () => {
    await Promise.all([
      saveToStorage(STORAGE_KEYS.BOOKS, books.value),
      saveToStorage(STORAGE_KEYS.RECORDS, records.value),
      saveToStorage(STORAGE_KEYS.CURRENT_BOOK, currentBookId.value),
      saveToStorage(STORAGE_KEYS.PERSONAL_RECORDS, personalRecords.value),
      saveToStorage(STORAGE_KEYS.USER_PROFILE, userProfile.value),
      saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value),
      saveToStorage(STORAGE_KEYS.TEMPLATES, recordTemplates.value),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_RECORDS, pendingDeleteRecordIds.value),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_PERSONAL_RECORDS, pendingDeletePersonalRecordIds.value),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_BOOKS, pendingDeleteBookIds.value),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_CUSTOM_CATEGORIES, pendingDeleteCustomCategoryIds.value),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_TEMPLATES, pendingDeleteTemplateIds.value),
    ]);
  };

  // =====================
  //  Compose Sub-modules
  // =====================
  const userActions = setupUserActions(userProfile, save);
  const categoryActions = setupCategoryActions(customCategories, deletedCategoryIds, pendingDeleteCustomCategoryIds);
  const bookActions = setupBookActions(books, records, currentBookId, userProfile, pendingDeleteBookIds, pendingDeleteRecordIds, save);
  const personalActions = setupPersonalActions(personalRecords, bookActions.memberStats, bookActions.currentBook, pendingDeletePersonalRecordIds, save);
  const templateActions = setupTemplateActions(recordTemplates, pendingDeleteTemplateIds, save);
  const cloudSyncActions = setupCloudSyncActions(
    userProfile,
    books,
    records,
    personalRecords,
    customCategories,
    recordTemplates,
    pendingDeleteRecordIds,
    pendingDeletePersonalRecordIds,
    pendingDeleteBookIds,
    pendingDeleteCustomCategoryIds,
    pendingDeleteTemplateIds,
    save,
  );

  // =====================
  //  Return All
  // =====================
  return {
    // State
    isInitialized,
    userProfile,
    books,
    records,
    currentBookId,
    personalRecords,
    customCategories,
    recordTemplates,

    // Lifecycle
    init,
    save,

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
