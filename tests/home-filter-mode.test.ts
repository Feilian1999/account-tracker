import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../src/views/Home.vue";

const store = {
  personalRecords: [
    {
      id: "record-1",
      type: "expense",
      amount: 120,
      category: "Food",
      date: "2026-03-31",
      note: "",
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

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => store,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ locale: { value: "en" }, t: (key: string) => key }),
}));

describe("Home filter mode", () => {
  beforeEach(() => {
    store.deletePersonalRecord.mockClear();
    store.addPersonalRecord.mockClear();
  });

  it("does not render the month selector when the filter mode is all", async () => {
    const wrapper = mount(Home, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          CategoryIcon: { template: "<span />" },
          DraggableFab: { template: "<button />" },
          MonthSelector: { template: '<div data-testid="month-selector" />' },
          TemplateSettingsModal: { template: "<div />" },
          AddPersonalRecordSheet: { template: "<div />" },
          DailyRecordGroup: { template: "<div />" },
          ImportFromBookSheet: { template: "<div />" },
        },
      },
    });

    expect(wrapper.find('[data-testid="month-selector"]').exists()).toBe(true);

    await wrapper
      .get('button[aria-label="Open record filters"]')
      .trigger("click");
    await wrapper
      .get('button[role="menuitemradio"][aria-checked="false"]')
      .trigger("click");

    expect(wrapper.find('[data-testid="month-selector"]').exists()).toBe(false);
  });
});
