import type { Ref } from "vue";
import { computed } from "vue";
import type { Category } from "./types";
import { defaultCategories } from "./constants";
import { saveToStorage, STORAGE_KEYS } from "./storage";

/**
 * Category management actions.
 */
export function setupCategoryActions(
  customCategories: Ref<Category[]>,
  deletedCategoryIds: Ref<string[]>
) {
  const allCategories = computed(() =>
    [...defaultCategories, ...customCategories.value].filter(
      (c) => !deletedCategoryIds.value.includes(c.id)
    )
  );

  const addCustomCategory = (cat: Omit<Category, "id" | "isDefault">) => {
    const newCat: Category = { ...cat, id: crypto.randomUUID(), isDefault: false };
    customCategories.value.push(newCat);
    saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value);
  };

  const deleteCustomCategory = (id: string) => {
    const isCustom = customCategories.value.some((c) => c.id === id);
    if (isCustom) {
      customCategories.value = customCategories.value.filter((c) => c.id !== id);
      saveToStorage(STORAGE_KEYS.CUSTOM_CATEGORIES, customCategories.value);
    } else {
      deletedCategoryIds.value.push(id);
      saveToStorage(STORAGE_KEYS.DELETED_CATEGORIES, deletedCategoryIds.value);
    }
  };

  return { allCategories, addCustomCategory, deleteCustomCategory };
}
