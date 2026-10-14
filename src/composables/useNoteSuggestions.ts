import { computed } from "vue";
import type { Category } from "../stores/types";
import {
  filterNotes,
  rankNotes,
  type NoteSource,
} from "../utils/noteSuggestions";

/**
 * One-tap note suggestions for a record form. Ranking reads every record, so
 * it only reruns when the records, type or category change; typing just
 * re-filters the ranked list.
 */
export function useNoteSuggestions(opts: {
  records: () => NoteSource[];
  type: () => Category["type"];
  category: () => Category | undefined;
  query: () => string;
}) {
  const ranked = computed(() =>
    rankNotes(opts.records(), opts.type(), opts.category()),
  );
  return computed(() => filterNotes(ranked.value, opts.query()));
}
