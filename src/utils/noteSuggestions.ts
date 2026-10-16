import type { Category, SavedNote } from "../stores/types";
import { storedCategoryName } from "./categoryLookup";

interface RankedNote {
  note: string;
  /** Case-folded, for matching what is typed. */
  key: string;
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
  const categoryKey = category ? storedCategoryName(category) : undefined;
  const inCategory = (n: SavedNote) =>
    categoryKey ? (n.categories[categoryKey] ?? 0) : 0;
  return notes
    .filter((n) => n.type === type && n.text.trim())
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        inCategory(b) - inCategory(a) ||
        b.count - a.count ||
        b.lastUsed.localeCompare(a.lastUsed),
    )
    .map((n) => ({ note: n.text, key: n.text.toLowerCase() }));
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
