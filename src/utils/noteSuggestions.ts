import type { Category } from "../stores/types";
import { defaultCategoryName } from "./categoryLookup";

interface NoteSource {
  type: Category["type"];
  category: string;
  note: string;
  date: string;
}

interface NoteStats {
  note: string;
  count: number;
  inCategory: number;
  lastDate: string;
}

/**
 * Notes typed before, offered as one-tap choices in the record sheets. There
 * is no separate list to maintain: they come from the records themselves, so
 * they are there from day one and travel with the backup.
 *
 * Only notes of the same type count. Ranked by: used with the picked category,
 * then how often, then how recently. While typing, only notes containing the
 * text are kept (case-insensitive), minus one that already matches exactly.
 */
export function suggestNotes(
  records: NoteSource[],
  opts: {
    type: Category["type"];
    category?: Category;
    query?: string;
    limit?: number;
  },
): string[] {
  const { type, category, limit = 8 } = opts;
  const query = (opts.query ?? "").trim().toLowerCase();
  // A renamed default still owns records under its original name.
  const categoryNames = new Set(
    category ? [category.name, defaultCategoryName(category.id)] : [],
  );

  const stats = new Map<string, NoteStats>();
  for (const r of records) {
    if (r.type !== type) continue;
    const note = r.note?.trim();
    if (!note) continue;
    const s = stats.get(note) ?? {
      note,
      count: 0,
      inCategory: 0,
      lastDate: "",
    };
    s.count++;
    if (categoryNames.has(r.category)) s.inCategory++;
    if (r.date > s.lastDate) s.lastDate = r.date;
    stats.set(note, s);
  }

  return [...stats.values()]
    .filter((s) => {
      const note = s.note.toLowerCase();
      return !query || (note.includes(query) && note !== query);
    })
    .sort(
      (a, b) =>
        b.inCategory - a.inCategory ||
        b.count - a.count ||
        b.lastDate.localeCompare(a.lastDate),
    )
    .slice(0, limit)
    .map((s) => s.note);
}
