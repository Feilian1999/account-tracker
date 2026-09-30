import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import RecordAmount from "../src/components/RecordAmount.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key, locale: { value: "en" } }),
}));

const mountAmount = (props: Record<string, unknown>) =>
  mount(RecordAmount, {
    props: props as never,
    global: { mocks: { $t: (k: string) => k } },
  });

describe("RecordAmount", () => {
  it("shows a legacy personal record left pending after a base change as TWD", () => {
    // No amountCurrency (pre-multi-currency) = TWD; base is now JPY and the
    // offline rebase left it unconverted.
    const wrapper = mountAmount({
      record: { type: "expense", amount: 500, date: "2026-09-01" },
      expectedCurrency: "JPY",
    });
    expect(wrapper.text()).toContain("-NT$500");
    expect(wrapper.text()).not.toContain("¥");
    expect(wrapper.text()).toContain("currency.pending");
  });

  it("reads a legacy book record in the book currency", () => {
    const wrapper = mountAmount({
      record: { type: "expense", amount: 1000, date: "2026-09-01" },
      expectedCurrency: "JPY",
      legacyCurrency: "JPY",
    });
    expect(wrapper.text()).toContain("-¥1,000");
    expect(wrapper.text()).not.toContain("currency.pending");
  });

  it("shows a foreign record's original amount with the converted one", () => {
    const wrapper = mountAmount({
      record: {
        type: "expense",
        amount: 652,
        amountCurrency: "TWD",
        original: { amount: 3000, currency: "JPY" },
        fx: { rate: 0.2173, rateDate: "2026-09-30", source: "auto" },
        date: "2026-09-30",
      },
      expectedCurrency: "TWD",
    });
    expect(wrapper.text()).toContain("-¥3,000");
    expect(wrapper.text()).toContain("≈ NT$652");
  });
});
