import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import NoteSuggestions from "../src/components/NoteSuggestions.vue";
import type { Category, SavedNote } from "../src/stores/types";
import { filterNotes, rankSavedNotes } from "../src/utils/noteSuggestions";

const saved = vi.hoisted(() => new Map<string, unknown>());
vi.mock("../src/stores/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/stores/storage")>()),
  saveToStorage: vi.fn(async (key: string, data: unknown) => {
    saved.set(key, JSON.parse(JSON.stringify(data)));
    return true;
  }),
}));

import { setupNoteActions } from "../src/stores/notes";
import { STORAGE_KEYS } from "../src/stores/storage";

const note = (text: string, over: Partial<SavedNote> = {}): SavedNote => ({
  id: text,
  text,
  type: "expense",
  pinned: false,
  count: 1,
  categories: {},
  lastUsed: "2026-10-01T00:00:00.000Z",
  ...over,
});

const cat = (id: string, name: string): Category => ({
  id,
  name,
  type: "expense",
  icon: "restaurant",
  color: "blue",
  isDefault: id.startsWith("e"),
});

const suggest = (
  notes: SavedNote[],
  opts: { type?: Category["type"]; category?: Category; query?: string } = {},
) =>
  filterNotes(
    rankSavedNotes(notes, opts.type ?? "expense", opts.category),
    opts.query,
  );

describe("rankSavedNotes", () => {
  it("ranks pinned first, then use with the category, use, and recency", () => {
    const notes = [
      note("捷運", { count: 9, categories: { 交通: 9 } }),
      note("午餐", { count: 3, categories: { 飲食: 3 } }),
      note("晚餐", {
        count: 3,
        categories: { 飲食: 3 },
        lastUsed: "2026-10-05T00:00:00.000Z",
      }),
      note("早餐", { count: 1, categories: { 飲食: 1 } }),
      note("房租", { count: 0, pinned: true }),
    ];
    expect(suggest(notes, { category: cat("e1", "飲食") })).toEqual([
      "房租",
      "晚餐",
      "午餐",
      "早餐",
      "捷運",
    ]);
    // Without a category: pinned, then frequency.
    expect(suggest(notes).slice(0, 2)).toEqual(["房租", "捷運"]);
  });

  it("a renamed default matches uses saved under its original name", () => {
    const notes = [
      note("捷運", { count: 5, categories: { 交通: 5 } }),
      note("午餐", { count: 1, categories: { 飲食: 1 } }),
    ];
    expect(suggest(notes, { category: cat("e1", "Meals") })).toEqual([
      "午餐",
      "捷運",
    ]);
  });

  it("keeps to the type", () => {
    const notes = [note("午餐"), note("薪水", { type: "income" })];
    expect(suggest(notes)).toEqual(["午餐"]);
    expect(suggest(notes, { type: "income" })).toEqual(["薪水"]);
  });
});

describe("filterNotes", () => {
  it("filters by what is typed and drops an exact match", () => {
    const notes = [note("午餐"), note("午茶"), note("晚餐"), note("Starbucks")];
    expect(suggest(notes, { query: " 午" }).sort()).toEqual(["午茶", "午餐"]);
    expect(suggest(notes, { query: "午餐" })).toEqual([]);
    // A differently cased match stays, so the saved spelling can be picked.
    expect(suggest(notes, { query: "starbucks" })).toEqual(["Starbucks"]);
  });

  it("caps the list at 12", () => {
    const notes = Array.from({ length: 20 }, (_, i) => note(`note ${i}`));
    expect(suggest(notes)).toHaveLength(12);
  });
});

describe("saved note actions", () => {
  const setup = (initial: SavedNote[] = []) => {
    const savedNotes = ref<SavedNote[]>(initial);
    return { savedNotes, ...setupNoteActions(savedNotes) };
  };

  it("remembers a new note, and counts another use of a saved one", async () => {
    const s = setup();
    await s.rememberNote("expense", " 午餐 ", "飲食");
    await s.rememberNote("expense", "午餐", "飲食");
    await s.rememberNote("expense", "午餐", "其他");
    await s.rememberNote("income", "午餐", "其他");
    await s.rememberNote("expense", "   ", "飲食");

    expect(s.savedNotes.value).toHaveLength(2);
    expect(s.savedNotes.value[0]).toMatchObject({
      text: "午餐",
      type: "expense",
      count: 3,
      categories: { 飲食: 2, 其他: 1 },
    });
    expect(saved.get(STORAGE_KEYS.SAVED_NOTES)).toEqual(s.savedNotes.value);
  });

  it("keeps the saved spelling when used in another case", async () => {
    const s = setup([note("Starbucks")]);
    await s.rememberNote("expense", "starbucks", "");
    expect(s.savedNotes.value).toEqual([
      expect.objectContaining({ text: "Starbucks", count: 2 }),
    ]);
  });

  it("adds by hand, refusing a duplicate", async () => {
    const s = setup([note("午餐")]);
    expect(await s.addSavedNote("expense", "晚餐")).toBe(true);
    expect(await s.addSavedNote("expense", " 午餐")).toBe(false);
    expect(await s.addSavedNote("income", "午餐")).toBe(true);
    expect(s.savedNotes.value.map((n) => n.text)).toEqual([
      "午餐",
      "晚餐",
      "午餐",
    ]);
    expect(s.savedNotes.value[1].count).toBe(0);
  });

  it("renames, merging onto an existing note of the type", async () => {
    const s = setup([
      note("Lunch", { count: 2, categories: { 飲食: 2 } }),
      note("lunch box", {
        count: 1,
        pinned: true,
        categories: { 飲食: 1, 其他: 1 },
      }),
    ]);
    await s.renameSavedNote("lunch box", "LUNCH");
    expect(s.savedNotes.value).toEqual([
      expect.objectContaining({
        id: "Lunch",
        text: "LUNCH",
        count: 3,
        pinned: true,
        categories: { 飲食: 3, 其他: 1 },
      }),
    ]);
  });

  it("pins and deletes", async () => {
    const s = setup([note("午餐"), note("晚餐")]);
    await s.setNotePinned("晚餐", true);
    expect(s.savedNotes.value[1].pinned).toBe(true);
    await s.deleteSavedNote("午餐");
    expect(s.savedNotes.value.map((n) => n.text)).toEqual(["晚餐"]);
  });
});

describe("NoteSuggestions", () => {
  const mountChips = (notes: string[]) =>
    mount(NoteSuggestions, {
      props: { notes },
      global: { mocks: { $t: (k: string) => k } },
    });

  it("emits the tapped note", async () => {
    const wrapper = mountChips(["午餐", "晚餐"]);
    await wrapper.findAll("button")[1].trigger("click");
    expect(wrapper.emitted("select")).toEqual([["晚餐"]]);
  });

  it("renders nothing without suggestions", () => {
    expect(mountChips([]).find("button").exists()).toBe(false);
  });
});
