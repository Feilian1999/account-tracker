import { defaultCategories } from "../stores/constants";
import type { Category } from "../stores/types";

const DEFAULT_NAMES = new Map(defaultCategories.map((c) => [c.id, c.name]));

/**
 * The name a default category is stored under in records (the zh-TW name in
 * constants.ts), whatever the user has renamed it to; undefined for custom ones.
 */
export function defaultCategoryName(id: string): string | undefined {
  return DEFAULT_NAMES.get(id);
}

/**
 * The name to store in a record's `category` for this category. A default is
 * always stored under its original name: renaming one is a local display
 * override, so it never reaches a shared book, a backup or another device.
 */
export function storedCategoryName(cat: Category): string {
  return defaultCategoryName(cat.id) ?? cat.name;
}

/**
 * Finds the category a record's `category` name refers to — by its current
 * name, or a default by the original name its records are stored under. Pass
 * the record's type: an expense and an income category may share a name.
 */
export function findCategoryByName(
  categories: Category[],
  name: string,
  type?: Category["type"],
): Category | undefined {
  const typeMatches = (c: Category) => !type || c.type === type;
  return (
    categories.find((c) => c.name === name && typeMatches(c)) ??
    categories.find(
      (c) =>
        c.isDefault && typeMatches(c) && defaultCategoryName(c.id) === name,
    )
  );
}

/**
 * The label to show for a category: a default category under its original
 * name is translated by id; a renamed one shows the user's name as typed.
 */
export function categoryLabel(
  cat: Category,
  t: (key: string) => string,
  te: (key: string) => boolean,
): string {
  const key = `categories.${cat.id}`;
  if (cat.isDefault && cat.name === defaultCategoryName(cat.id) && te(key)) {
    return t(key);
  }
  return cat.name;
}
