import { defaultCategories } from "../stores/constants";
import type { Category } from "../stores/types";

/**
 * The name a default category is stored under in records (the zh-TW name in
 * constants.ts), whatever the user has renamed it to; undefined for custom ones.
 */
export function defaultCategoryName(id: string): string | undefined {
  return defaultCategories.find((c) => c.id === id)?.name;
}

/**
 * Finds the category a record's `category` name refers to. A renamed default
 * category still claims records stored under its original name — shared books
 * keep those, since a rename only rewrites personal and unshared book records.
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
