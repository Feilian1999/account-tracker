import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import Home from "../src/views/Home.vue";
import { recordMatchesQuery } from "../src/utils/recordSearch";

const rec = (
  note: string,
  category: string,
  amount: number,
  original?: number,
) => ({
  note,
  category,
  amount,
  original:
    original === undefined
      ? undefined
      : { amount: original, currency: "JPY" as const },
});

describe("recordMatchesQuery", () => {
  it("matches everything for an empty query", () => {
    expect(recordMatchesQuery(rec("", "Food", 1), "   ")).toBe(true);
  });

  it("matches note, category, shown label and amounts, ignoring case", () => {
    const r = rec("Lunch at Ichiran", "e1", 1200, 5600);
    expect(recordMatchesQuery(r, "ichiran")).toBe(true);
    expect(recordMatchesQuery(r, "E1")).toBe(true);
    expect(recordMatchesQuery(r, "飲食", "飲食")).toBe(true);
    expect(recordMatchesQuery(r, "1200")).toBe(true);
    expect(recordMatchesQuery(r, "1,200")).toBe(true);
    expect(recordMatchesQuery(r, "5600")).toBe(true);
    expect(recordMatchesQuery(r, "dinner")).toBe(false);
  });

  it("requires every word to match", () => {
    const r = rec("Lunch", "Food", 120);
    expect(recordMatchesQuery(r, "lunch 120")).toBe(true);
    expect(recordMatchesQuery(r, "lunch 999")).toBe(false);
  });

  it("matches full-width input against half-width text", () => {
    expect(recordMatchesQuery(rec("Taxi", "Transport", 300), "ＴＡＸＩ")).toBe(
      true,
    );
  });
});

const today = new Date();
const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const store = {
  personalRecords: [
    {
      id: "r1",
      type: "expense",
      amount: 120,
      category: "Food",
      date: `${thisMonth}-01`,
      note: "Lunch",
    },
    {
      id: "r2",
      type: "expense",
      amount: 300,
      category: "Transport",
      date: `${thisMonth}-02`,
      note: "Taxi",
    },
  ],
  allCategories: [],
  recordTemplates: [],
  baseCurrency: "TWD",
  userProfile: { animations: false },
  pendingConversionCount: 0,
  convertPendingRecords: vi.fn(),
  deletePersonalRecord: vi.fn(),
  addPersonalRecord: vi.fn(),
};

vi.mock("../src/stores/tracker", () => ({ useTrackerStore: () => store }));
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale: { value: "en" },
    t: (key: string) => key,
    te: () => false,
  }),
}));

const mountHome = () =>
  mount(Home, {
    global: {
      mocks: { $t: (key: string) => key },
      stubs: {
        CategoryIcon: { template: "<span />" },
        DraggableFab: { template: "<button />" },
        MonthSelector: { template: "<div />" },
        TemplateSettingsModal: { template: "<div />" },
        AddPersonalRecordSheet: { template: "<div />" },
        DailyRecordGroup: {
          props: ["records"],
          template:
            "<p data-testid='group'>{{ records.map((r) => r.note).join(',') }}</p>",
        },
        ImportFromBookSheet: { template: "<div />" },
      },
    },
  });

const shownNotes = (wrapper: ReturnType<typeof mountHome>) =>
  wrapper.findAll("[data-testid='group']").map((g) => g.text());

describe("Home search", () => {
  it("narrows the list and resets when closed", async () => {
    const wrapper = mountHome();
    expect(wrapper.find("input[type='search']").exists()).toBe(false);

    await wrapper.get("[data-testid='search-toggle']").trigger("click");
    await wrapper.get("input[type='search']").setValue("taxi");
    expect(shownNotes(wrapper)).toEqual(["Taxi"]);

    await wrapper.get("input[type='search']").setValue("nothing");
    expect(shownNotes(wrapper)).toEqual([]);
    expect(wrapper.text()).toContain("home.noSearchResults");

    await wrapper.get("[data-testid='search-toggle']").trigger("click");
    await nextTick();
    expect(wrapper.find("input[type='search']").exists()).toBe(false);
    expect(shownNotes(wrapper)).toEqual(["Taxi", "Lunch"]);
  });
});
