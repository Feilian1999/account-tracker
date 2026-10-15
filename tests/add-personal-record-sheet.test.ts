import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import AddPersonalRecordSheet from "../src/components/home/AddPersonalRecordSheet.vue";

const record = {
  id: "record-1",
  type: "expense" as const,
  amount: 120,
  amountCurrency: "TWD",
  category: "Food",
  date: "2026-08-12",
  note: "Lunch",
};

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => ({
    personalRecords: [record],
    records: [],
    books: [],
    recordTemplates: [
      {
        id: "tpl-amount",
        name: "Coffee",
        type: "expense",
        amount: 60,
        category: "food",
        note: "",
      },
      {
        id: "tpl-open",
        name: "Taxi",
        type: "expense",
        amount: null,
        category: "food",
        note: "",
      },
    ],
    allCategories: [
      {
        id: "food",
        name: "Food",
        type: "expense",
        icon: "restaurant",
        color: "red",
      },
    ],
    baseCurrency: "TWD",
    userProfile: { animations: false },
  }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: "en" } }),
}));

const open = async (props: {
  editRecordId?: string;
  initialTemplateId?: string;
}) => {
  const wrapper = mount(AddPersonalRecordSheet, {
    attachTo: document.body,
    props: { modelValue: false, ...props },
    global: {
      mocks: { $t: (key: string) => key, $te: () => false },
      stubs: {
        RecordSheetLayout: {
          template: '<div><slot name="header-actions" /><slot /></div>',
        },
        CalculatorKeyboard: { template: '<div data-testid="calculator" />' },
        CategoryPickerSheet: true,
        CategoryIcon: true,
        CloseButton: true,
        BaseButton: true,
      },
    },
  });
  await wrapper.setProps({ modelValue: true });
  await nextTick();
  await nextTick();
  return wrapper;
};

const calculatorShown = (wrapper: Awaited<ReturnType<typeof open>>) =>
  wrapper.find('[data-testid="calculator"]').exists();

describe("AddPersonalRecordSheet", () => {
  it("opens a record that has an amount without the calculator", async () => {
    expect(calculatorShown(await open({ editRecordId: record.id }))).toBe(
      false,
    );
  });

  it("opens a template with an amount without the calculator", async () => {
    expect(
      calculatorShown(await open({ initialTemplateId: "tpl-amount" })),
    ).toBe(false);
  });

  it("opens the calculator when the amount is still to be typed", async () => {
    expect(calculatorShown(await open({}))).toBe(true);
    expect(calculatorShown(await open({ initialTemplateId: "tpl-open" }))).toBe(
      true,
    );
  });
});
