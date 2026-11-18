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

const updateRecord = vi.hoisted(() => vi.fn());

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => ({
    records: [record],
    // Suggestions come from the saved list, not from records.
    savedNotes: [
      {
        id: "n1",
        text: "Taxi",
        type: "expense",
        pinned: false,
        count: 2,
        categories: {},
        lastUsed: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "n2",
        text: "Salary",
        type: "income",
        pinned: false,
        count: 5,
        categories: {},
        lastUsed: "2026-10-01T00:00:00.000Z",
      },
    ],
    rememberNote: vi.fn(),
    updateRecord,
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

const mountSheet = (
  props: {
    editRecordId?: string;
    solo?: boolean;
    members?: { id: string; name: string }[];
  } = {},
) =>
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
  it("suggests the saved notes of the record's type", async () => {
    const wrapper = mountSheet();
    await wrapper.setProps({ modelValue: true });
    await nextTick();

    expect(wrapper.findComponent(NoteSuggestions).props("notes")).toEqual([
      "Taxi",
    ]);
  });

  it("shows split controls immediately when reopening a record with a saved amount", async () => {
    const wrapper = mountSheet({ editRecordId: record.id });

    await wrapper.setProps({ modelValue: true });
    await nextTick();

    expect(wrapper.find('[data-testid="calculator"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("recordSheet.splitAmong");
  });

  it("hides payer and split in a one-person book", async () => {
    const wrapper = mountSheet({
      solo: true,
      members: [{ id: "member-1", name: "Alice" }],
    });
    await wrapper.setProps({ modelValue: true });
    await nextTick();

    expect(wrapper.text()).not.toContain("recordSheet.paidBy");
    expect(wrapper.text()).not.toContain("recordSheet.splitAmong");
  });

  it("books a one-person record entirely to that member", async () => {
    updateRecord.mockClear();
    const wrapper = mountSheet({
      editRecordId: record.id,
      solo: true,
      members: [{ id: "member-1", name: "Alice" }],
    });
    await wrapper.setProps({ modelValue: true });
    await nextTick();

    await wrapper.find("form").trigger("submit");
    await nextTick();

    expect(updateRecord).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({
        paidById: "member-1",
        splitAmongIds: ["member-1"],
        splitCustomAmounts: undefined,
      }),
    );
  });
});
