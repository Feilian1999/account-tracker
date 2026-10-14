import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import NoteSuggestions from "../src/components/NoteSuggestions.vue";
import type {
  Book,
  Category,
  PersonalRecord,
  RecordItem,
} from "../src/stores/types";
import {
  filterNotes,
  noteSourcesFor,
  rankNotes,
  type NoteSource,
} from "../src/utils/noteSuggestions";

const suggestNotes = (
  records: NoteSource[],
  opts: {
    type: Category["type"];
    category?: Category;
    query?: string;
    limit?: number;
  },
) =>
  filterNotes(
    rankNotes(records, opts.type, opts.category),
    opts.query,
    opts.limit,
  );

const rec = (
  note: string,
  category = "飲食",
  date = "2026-10-01",
  type: Category["type"] = "expense",
) => ({ note, category, date, type });

const cat = (id: string, name: string): Category => ({
  id,
  name,
  type: "expense",
  icon: "restaurant",
  color: "blue",
  isDefault: id.startsWith("e"),
});

describe("suggestNotes", () => {
  it("ranks notes of the picked category first, then by use, then recency", () => {
    const records = [
      rec("捷運", "交通"),
      rec("捷運", "交通"),
      rec("捷運", "交通"),
      rec("午餐", "飲食", "2026-10-01"),
      rec("午餐", "飲食", "2026-10-02"),
      rec("早餐", "飲食", "2026-09-01"),
      rec("晚餐", "飲食", "2026-10-05"),
    ];
    expect(
      suggestNotes(records, { type: "expense", category: cat("e1", "飲食") }),
    ).toEqual(["午餐", "晚餐", "早餐", "捷運"]);
    // Without a category, frequency decides.
    expect(suggestNotes(records, { type: "expense" })[0]).toBe("捷運");
  });

  it("filters while typing and drops an exact match", () => {
    const records = [rec("午餐"), rec("午茶"), rec("晚餐"), rec("Starbucks")];
    expect(
      suggestNotes(records, { type: "expense", query: " 午" }).sort(),
    ).toEqual(["午茶", "午餐"]);
    expect(suggestNotes(records, { type: "expense", query: "午餐" })).toEqual(
      [],
    );
    expect(suggestNotes(records, { type: "expense", query: "star" })).toEqual([
      "Starbucks",
    ]);
  });

  it("merges case variants, showing the most used spelling", () => {
    const records = [
      rec("Lunch"),
      rec("Lunch"),
      rec("lunch"),
      rec("dinner"),
      rec("dinner"),
    ];
    // 3 uses together outrank dinner's 2.
    expect(suggestNotes(records, { type: "expense" })).toEqual([
      "Lunch",
      "dinner",
    ]);
  });

  it("shows the spelling used with the picked category", () => {
    const records = [
      rec("Coffee", "飲食"),
      rec("coffee", "其他"),
      rec("coffee", "其他"),
      rec("coffee", "其他"),
    ];
    expect(
      suggestNotes(records, { type: "expense", category: cat("e1", "飲食") }),
    ).toEqual(["Coffee"]);
    expect(suggestNotes(records, { type: "expense" })).toEqual(["coffee"]);
  });

  it("keeps a differently cased match, so the stored spelling can be picked", () => {
    const records = [rec("Starbucks")];
    expect(
      suggestNotes(records, { type: "expense", query: "starbucks" }),
    ).toEqual(["Starbucks"]);
    expect(
      suggestNotes(records, { type: "expense", query: "Starbucks" }),
    ).toEqual([]);
  });

  it("ignores blank notes and notes of the other type, and trims", () => {
    const records = [
      rec(""),
      rec("   "),
      rec(" 午餐 "),
      rec("午餐"),
      rec("薪水", "薪水", "2026-10-01", "income"),
    ];
    expect(suggestNotes(records, { type: "expense" })).toEqual(["午餐"]);
    expect(suggestNotes(records, { type: "income" })).toEqual(["薪水"]);
  });

  it("a renamed default still matches records under its original name", () => {
    const records = [rec("捷運", "交通"), rec("捷運", "交通"), rec("午餐")];
    expect(
      suggestNotes(records, { type: "expense", category: cat("e1", "Meals") }),
    ).toEqual(["午餐", "捷運"]);
  });

  it("caps the list", () => {
    const records = Array.from({ length: 20 }, (_, i) => rec(`note ${i}`));
    expect(suggestNotes(records, { type: "expense" })).toHaveLength(8);
    expect(suggestNotes(records, { type: "expense", limit: 3 })).toHaveLength(
      3,
    );
  });
});

describe("noteSourcesFor", () => {
  const books = [
    { id: "solo", name: "Solo", members: [], createdAt: "" },
    { id: "trip", name: "Trip", members: [], createdAt: "", shareCode: "X" },
    { id: "work", name: "Work", members: [], createdAt: "", shareCode: "Y" },
  ] as Book[];
  const bookRec = (bookId: string) =>
    ({ ...rec(`${bookId} note`), id: bookId, bookId }) as RecordItem;
  const data = {
    books,
    records: [bookRec("solo"), bookRec("trip"), bookRec("work")],
    personalRecords: [{ ...rec("mine"), id: "p" } as PersonalRecord],
  };
  const notesOf = (bookId: string | null) =>
    noteSourcesFor(bookId, data).map((r) => r.note);

  it("offers the user's own notes outside shared books", () => {
    // Personal sheet and an unshared book's sheet: personal + unshared books.
    expect(notesOf(null)).toEqual(["mine", "solo note"]);
    expect(notesOf("solo")).toEqual(["mine", "solo note"]);
  });

  it("offers a shared book only its own notes", () => {
    expect(notesOf("trip")).toEqual(["trip note"]);
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
