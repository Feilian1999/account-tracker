import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import BookAddRecordSheet from "../src/components/books/BookAddRecordSheet.vue";

const record = {
  id: "record-1",
  bookId: "book-1",
  type: "expense" as const,
  amount: 120,
  category: "Food",
  date: "2026-08-12",
  note: "Lunch",
  paidById: "member-1",
  splitAmongIds: ["member-1", "member-2"],
};

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => ({
    records: [record],
    recordTemplates: [],
    allCategories: [
      {
        id: "food",
        name: "Food",
        type: "expense",
        icon: "restaurant",
        color: "red",
      },
    ],
    currentBookId: null,
    pullSharedBook: vi.fn(),
  }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("BookAddRecordSheet", () => {
  it("shows split controls immediately when reopening a record with a saved amount", async () => {
    const wrapper = mount(BookAddRecordSheet, {
      props: {
        modelValue: false,
        bookName: "Trip",
        members: [
          { id: "member-1", name: "Alice" },
          { id: "member-2", name: "Bob" },
        ],
        editRecordId: record.id,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
          $te: () => false,
        },
        stubs: {
          RecordSheetLayout: {
            template: '<div><slot name="header-actions" /><slot /></div>',
          },
          CalculatorKeyboard: {
            template: '<div data-testid="calculator" />',
          },
          CategoryPickerSheet: true,
          CategoryIcon: true,
          CloseButton: true,
          BaseButton: true,
        },
      },
    });

    await wrapper.setProps({ modelValue: true });
    await nextTick();

    expect(wrapper.find('[data-testid="calculator"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("recordSheet.splitAmong");
  });
});
