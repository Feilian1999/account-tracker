import type {
  Book,
  Category,
  PersonalRecord,
  RecordItem,
} from "../stores/types";
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

interface Usage {
  /** Uses with the picked category. */
  inCategory: number;
  count: number;
  lastDate: string;
}

/** Most used with the picked category, then most used, then most recent. */
const byUse = (a: Usage, b: Usage) =>
  b.inCategory - a.inCategory ||
  b.count - a.count ||
  b.lastDate.localeCompare(a.lastDate);

/**
 * The records whose notes a record form may suggest. A shared book's sheet
 * offers only that book's notes: a tap syncs the note to every member, so the
 * user's personal notes (or another book's) must never be one tap away there.
 * Everywhere else the user's own writing is offered: personal records and
 * unshared books — never shared books, which hold other members' writing.
 */
export function noteSourcesFor(
  bookId: string | null | undefined,
  data: {
    books: Book[];
    records: RecordItem[];
    personalRecords: PersonalRecord[];
  },
): NoteSource[] {
  const book = data.books.find((b) => b.id === bookId);
  if (book?.shareCode) {
    return data.records.filter((r) => r.bookId === book.id);
  }
  const unshared = new Set(
    data.books.filter((b) => !b.shareCode).map((b) => b.id),
  );
  return [
    ...data.personalRecords,
    ...data.records.filter((r) => unshared.has(r.bookId)),
  ];
}

/**
 * Notes typed before, best first — the input to one-tap note suggestions.
 * There is no separate list to maintain: they come from the records
 * themselves, so they are there from day one and travel with the backup.
 *
 * Only notes of the same type count; notes differing only in case are one
 * entry, shown in the spelling most used the same way. Ranked by: used with
 * the picked category, then how often, then how recently. Independent of what
 * is being typed, so typing only re-filters.
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

  // Case-folded note → spelling → its usage.
  const byKey = new Map<string, Map<string, Usage>>();
  for (const r of records) {
    if (r.type !== type) continue;
    const note = r.note?.trim();
    if (!note) continue;
    const key = note.toLowerCase();
    const variants = byKey.get(key) ?? new Map<string, Usage>();
    byKey.set(key, variants);
    const u = variants.get(note) ?? { inCategory: 0, count: 0, lastDate: "" };
    variants.set(note, u);
    u.count++;
    if (categoryNames.has(r.category)) u.inCategory++;
    if (r.date > u.lastDate) u.lastDate = r.date;
  }

  return [...byKey]
    .map(([key, variants]) => {
      let best: [string, Usage] | undefined;
      const total: Usage = { inCategory: 0, count: 0, lastDate: "" };
      for (const entry of variants) {
        const [, u] = entry;
        total.inCategory += u.inCategory;
        total.count += u.count;
        if (u.lastDate > total.lastDate) total.lastDate = u.lastDate;
        if (!best || byUse(u, best[1]) < 0) best = entry;
      }
      return { note: best![0], key, total };
    })
    .sort((a, b) => byUse(a.total, b.total))
    .map(({ note, key }) => ({ note, key }));
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
