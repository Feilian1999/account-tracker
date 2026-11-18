import type { PersonalRecord } from "../stores/types";

type Searchable = Pick<
  PersonalRecord,
  "note" | "category" | "amount" | "original"
>;

const normalize = (text: string) => text.toLowerCase().normalize("NFKC");

/**
 * Whether a record matches a search box query. The query is split on spaces and
 * every word must appear somewhere (so "lunch 120" narrows, not widens): in the
 * note, the stored category name, the category as shown (`label`, which may be
 * translated), or the amount — booked or as originally typed. Case-insensitive;
 * thousands separators in a typed amount ("1,200") are ignored. An empty query
 * matches everything.
 */
export function recordMatchesQuery(
  record: Searchable,
  query: string,
  label = "",
): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const fields = [
    record.note,
    record.category,
    label,
    String(record.amount),
    record.original ? String(record.original.amount) : "",
  ].map((field) => normalize(field ?? ""));
  return terms.every((term) => {
    const numeric = term.replace(/,/g, "");
    return fields.some(
      (field) =>
        field.includes(term) || (numeric !== term && field.includes(numeric)),
    );
  });
}
