import type { Ref } from "vue";
import { computed } from "vue";
import type { Book, Category, CategoryOverride, PersonalRecord, RecordItem } from "./types";
import { defaultCategories } from "./constants";
import { saveToStorage, STORAGE_KEYS } from "./storage";

export type CategoryEdit = Pick<Category, "name" | "icon" | "color">;

/**
 * Category management actions.
 */
export function setupCategoryActions(
  customCategories: Ref<Category[]>,
  deletedCategoryIds: Ref<string[]>,
  categoryOverrides: Ref<Record<string, CategoryOverride>>,
  pendingDeleteCustomCategoryIds: Ref<string[]>,
  books: Ref<Book[]>,
  records: Ref<RecordItem[]>,
  personalRecords: Ref<PersonalRecord[]>,
  sharedDocs: Ref<Record<string, unknown>>,
  save: () => Promise<void>
) {
  const allCategories = computed(() =>
    [
      ...defaultCategories.map((c) => ({ ...c, ...categoryOverrides.value[c.id] })),
      ...customCategories.value,
    ].filter((c) => !deletedCategoryIds.value.includes(c.id))
  );

  const addCustomCategory = async (cat: Omit<Category, "id" | "isDefault">) => {
    const newCat: Category = { ...cat, id: crypto.randomUUID(), isDefault: false, isSynced: false };
    customCategories.value.push(newCat);
    await saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value);
  };

  /**
   * Records store the category *name*, so a rename rewrites the records that
   * use it — personal ones and those in unshared books. Shared books are left
   * alone: rewriting them would push this device's naming to every member.
   */
  const renameInRecords = async (type: Category["type"], from: Set<string>, to: string) => {
    const shared = new Set(
      books.value.filter((b) => b.shareCode || sharedDocs.value[b.id]).map((b) => b.id)
    );
    let changed = false;
    for (const list of [personalRecords.value, records.value] as (PersonalRecord | RecordItem)[][]) {
      list.forEach((r, i) => {
        if (r.type !== type || !from.has(r.category)) return;
        if ("bookId" in r && shared.has(r.bookId)) return;
        list[i] = { ...r, category: to, isSynced: false };
        changed = true;
      });
    }
    if (changed) await save();
  };

  /**
   * Edits a category's name, icon and colour. A default category lives only in
   * constants.ts, so its edits are kept as a local override (dropped once it
   * matches the default again); the type of a category never changes.
   */
  const updateCategory = async (id: string, edit: CategoryEdit) => {
    const cat = allCategories.value.find((c) => c.id === id);
    if (!cat) return;
    const name = edit.name.trim() || cat.name;
    const original = defaultCategories.find((c) => c.id === id);

    if (original) {
      const override: CategoryOverride = {};
      if (name !== original.name) override.name = name;
      if (edit.icon !== original.icon) override.icon = edit.icon;
      if (edit.color !== original.color) override.color = edit.color;
      const next = { ...categoryOverrides.value };
      if (Object.keys(override).length) next[id] = override;
      else delete next[id];
      categoryOverrides.value = next;
      await saveToStorage(STORAGE_KEYS.CATEGORY_OVERRIDES, next);
    } else {
      customCategories.value = customCategories.value.map((c) =>
        c.id === id ? { ...c, name, icon: edit.icon, color: edit.color, isSynced: false } : c
      );
      await saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value);
    }

    if (name !== cat.name) {
      // A default's records may still carry its original name (restored from
      // a backup, or added before an earlier rename) — they move too.
      const from = new Set([cat.name, ...(original ? [original.name] : [])]);
      from.delete(name);
      await renameInRecords(cat.type, from, name);
    }
  };

  /** Restores a default category's original name, icon and colour. */
  const resetDefaultCategory = async (id: string) => {
    const original = defaultCategories.find((c) => c.id === id);
    if (original) await updateCategory(id, original);
  };

  const deleteCustomCategory = async (id: string) => {
    const isCustom = customCategories.value.some((c) => c.id === id);
    if (isCustom) {
      pendingDeleteCustomCategoryIds.value.push(id);
      customCategories.value = customCategories.value.filter((c) => c.id !== id);
      await saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value);
      await saveToStorage(STORAGE_KEYS.PENDING_DELETE_CUSTOM_CATEGORIES, pendingDeleteCustomCategoryIds.value);
    } else {
      // Default category: hide locally (existing deletedCategoryIds mechanism)
      deletedCategoryIds.value.push(id);
      await saveToStorage(STORAGE_KEYS.DELETED_CATEGORIES, deletedCategoryIds.value);
    }
  };

  return { allCategories, addCustomCategory, updateCategory, resetDefaultCategory, deleteCustomCategory };
}
