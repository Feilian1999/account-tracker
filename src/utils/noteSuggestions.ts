import type { Category } from "../stores/types";
import { defaultCategoryName } from "./categoryLookup";

export interface NoteSource {
  type: Category["type"];
  category: string;
  note: string;
  date: string;
}

interface RankedNote {
  /** The spelling shown: the most used one among case variants. */
  note: string;
  key: string;
}

interface NoteStats {
  key: string;
  count: number;
  inCategory: number;
  lastDate: string;
  /** Uses (and latest date) per spelling, to pick the one to show. */
  variants: Map<string, { count: number; lastDate: string }>;
}

/**
 * Notes typed before, best first — the input to one-tap note suggestions.
 * There is no separate list to maintain: they come from the records
 * themselves, so they are there from day one and travel with the backup.
 *
 * Only notes of the same type count; notes differing only in case are one
 * entry. Ranked by: used with the picked category, then how often, then how
 * recently. Independent of what is being typed, so typing only re-filters.
 */
export function rankNotes(
  records: NoteSource[],
  type: Category["type"],
  category?: Category,
): RankedNote[] {
  // A renamed default still owns records under its original name.
  const categoryNames = new Set(
    category ? [category.name, defaultCategoryName(category.id)] : [],
  );

  const stats = new Map<string, NoteStats>();
  for (const r of records) {
    if (r.type !== type) continue;
    const note = r.note?.trim();
    if (!note) continue;
    const key = note.toLowerCase();
    let s = stats.get(key);
    if (!s) {
      s = { key, count: 0, inCategory: 0, lastDate: "", variants: new Map() };
      stats.set(key, s);
    }
    s.count++;
    if (categoryNames.has(r.category)) s.inCategory++;
    if (r.date > s.lastDate) s.lastDate = r.date;
    const v = s.variants.get(note) ?? { count: 0, lastDate: "" };
    v.count++;
    if (r.date > v.lastDate) v.lastDate = r.date;
    s.variants.set(note, v);
  }

  return [...stats.values()]
    .sort(
      (a, b) =>
        b.inCategory - a.inCategory ||
        b.count - a.count ||
        b.lastDate.localeCompare(a.lastDate),
    )
    .map((s) => {
      const [note] = [...s.variants].sort(
        ([, a], [, b]) =>
          b.count - a.count || b.lastDate.localeCompare(a.lastDate),
      )[0];
      return { note, key: s.key };
    });
}

/**
 * The suggestions to show for what is typed: notes containing it
 * (case-insensitive), minus one already typed exactly — a different casing
 * stays, so the stored spelling can still be picked.
 */
export function filterNotes(
  ranked: RankedNote[],
  query = "",
  limit = 8,
): string[] {
  const typed = query.trim();
  const lower = typed.toLowerCase();
  return ranked
    .filter((n) => !lower || (n.key.includes(lower) && n.note !== typed))
    .slice(0, limit)
    .map((n) => n.note);
}
