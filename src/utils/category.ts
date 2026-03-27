import { useTrackerStore } from "../stores/tracker";

/**
 * Unified color configuration for categories.
 * Contains bg (list view), bgFull (editor), text, and ring class names.
 */
export const colorMap: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-600",   ring: "ring-blue-500" },
  green:  { bg: "bg-green-50",  text: "text-green-600",  ring: "ring-green-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", ring: "ring-purple-500" },
  red:    { bg: "bg-red-50",    text: "text-red-600",    ring: "ring-red-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-500" },
  pink:   { bg: "bg-pink-50",   text: "text-pink-600",   ring: "ring-pink-500" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-600", ring: "ring-yellow-500" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-600",   ring: "ring-teal-500" },
  gray:   { bg: "bg-gray-50",   text: "text-gray-600",   ring: "ring-gray-500" },
};

/**
 * Alias for use in the category editor where stronger bg tones are preferred.
 * Uses the same map to avoid duplication.
 */
export const colorMapFull = colorMap;

/**
 * Returns the icon name for a category by its name.
 * Falls back to "more_horiz" if not found.
 */
export function getCategoryIcon(categoryName: string): string {
  const store = useTrackerStore();
  return store.allCategories.find((c) => c.name === categoryName)?.icon ?? "more_horiz";
}

/**
 * Returns the Tailwind bg + text color classes for a category by its name.
 */
export function getCategoryBg(
  categoryName: string,
): { bg: string; text: string } {
  const store = useTrackerStore();
  const color =
    store.allCategories.find((c) => c.name === categoryName)?.color ?? "gray";
  return colorMap[color] ?? colorMap.gray;
}

/**
 * Formats a date string using the user's currently selected locale.
 */
export function formatDate(dateStr: string, locale?: string): string {
  return new Date(dateStr).toLocaleDateString(locale ?? navigator.language, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Formats a date string specifically with a localized weekday included.
 * E.g., "2026/03/21 Saturday"
 */
export function formatDateWithWeekday(dateStr: string, locale?: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const weekday = date.toLocaleDateString(locale ?? navigator.language, {
    weekday: "short", // "short" yields "週六", "Sat", "土"
  });
  return `${y}/${m}/${d} ${weekday}`;
}
