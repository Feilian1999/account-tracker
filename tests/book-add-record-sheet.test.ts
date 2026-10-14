import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";
import NoteSuggestions from "../src/components/NoteSuggestions.vue";
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
    // A shared book: notes from anywhere else must not be offered in it.
    books: [
      { id: "book-1", name: "Trip", members: [], shareCode: "ABCDEFGH" },
      { id: "other-book", name: "Solo", members: [] },
    ],
    records: [
      record,
      { ...record, id: "other", bookId: "other-book", note: "Other book" },
    ],
    personalRecords: [{ ...record, id: "mine", note: "Therapy" }],
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
    currentBookId: "book-1",
    pullSharedBook: vi.fn(),
  }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: "en" } }),
}));

const mountSheet = (props: { editRecordId?: string } = {}) =>
  mount(BookAddRecordSheet, {
    props: {
      modelValue: false,
      bookName: "Trip",
      currency: "TWD" as const,
      members: [
        { id: "member-1", name: "Alice" },
        { id: "member-2", name: "Bob" },
      ],
      ...props,
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

describe("BookAddRecordSheet", () => {
  it("suggests only a shared book's own notes", async () => {
    const wrapper = mountSheet();
    await wrapper.setProps({ modelValue: true });
    await nextTick();

    expect(wrapper.findComponent(NoteSuggestions).props("notes")).toEqual([
      "Lunch",
    ]);
  });

  it("shows split controls immediately when reopening a record with a saved amount", async () => {
    const wrapper = mountSheet({ editRecordId: record.id });

    await wrapper.setProps({ modelValue: true });
    await nextTick();

    expect(wrapper.find('[data-testid="calculator"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("recordSheet.splitAmong");
  });
});
