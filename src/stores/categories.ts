import type { Ref } from "vue";
import { computed } from "vue";
import type { Book, Category, CategoryOverride, PersonalRecord, RecordItem } from "./types";
import { defaultCategories } from "./constants";
import { saveToStorage, STORAGE_KEYS } from "./storage";
import { isSharedBook } from "../utils/book";
import { defaultCategoryName } from "../utils/categoryLookup";

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
   * Rewrites the stored `category` of this type's records named `from` — in
   * personal records and unshared books only. Shared books are left alone:
   * rewriting them would push this device's naming to every member.
   */
  const renameInRecords = async (type: Category["type"], from: string, to: string) => {
    const shared = new Set(books.value.filter(isSharedBook).map((b) => b.id));
    let changed = false;
    for (const list of [personalRecords.value, records.value] as (PersonalRecord | RecordItem)[][]) {
      list.forEach((r, i) => {
        if (r.type !== type || r.category !== from) return;
        if ("bookId" in r && shared.has(r.bookId)) return;
        list[i] = { ...r, category: to, isSynced: false };
        changed = true;
      });
    }
    if (changed) await save();
  };

  /** Whether a category other than `id` of this type claims records named `name`. */
  const nameClaimedByOther = (id: string, type: Category["type"], name: string) =>
    allCategories.value.some(
      (c) => c.id !== id && c.type === type && (c.name === name || defaultCategoryName(c.id) === name)
    );

  /**
   * Edits a category's name, icon and colour; its type never changes.
   *
   * A default category lives only in constants.ts and its records always keep
   * its original name (storedCategoryName), so its edits are only a local
   * display override — dropped once it matches the default again — and its
   * records are never rewritten. A custom category's records are renamed with
   * it, unless another category of the type still has the old name (names
   * from before uniqueness was enforced): then they may be that one's.
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
      return;
    }

    customCategories.value = customCategories.value.map((c) =>
      c.id === id ? { ...c, name, icon: edit.icon, color: edit.color, isSynced: false } : c
    );
    await saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value);
    if (name !== cat.name && !nameClaimedByOther(id, cat.type, cat.name)) {
      await renameInRecords(cat.type, cat.name, name);
    }
  };

  /** Restores a default category's original name, icon and colour. */
  const resetDefaultCategory = async (id: string) => {
    if (!categoryOverrides.value[id]) return;
    const next = { ...categoryOverrides.value };
    delete next[id];
    categoryOverrides.value = next;
    await saveToStorage(STORAGE_KEYS.CATEGORY_OVERRIDES, next);
  };

  /**
   * A first release rewrote records to a renamed default's new name. Put them
   * back under the original name, which is what records of a default must
   * carry. Idempotent; run on init.
   */
  const restoreDefaultCategoryNames = async () => {
    for (const original of defaultCategories) {
      const renamed = categoryOverrides.value[original.id]?.name;
      if (renamed && !nameClaimedByOther(original.id, original.type, renamed)) {
        await renameInRecords(original.type, renamed, original.name);
      }
    }
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

  return {
    allCategories,
    addCustomCategory,
    updateCategory,
    resetDefaultCategory,
    restoreDefaultCategoryNames,
    deleteCustomCategory,
  };
}
