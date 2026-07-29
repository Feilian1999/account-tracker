import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import CategoryPickerSheet from "../src/components/CategoryPickerSheet.vue";

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => ({ userProfile: { animations: false } }),
}));

const categories = [
  {
    id: "e1",
    name: "Food",
    type: "expense" as const,
    icon: "restaurant",
    color: "blue",
    isDefault: true,
  },
  {
    id: "e2",
    name: "Transport",
    type: "expense" as const,
    icon: "directions_car",
    color: "green",
    isDefault: true,
  },
];

const mountPicker = (props: Record<string, unknown> = {}) =>
  mount(CategoryPickerSheet, {
    props: {
      modelValue: true,
      categories,
      selectedId: "e1",
      type: "expense" as const,
      ...props,
    },
    global: {
      mocks: { $t: (key: string) => key, $te: () => false },
      stubs: {
        BaseBottomSheet: { template: "<div><slot /></div>" },
        CategoryIcon: { template: "<span />" },
      },
    },
  });

describe("CategoryPickerSheet", () => {
  it("emits the chosen category and closes itself", async () => {
    const wrapper = mountPicker();

    await wrapper.findAll("button")[1].trigger("click");

    expect(wrapper.emitted("select")).toEqual([["e2"]]);
    // Choosing dismisses the picker so the record sheet is usable again.
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
  });

  it("marks only the current category as pressed", () => {
    const buttons = mountPicker().findAll("button");

    expect(buttons[0].attributes("aria-pressed")).toBe("true");
    expect(buttons[1].attributes("aria-pressed")).toBe("false");
  });

  it("shows an empty state instead of an empty grid", () => {
    const wrapper = mountPicker({ categories: [] });

    expect(wrapper.text()).toContain("categoryPicker.empty");
    expect(wrapper.findAll("button")).toHaveLength(0);
  });
});
