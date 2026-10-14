import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CategorySettingsModal from "../src/components/CategorySettingsModal.vue";

const store = {
  allCategories: [
    {
      id: "e1",
      name: "飲食",
      type: "expense",
      icon: "restaurant",
      color: "blue",
      isDefault: true,
    },
    {
      id: "c1",
      name: "Coffee",
      type: "expense",
      icon: "local_cafe",
      color: "red",
      isDefault: false,
    },
    {
      id: "i1",
      name: "薪水",
      type: "income",
      icon: "payments",
      color: "green",
      isDefault: true,
    },
  ],
  deleteCustomCategory: vi.fn(),
  addCustomCategory: vi.fn(),
  updateCategory: vi.fn(),
  resetDefaultCategory: vi.fn(),
};

// Default categories are shown translated, as in the app.
const labels: Record<string, string> = {
  "categories.e1": "Food",
  "categories.i1": "Salary",
};

vi.mock("../src/stores/tracker", () => ({
  useTrackerStore: () => store,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale: { value: "en" },
    t: (key: string) => labels[key] ?? key,
    te: (key: string) => key in labels,
  }),
}));

const mountModal = () =>
  mount(CategorySettingsModal, {
    global: {
      mocks: {
        $t: (key: string) => key,
        $te: () => false,
      },
      stubs: {
        BaseBottomSheet: {
          template: "<div><slot /><slot name='footer' /></div>",
        },
        BaseButton: {
          props: ["disabled"],
          template:
            "<button type='button' :disabled='disabled' @click=\"$emit('click')\"><slot /></button>",
        },
        CategoryIcon: { template: "<span />" },
      },
    },
  });

const buttonWithText = (
  wrapper: ReturnType<typeof mountModal>,
  text: string,
) => {
  const button = wrapper.findAll("button").find((b) => b.text().includes(text));
  if (!button) throw new Error(`no button with "${text}"`);
  return button;
};

const submitButton = (wrapper: ReturnType<typeof mountModal>) =>
  wrapper.findAll("button").at(-1)!;

describe("CategorySettingsModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts typed input when creating a custom category", async () => {
    const wrapper = mountModal();

    await buttonWithText(wrapper, "categories.addCategory").trigger("click");

    const input = wrapper.get("input[type='text']");
    await input.setValue("Investments");

    expect((input.element as HTMLInputElement).value).toBe("Investments");
    expect(submitButton(wrapper).attributes("disabled")).toBeUndefined();
  });

  it("edits a category opened from the list", async () => {
    const wrapper = mountModal();

    await buttonWithText(wrapper, "Coffee").trigger("click");
    const input = wrapper.get("input[type='text']");
    expect((input.element as HTMLInputElement).value).toBe("Coffee");

    await input.setValue("Café");
    await submitButton(wrapper).trigger("click");

    expect(store.updateCategory).toHaveBeenCalledWith("c1", {
      name: "Café",
      icon: "local_cafe",
      color: "red",
    });
  });

  it("keeps a default's stored name when its translated label is untouched", async () => {
    const wrapper = mountModal();

    await buttonWithText(wrapper, "Food").trigger("click");
    expect(
      (wrapper.get("input[type='text']").element as HTMLInputElement).value,
    ).toBe("Food");

    await submitButton(wrapper).trigger("click");

    expect(store.updateCategory).toHaveBeenCalledWith("e1", {
      name: "飲食",
      icon: "restaurant",
      color: "blue",
    });
  });

  it("blocks a name another category of the same type already uses", async () => {
    const wrapper = mountModal();

    await buttonWithText(wrapper, "Coffee").trigger("click");
    const input = wrapper.get("input[type='text']");

    // Shown name, and the original name a default's records still carry.
    for (const taken of ["Food", "飲食"]) {
      await input.setValue(taken);
      expect(wrapper.text()).toContain("categories.nameTaken");
      expect(submitButton(wrapper).attributes("disabled")).toBeDefined();
    }

    // An income category's name is free for an expense one.
    await input.setValue("Salary");
    expect(submitButton(wrapper).attributes("disabled")).toBeUndefined();
  });
});
