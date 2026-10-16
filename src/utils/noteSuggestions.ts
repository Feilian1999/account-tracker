import type { Category, SavedNote } from "../stores/types";
import { storedCategoryName } from "./categoryLookup";

interface RankedNote {
  note: string;
  /** Case-folded, for matching what is typed. */
  key: string;
}

/** Notes of a type are one entry ignoring case and surrounding spaces. */
export const noteKey = (text: string) => text.trim().toLowerCase();

/**
 * Best first: pinned, then uses with the category (when one is given), uses,
 * and last use. Shared by the suggestions and Profile's list.
 */
export function compareSavedNotes(categoryKey?: string) {
  const inCategory = (n: SavedNote) =>
    categoryKey ? (n.categories[categoryKey] ?? 0) : 0;
  return (a: SavedNote, b: SavedNote) =>
    Number(b.pinned) - Number(a.pinned) ||
    inCategory(b) - inCategory(a) ||
    b.count - a.count ||
    b.lastUsed.localeCompare(a.lastUsed);
}

/**
 * The saved notes of a type, best first — the input to one-tap note
 * suggestions. Pinned notes come first; then by uses with the picked category,
 * by uses, and by last use. Independent of what is being typed, so typing only
 * re-filters.
 */
export function rankSavedNotes(
  notes: SavedNote[],
  type: Category["type"],
  category?: Category,
): RankedNote[] {
  return notes
    .filter((n) => n.type === type && n.text.trim())
    .sort(
      compareSavedNotes(category ? storedCategoryName(category) : undefined),
    )
    .map((n) => ({ note: n.text, key: noteKey(n.text) }));
}

/**
 * The suggestions to show for what is typed: notes containing it
 * (case-insensitive), minus one already typed exactly — a different casing
 * stays, so the saved spelling can still be picked.
 */
export function filterNotes(
  ranked: RankedNote[],
  query = "",
  limit = 12,
): string[] {
  const typed = query.trim();
  const lower = typed.toLowerCase();
  return ranked
    .filter((n) => !lower || (n.key.includes(lower) && n.note !== typed))
    .slice(0, limit)
    .map((n) => n.note);
}
