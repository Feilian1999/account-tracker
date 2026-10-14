import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type {
  Book,
  Category,
  CategoryOverride,
  PersonalRecord,
  RecordItem,
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
import { categoryLabel, findCategoryByName } from "../src/utils/categoryLookup";

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

function setup() {
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
    customCategories: ref<Category[]>([custom]),
    deletedCategoryIds: ref<string[]>([]),
    overrides: ref<Record<string, CategoryOverride>>({}),
    books,
    records: ref<RecordItem[]>([
      bookRecord("solo", "Coffee"),
      bookRecord("shared", "Coffee"),
      bookRecord("solo", "飲食"),
      bookRecord("shared", "飲食"),
    ]),
    personalRecords: ref<PersonalRecord[]>([
      personal("Coffee"),
      personal("飲食"),
      personal("其他", "expense"),
      personal("其他", "income"),
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
    ref({}),
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
    expect(categoriesOf(s.personalRecords.value)).toEqual([
      "Café",
      "飲食",
      "其他",
      "其他",
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
    expect(s.save).toHaveBeenCalledOnce();
  });

  it("only touches records of the category's own type", async () => {
    const s = setup();
    await s.actions.updateCategory("i4", {
      name: "Misc income",
      icon: "more_horiz",
      color: "gray",
    });
    expect(categoriesOf(s.personalRecords.value).slice(2)).toEqual([
      "其他",
      "Misc income",
    ]);
  });

  it("keeps a default category's edits as a local override", async () => {
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
    expect(categoriesOf(s.personalRecords.value)[1]).toBe("Meals");
    expect(categoriesOf(s.records.value).slice(2)).toEqual(["Meals", "飲食"]);
  });

  it("changing only the look of a category leaves records alone", async () => {
    const s = setup();
    await s.actions.updateCategory("e1", {
      name: "飲食",
      icon: "fastfood",
      color: "blue",
    });
    expect(s.overrides.value).toEqual({ e1: { icon: "fastfood" } });
    expect(s.save).not.toHaveBeenCalled();
  });

  it("restoring a default drops the override and renames records back", async () => {
    const s = setup();
    await s.actions.updateCategory("e1", {
      name: "Meals",
      icon: "fastfood",
      color: "red",
    });
    await s.actions.resetDefaultCategory("e1");

    expect(s.overrides.value).toEqual({});
    expect(categoriesOf(s.personalRecords.value)[1]).toBe("飲食");
    expect(categoriesOf(s.records.value)[2]).toBe("飲食");
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
