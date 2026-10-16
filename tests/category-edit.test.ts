import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type {
  Book,
  Category,
  CategoryOverride,
  PersonalRecord,
  RecordItem,
  SavedNote,
} from "../src/stores/types";

const saved = vi.hoisted(() => new Map<string, unknown>());
vi.mock("../src/stores/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/stores/storage")>()),
  saveToStorage: vi.fn(async (key: string, data: unknown) => {
    saved.set(key, JSON.parse(JSON.stringify(data)));
    return true;
  }),
}));

import { setupCategoryActions } from "../src/stores/categories";
import { STORAGE_KEYS } from "../src/stores/storage";
import {
  categoryLabel,
  findCategoryByName,
  storedCategoryName,
} from "../src/utils/categoryLookup";

const personal = (category: string, type = "expense"): PersonalRecord =>
  ({
    id: crypto.randomUUID(),
    type,
    amount: 100,
    category,
    date: "2026-10-01",
    note: "",
    isSynced: true,
  }) as PersonalRecord;

const bookRecord = (bookId: string, category: string): RecordItem =>
  ({
    id: crypto.randomUUID(),
    bookId,
    type: "expense",
    amount: 100,
    category,
    date: "2026-10-01",
    note: "",
    paidById: "m1",
    splitAmongIds: ["m1"],
    isSynced: true,
  }) as RecordItem;

function setup(extraCategories: Category[] = []) {
  const custom: Category = {
    id: crypto.randomUUID(),
    name: "Coffee",
    type: "expense",
    icon: "local_cafe",
    color: "blue",
    isDefault: false,
    isSynced: true,
  };
  const books = ref<Book[]>([
    { id: "solo", name: "Solo", members: [], createdAt: "" } as Book,
    {
      id: "shared",
      name: "Trip",
      members: [],
      createdAt: "",
      shareCode: "ABCDEFGH",
    } as Book,
  ]);
  const state = {
    customCategories: ref<Category[]>([custom, ...extraCategories]),
    deletedCategoryIds: ref<string[]>([]),
    overrides: ref<Record<string, CategoryOverride>>({}),
    books,
    records: ref<RecordItem[]>([
      bookRecord("solo", "Coffee"),
      bookRecord("shared", "Coffee"),
      bookRecord("solo", "飲食"),
      bookRecord("shared", "飲食"),
    ]),
    savedNotes: ref<SavedNote[]>([
      {
        id: "n1",
        text: "Latte",
        type: "expense",
        pinned: false,
        count: 4,
        categories: { Coffee: 3, 飲食: 1 },
        lastUsed: "2026-10-01T00:00:00.000Z",
      },
    ]),
    personalRecords: ref<PersonalRecord[]>([
      personal("Coffee"),
      personal("飲食"),
      personal("其他", "expense"),
      personal("其他", "income"),
      personal("Coffee", "income"),
    ]),
    save: vi.fn(async () => {}),
  };
  const actions = setupCategoryActions(
    state.customCategories,
    state.deletedCategoryIds,
    state.overrides,
    ref<string[]>([]),
    state.books,
    state.records,
    state.personalRecords,
    state.savedNotes,
    state.save,
  );
  return { ...state, actions, custom };
}

const categoriesOf = (list: { category: string }[]) =>
  list.map((r) => r.category);

describe("updateCategory", () => {
  it("renames a custom category and its personal and unshared book records", async () => {
    const s = setup();
    await s.actions.updateCategory(s.custom.id, {
      name: " Café ",
      icon: "fastfood",
      color: "red",
    });

    expect(s.customCategories.value[0]).toMatchObject({
      name: "Café",
      icon: "fastfood",
      color: "red",
      isSynced: false,
    });
    // Only expense records: an income "Coffee" is not this category's.
    expect(categoriesOf(s.personalRecords.value)).toEqual([
      "Café",
      "飲食",
      "其他",
      "其他",
      "Coffee",
    ]);
    // The shared book keeps the old name: a rename is not pushed to members.
    expect(categoriesOf(s.records.value)).toEqual([
      "Café",
      "Coffee",
      "飲食",
      "飲食",
    ]);
    expect(s.personalRecords.value[0].isSynced).toBe(false);
    expect(s.personalRecords.value[1].isSynced).toBe(true);
    // Saved notes' per-category uses follow the rename.
    expect(s.savedNotes.value[0].categories).toEqual({ Café: 3, 飲食: 1 });
    expect(s.save).toHaveBeenCalledOnce();
  });

  it("leaves records alone when another category still has the old name", async () => {
    // Duplicate names from before uniqueness was enforced.
    const s = setup([
      {
        id: crypto.randomUUID(),
        name: "Coffee",
        type: "expense",
        icon: "local_bar",
        color: "red",
        isDefault: false,
      },
    ]);
    await s.actions.updateCategory(s.custom.id, {
      name: "Café",
      icon: "local_cafe",
      color: "blue",
    });
    expect(categoriesOf(s.personalRecords.value)[0]).toBe("Coffee");
    expect(s.save).not.toHaveBeenCalled();
  });

  it("keeps a default category's edits as a display override only", async () => {
    const s = setup();
    await s.actions.updateCategory("e1", {
      name: "Meals",
      icon: "restaurant",
      color: "red",
    });

    expect(s.overrides.value).toEqual({ e1: { name: "Meals", color: "red" } });
    expect(saved.get(STORAGE_KEYS.CATEGORY_OVERRIDES)).toEqual(
      s.overrides.value,
    );
    expect(
      s.actions.allCategories.value.find((c) => c.id === "e1"),
    ).toMatchObject({ name: "Meals", color: "red", isDefault: true });
    // Records keep the original name, so it never reaches a shared book, a
    // backup or another device.
    expect(categoriesOf(s.personalRecords.value)[1]).toBe("飲食");
    expect(categoriesOf(s.records.value).slice(2)).toEqual(["飲食", "飲食"]);
    expect(s.save).not.toHaveBeenCalled();
  });

  it("drops an override matching the default, and resets one", async () => {
    const s = setup();
    await s.actions.updateCategory("e1", {
      name: "飲食",
      icon: "fastfood",
      color: "blue",
    });
    expect(s.overrides.value).toEqual({ e1: { icon: "fastfood" } });

    await s.actions.resetDefaultCategory("e1");
    expect(s.overrides.value).toEqual({});
  });
});

describe("restoreDefaultCategoryNames", () => {
  it("puts records renamed by the first release back under the original name", async () => {
    const s = setup();
    s.overrides.value = { e1: { name: "Meals" } };
    s.personalRecords.value[1].category = "Meals";
    s.records.value[2].category = "Meals"; // unshared book
    s.records.value[3].category = "Meals"; // shared: not this device's to fix

    await s.actions.restoreDefaultCategoryNames();

    expect(categoriesOf(s.personalRecords.value)[1]).toBe("飲食");
    expect(categoriesOf(s.records.value).slice(2)).toEqual(["飲食", "Meals"]);
    expect(s.personalRecords.value[1].isSynced).toBe(false);

    s.save.mockClear();
    await s.actions.restoreDefaultCategoryNames();
    expect(s.save).not.toHaveBeenCalled();
  });
});

describe("category lookup", () => {
  it("a renamed default still claims records under its original name", async () => {
    const s = setup();
    await s.actions.updateCategory("e1", {
      name: "Meals",
      icon: "restaurant",
      color: "blue",
    });
    const all = s.actions.allCategories.value;

    expect(findCategoryByName(all, "Meals")?.id).toBe("e1");
    expect(findCategoryByName(all, "飲食")?.id).toBe("e1");
    expect(findCategoryByName(all, "其他", "income")?.id).toBe("i4");
    expect(findCategoryByName(all, "nope")).toBeUndefined();
    expect(storedCategoryName(all.find((c) => c.id === "e1")!)).toBe("飲食");
    expect(storedCategoryName(s.custom)).toBe("Coffee");
    // An expense and an income category may share a name.
    expect(findCategoryByName(all, "Coffee", "expense")?.id).toBe(s.custom.id);
    expect(findCategoryByName(all, "Coffee", "income")).toBeUndefined();
  });

  it("translates a default only while it keeps its original name", () => {
    const t = (k: string) => `t:${k}`;
    const te = () => true;
    const base = {
      type: "expense",
      icon: "restaurant",
      color: "blue",
      isDefault: true,
    } as const;

    expect(categoryLabel({ ...base, id: "e1", name: "飲食" }, t, te)).toBe(
      "t:categories.e1",
    );
    expect(categoryLabel({ ...base, id: "e1", name: "Meals" }, t, te)).toBe(
      "Meals",
    );
    expect(
      categoryLabel(
        { ...base, id: "x", name: "Coffee", isDefault: false },
        t,
        te,
      ),
    ).toBe("Coffee");
  });
});
