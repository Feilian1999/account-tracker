import { computed } from "vue";
import type { Category, SavedNote } from "../stores/types";
import { filterNotes, rankSavedNotes } from "../utils/noteSuggestions";

/**
 * One-tap note suggestions for a record form, from the saved note list.
 * Ranking only reruns when the list, type or category change; typing just
 * re-filters the ranked list.
 */
export function useNoteSuggestions(opts: {
  notes: () => SavedNote[];
  type: () => Category["type"];
  category: () => Category | undefined;
  query: () => string;
}) {
  const ranked = computed(() =>
    rankSavedNotes(opts.notes(), opts.type(), opts.category()),
  );
  return computed(() => filterNotes(ranked.value, opts.query()));
}
