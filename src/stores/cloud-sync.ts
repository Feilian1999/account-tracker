import type { Ref } from "vue";
import type { Book, RecordItem, Category, PersonalRecord, RecordTemplate, UserProfile } from "./types";
import { pushSyncData, pullSyncData } from "../utils/api";
import { useToast } from "../composables/useToast";

/**
 * Full cloud sync (push/pull all data).
 * Used for authenticated Google users.
 */
export function setupCloudSyncActions(
  userProfile: Ref<UserProfile>,
  books: Ref<Book[]>,
  records: Ref<RecordItem[]>,
  personalRecords: Ref<PersonalRecord[]>,
  customCategories: Ref<Category[]>,
  recordTemplates: Ref<RecordTemplate[]>,
  save: () => void
) {
  const toast = useToast();

  const syncToCloud = async () => {
    if (!userProfile.value.isLoggedIn || !userProfile.value.authToken) return;
    const payload = {
      books: books.value,
      records: records.value,
      personal_records: personalRecords.value,
      categories: customCategories.value,
      templates: recordTemplates.value,
    };
    try {
      await pushSyncData(payload);
      toast.success("資料已成功同步至雲端！");
    } catch {
      toast.error("同步失敗，請稍後再試。");
    }
  };

  const overwriteFromCloud = async () => {
    if (!userProfile.value.isLoggedIn || !userProfile.value.authToken) return;
    if (!confirm("這將會覆蓋此裝置上的所有本地資料，確定要繼續嗎？")) return;
    try {
      const response = await pullSyncData();
      const data = response.data;
      customCategories.value = data.categories || [];
      books.value = data.books || [];
      records.value = data.records || [];
      personalRecords.value = data.personal_records || [];
      recordTemplates.value = data.templates || [];
      save();
      toast.success("資料已成功從雲端回復！");
    } catch {
      toast.error("下載失敗，請稍後再試。");
    }
  };

  return { syncToCloud, overwriteFromCloud };
}
