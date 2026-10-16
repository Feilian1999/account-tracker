import type { Ref } from "vue";
import type { SavedNote } from "./types";
import { saveToStorage, STORAGE_KEYS } from "./storage";
import { noteKey } from "../utils/noteSuggestions";

/**
 * The saved note list behind the record sheets' one-tap suggestions. Local
 * only (not in the backup); this module writes its own key, it is not part of
 * save(). Notes of one type are unique ignoring case.
 */
export function setupNoteActions(savedNotes: Ref<SavedNote[]>) {
  const persist = () =>
    saveToStorage(STORAGE_KEYS.SAVED_NOTES, savedNotes.value);

  const find = (type: SavedNote["type"], text: string, exceptId?: string) =>
    savedNotes.value.find(
      (n) =>
        n.type === type &&
        n.id !== exceptId &&
        noteKey(n.text) === noteKey(text),
    );

  /**
   * Called when a record is saved with a note: adds it to the list, or counts
   * one more use of the saved one (its spelling is kept — edit it in Profile).
   */
  const rememberNote = async (
    type: SavedNote["type"],
    text: string,
    categoryName: string,
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const existing = find(type, trimmed);
    if (existing) {
      existing.count++;
      if (categoryName) {
        existing.categories[categoryName] =
          (existing.categories[categoryName] ?? 0) + 1;
      }
      existing.lastUsed = now;
    } else {
      savedNotes.value.push({
        id: crypto.randomUUID(),
        text: trimmed,
        type,
        pinned: false,
        count: 1,
        categories: categoryName ? { [categoryName]: 1 } : {},
        lastUsed: now,
      });
    }
    await persist();
  };

  /** Adds a note by hand. False if blank or already saved for that type. */
  const addSavedNote = async (type: SavedNote["type"], text: string) => {
    const trimmed = text.trim();
    if (!trimmed || find(type, trimmed)) return false;
    savedNotes.value.push({
      id: crypto.randomUUID(),
      text: trimmed,
      type,
      pinned: false,
      count: 0,
      categories: {},
      lastUsed: new Date().toISOString(),
    });
    await persist();
    return true;
  };

  /**
   * Renames a note. Renaming onto another saved note of the type merges them
   * (uses summed, pinned if either was). False if blank.
   */
  const renameSavedNote = async (id: string, text: string) => {
    const note = savedNotes.value.find((n) => n.id === id);
    const trimmed = text.trim();
    if (!note || !trimmed) return false;
    const other = find(note.type, trimmed, id);
    if (other) {
      other.text = trimmed;
      other.count += note.count;
      other.pinned ||= note.pinned;
      for (const [cat, n] of Object.entries(note.categories)) {
        other.categories[cat] = (other.categories[cat] ?? 0) + n;
      }
      if (note.lastUsed > other.lastUsed) other.lastUsed = note.lastUsed;
      savedNotes.value = savedNotes.value.filter((n) => n.id !== id);
    } else {
      note.text = trimmed;
    }
    await persist();
    return true;
  };

  const setNotePinned = async (id: string, pinned: boolean) => {
    const note = savedNotes.value.find((n) => n.id === id);
    if (!note) return;
    note.pinned = pinned;
    await persist();
  };

  const deleteSavedNote = async (id: string) => {
    savedNotes.value = savedNotes.value.filter((n) => n.id !== id);
    await persist();
  };

  return {
    rememberNote,
    addSavedNote,
    renameSavedNote,
    setNotePinned,
    deleteSavedNote,
  };
}
