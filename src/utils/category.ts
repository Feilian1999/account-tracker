import { useTrackerStore } from "../stores/tracker";
import type { Category } from "../stores/types";
import { formatLocalDate, formatLocalDateWithWeekday } from "./date";
import { findCategoryByName } from "./categoryLookup";

/**
 * Unified color configuration for categories.
 * Contains bg (list view), bgFull (editor), text, and ring class names.
 */
export const colorMap: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-500" },
  green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-500" },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    ring: "ring-purple-500",
  },
  red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-500" },
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    ring: "ring-indigo-500",
  },
  pink: { bg: "bg-pink-50", text: "text-pink-600", ring: "ring-pink-500" },
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    ring: "ring-yellow-500",
  },
  teal: { bg: "bg-teal-50", text: "text-teal-600", ring: "ring-teal-500" },
  gray: { bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-500" },
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
export function getCategoryIcon(
  categoryName: string,
  type?: Category["type"],
): string {
  const store = useTrackerStore();
  return (
    findCategoryByName(store.allCategories, categoryName, type)?.icon ??
    "more_horiz"
  );
}

/**
 * Returns the Tailwind bg + text color classes for a category by its name.
 */
export function getCategoryBg(
  categoryName: string,
  type?: Category["type"],
): {
  bg: string;
  text: string;
} {
  const store = useTrackerStore();
  const color =
    findCategoryByName(store.allCategories, categoryName, type)?.color ??
    "gray";
  return colorMap[color] ?? colorMap.gray;
}

/**
 * Formats a date string using the user's currently selected locale.
 */
export function formatDate(dateStr: string, locale?: string): string {
  return formatLocalDate(dateStr, locale ?? navigator.language);
}

/**
 * Formats a date string specifically with a localized weekday included.
 * E.g., "2026/03/21 Saturday"
 */
export function formatDateWithWeekday(
  dateStr: string,
  locale?: string,
): string {
  return formatLocalDateWithWeekday(dateStr, locale ?? navigator.language);
}
