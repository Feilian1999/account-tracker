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

const dialog = vi.hoisted(() => ({ answer: true, asked: 0 }));
vi.mock("../src/composables/useDialog", () => ({
  confirmDialog: async () => {
    dialog.asked++;
    return dialog.answer;
  },
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

  it.each([
    [true, 1],
    [false, 0],
  ])(
    "asks before deleting a record (confirmed: %s)",
    async (answer, deletes) => {
      dialog.answer = answer;
      dialog.asked = 0;
      const today = new Date();
      store.personalRecords[0].date = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");
      const wrapper = mount(Home, {
        global: {
          mocks: { $t: (key: string) => key },
          stubs: {
            CategoryIcon: { template: "<span />" },
            DraggableFab: { template: "<button />" },
            MonthSelector: { template: "<div />" },
            TemplateSettingsModal: { template: "<div />" },
            AddPersonalRecordSheet: { template: "<div />" },
            DailyRecordGroup: {
              template:
                "<button data-testid='delete' @click=\"$emit('delete', 'record-1')\" />",
            },
            ImportFromBookSheet: { template: "<div />" },
          },
        },
      });

      await wrapper.get("[data-testid='delete']").trigger("click");
      await new Promise((r) => setTimeout(r));

      expect(dialog.asked).toBe(1);
      expect(store.deletePersonalRecord).toHaveBeenCalledTimes(deletes);
    },
  );
});
