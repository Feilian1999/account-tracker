import { ref, type Ref } from "vue";
import type { Book, RecordItem, Category, PersonalRecord, RecordTemplate, UserProfile } from "./types";
import { pushSyncByUUID, pullSyncByUUID } from "../utils/api";
import { saveToStorage, STORAGE_KEYS } from "./storage";
import { useToast } from "../composables/useToast";
import { i18n } from "../i18n";

/**
 * Cloud backup/restore keyed by the user's secret local UUID.
 * There is no account system — the UUID is the only credential, so it must be
 * kept secret (see UserProfile.id vs memberId).
 */
export function setupCloudSyncActions(
  userProfile: Ref<UserProfile>,
  books: Ref<Book[]>,
  records: Ref<RecordItem[]>,
  personalRecords: Ref<PersonalRecord[]>,
  customCategories: Ref<Category[]>,
  recordTemplates: Ref<RecordTemplate[]>,
  pendingDeleteRecordIds: Ref<string[]>,
  pendingDeletePersonalRecordIds: Ref<string[]>,
  pendingDeleteBookIds: Ref<string[]>,
  pendingDeleteCustomCategoryIds: Ref<string[]>,
  pendingDeleteTemplateIds: Ref<string[]>,
  pendingDeleteMemberIds: Ref<string[]>,
  save: () => Promise<void>
) {
  const toast = useToast();
  const { t } = i18n.global;
  const isSyncing = ref(false);

  /** Count all locally-modified items not yet pushed to cloud. */
  const countPending = () =>
    records.value.filter((r) => !r.isSynced).length +
    personalRecords.value.filter((r) => !r.isSynced).length +
    books.value.filter((b) => !b.isSynced).length +
    customCategories.value.filter((c) => !c.isSynced).length +
    recordTemplates.value.filter((t) => !t.isSynced).length +
    pendingDeleteRecordIds.value.length +
    pendingDeletePersonalRecordIds.value.length +
    pendingDeleteBookIds.value.length +
    pendingDeleteCustomCategoryIds.value.length +
    pendingDeleteTemplateIds.value.length +
    pendingDeleteMemberIds.value.length;

  /** Mark all local data as synced and clear all tombstones. */
  const markAllSynced = async () => {
    records.value.forEach((r) => { r.isSynced = true; });
    personalRecords.value.forEach((r) => { r.isSynced = true; });
    books.value.forEach((b) => { b.isSynced = true; });
    customCategories.value.forEach((c) => { c.isSynced = true; });
    recordTemplates.value.forEach((t) => { t.isSynced = true; });

    pendingDeleteRecordIds.value = [];
    pendingDeletePersonalRecordIds.value = [];
    pendingDeleteBookIds.value = [];
    pendingDeleteCustomCategoryIds.value = [];
    pendingDeleteTemplateIds.value = [];
    pendingDeleteMemberIds.value = [];

    await Promise.all([
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_RECORDS, []),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_PERSONAL_RECORDS, []),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_BOOKS, []),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_CUSTOM_CATEGORIES, []),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_TEMPLATES, []),
      saveToStorage(STORAGE_KEYS.PENDING_DELETE_MEMBERS, []),
    ]);
  };

  const backupByUUID = async () => {
    if (isSyncing.value) return false;
    isSyncing.value = true;
    const payload = {
      books: books.value,
      records: records.value,
      personal_records: personalRecords.value,
      categories: customCategories.value,
      templates: recordTemplates.value,
    };
    try {
      await pushSyncByUUID(userProfile.value.id, payload);
      await markAllSynced();
      await save();
      toast.success(t("sync.backupSuccess"));
      return true;
    } catch {
      toast.error(t("sync.backupError"));
      return false;
    } finally {
      isSyncing.value = false;
    }
  };

  const restoreByUUID = async (uuid: string) => {
    if (!uuid || isSyncing.value) return false;

    const pendingCount = countPending();
    if (pendingCount > 0) {
      if (!confirm(t("sync.confirmOverwriteWithPending", { count: pendingCount }))) return false;
    } else {
      if (!confirm(t("sync.confirmOverwrite"))) return false;
    }

    isSyncing.value = true;
    try {
      const response = await pullSyncByUUID(uuid);
      if (response.data) {
        // Full overwrite: reset all pending state first, then apply.
        pendingDeleteRecordIds.value = [];
        pendingDeletePersonalRecordIds.value = [];
        pendingDeleteBookIds.value = [];
        pendingDeleteCustomCategoryIds.value = [];
        pendingDeleteTemplateIds.value = [];
        pendingDeleteMemberIds.value = [];

        customCategories.value = (response.data.categories || []).map((c: Category) => ({ ...c, isSynced: true }));
        books.value = (response.data.books || []).map((b: Book) => ({ ...b, isSynced: true }));
        records.value = (response.data.records || []).map((r: RecordItem) => ({ ...r, isSynced: true }));
        personalRecords.value = (response.data.personal_records || []).map((r: PersonalRecord) => ({ ...r, isSynced: true }));
        recordTemplates.value = (response.data.templates || []).map((t: RecordTemplate) => ({ ...t, isSynced: true }));

        // Adopt the restored backup's UUID as our own backup key.
        userProfile.value.id = uuid;
        await save();

        toast.success(t("sync.restoreUUIDSuccess"));
        return true;
      }
    } catch {
      toast.error(t("sync.restoreUUIDError"));
    } finally {
      isSyncing.value = false;
    }
    return false;
  };

  return { backupByUUID, restoreByUUID, countPending, isSyncing };
}
