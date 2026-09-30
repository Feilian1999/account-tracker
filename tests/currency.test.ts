import { describe, expect, it } from "vitest";
import {
  allocateProportionally,
  buildMoneyFields,
  formatMoney,
  rebaseRecord,
  roundTo,
  splitEvenly,
  sumInCurrency,
  type MoneyFields,
  type RateLookup,
} from "../src/utils/currency";
import type { CurrencyCode, FxInfo } from "../src/stores/types";

// Units per 1 USD, as the rate source reports them.
const TABLE: Record<CurrencyCode, number> = {
  USD: 1,
  TWD: 32,
  JPY: 150,
  THB: 34,
  VND: 25000,
  CNY: 7,
  EUR: 0.9,
  KRW: 1350,
  GBP: 0.8,
};
const lookup =
  (table = TABLE): RateLookup =>
  (from, to, date): FxInfo => ({
    rate: table[to] / table[from],
    rateDate: date,
    source: "auto",
  });
const noRates: RateLookup = () => null;

type Rec = MoneyFields & { type: "expense" | "income" };
const twdRecord = (amount: number, date = "2026-09-01"): Rec => ({
  type: "expense",
  amount,
  date,
}); // legacy: no amountCurrency → TWD

describe("formatMoney", () => {
  it("uses our own symbols and each currency's precision", () => {
    expect(formatMoney(1234, "TWD", "zh-TW")).toBe("NT$1,234");
    expect(formatMoney(1234, "JPY", "ja")).toBe("¥1,234");
    expect(formatMoney(1234.5, "USD", "en")).toBe("US$1,234.50");
    expect(formatMoney(1234.5, "CNY", "ja")).toBe("CN¥1,234.50");
    expect(formatMoney(1234.5, "EUR", "en")).toBe("€1,234.50");
    expect(formatMoney(12345, "KRW", "ja")).toBe("₩12,345");
    expect(formatMoney(1234.5, "GBP", "zh-TW")).toBe("£1,234.50");
    expect(formatMoney(-150, "TWD", "en")).toBe("-NT$150");
    expect(formatMoney(150, "TWD", "en", { signed: true })).toBe("+NT$150");
  });

  it("does not hide decimals of legacy TWD amounts", () => {
    expect(formatMoney(10.99, "TWD", "en")).toBe("NT$10.99");
  });
});

describe("roundTo / splitEvenly / allocateProportionally", () => {
  it("rounds to the currency's minor unit", () => {
    expect(roundTo(652.37, "TWD")).toBe(652);
    expect(roundTo(3.456, "USD")).toBe(3.46);
    expect(roundTo(1234.6, "KRW")).toBe(1235);
  });

  it("splits in whole units for zero-decimal currencies, summing exactly", () => {
    expect(splitEvenly(1000, 3, "JPY")).toEqual([334, 333, 333]);
    expect(splitEvenly(100, 3, "USD")).toEqual([33.34, 33.33, 33.33]);
    // A legacy 2-decimal amount in a 0-decimal currency still sums exactly.
    const legacy = splitEvenly(10.99, 2, "TWD");
    expect(legacy).toEqual([5.99, 5]);
    expect(legacy.reduce((s, v) => s + v, 0)).toBeCloseTo(10.99, 10);
  });

  it("allocates proportionally and sums exactly to the total", () => {
    const shares = allocateProportionally(652, [1000, 1000, 1000], "TWD");
    expect(shares.reduce((s, v) => s + v, 0)).toBe(652);
    expect(shares).toEqual([218, 217, 217]);
    // Already-exact shares pass through unchanged.
    expect(allocateProportionally(300, [100, 200, 0], "TWD")).toEqual([
      100, 200, 0,
    ]);
  });
});

describe("buildMoneyFields", () => {
  it("stores only the currency for a record typed in the target currency", () => {
    expect(
      buildMoneyFields({
        inputAmount: 150,
        inputCurrency: "TWD",
        targetCurrency: "TWD",
        rate: 1,
        rateDate: "2026-09-30",
        rateSource: "identity",
      }),
    ).toEqual({
      amount: 150,
      amountCurrency: "TWD",
      original: undefined,
      booked: undefined,
      fx: undefined,
    });
  });

  it("anchors a foreign record on what was typed and what was booked", () => {
    const money = buildMoneyFields({
      inputAmount: 3000,
      inputCurrency: "JPY",
      targetCurrency: "TWD",
      rate: 0.2173,
      rateDate: "2026-09-30",
      rateSource: "manual",
    });
    expect(money.amount).toBe(652);
    expect(money.original).toEqual({ amount: 3000, currency: "JPY" });
    expect(money.booked).toEqual({
      amount: 652,
      currency: "TWD",
      rate: 0.2173,
      rateDate: "2026-09-30",
      rateSource: "manual",
    });
  });
});

describe("rebaseRecord", () => {
  const rebaseAll = (records: Rec[], target: CurrencyCode, rates = lookup()) =>
    records.map((r) => rebaseRecord(r, target, rates) ?? r);

  it("TWD ×10 → JPY, JPY ×10 → TWD: the TWD records come back exact", () => {
    // 1. Base TWD: ten TWD records.
    let records: Rec[] = Array.from({ length: 10 }, (_, i) =>
      twdRecord(100 + i),
    );

    // 2. Base JPY: convert, then add ten JPY records typed in JPY.
    records = rebaseAll(records, "JPY");
    records.forEach((r, i) => {
      expect(r.amountCurrency).toBe("JPY");
      expect(r.amount).toBe(roundTo((100 + i) * (150 / 32), "JPY"));
    });
    records.push(
      ...Array.from({ length: 10 }, (_, i) => ({
        type: "expense" as const,
        date: "2026-09-10",
        ...buildMoneyFields({
          inputAmount: 3000 + i,
          inputCurrency: "JPY",
          targetCurrency: "JPY",
          rate: 1,
          rateDate: "2026-09-10",
          rateSource: "identity",
        }),
      })),
    );

    // 3. Back to TWD, with DIFFERENT rates than step 2 used.
    const moved = { ...TABLE, JPY: 160 };
    records = rebaseAll(records, "TWD", lookup(moved));

    expect(records.every((r) => r.amountCurrency === "TWD")).toBe(true);
    // The ten typed-in-TWD records are exact regardless of rate changes.
    records.slice(0, 10).forEach((r, i) => {
      expect(r.amount).toBe(100 + i);
      expect(r.fx).toBeUndefined();
    });
    // The ten typed-in-JPY records are converted at their date's rate.
    records.slice(10).forEach((r, i) => {
      expect(r.amount).toBe(roundTo((3000 + i) * (32 / 160), "TWD"));
      expect(r.original).toEqual({ amount: 3000 + i, currency: "JPY" });
      expect(r.fx?.rateDate).toBe("2026-09-10");
    });

    // And switching to JPY again restores the JPY-typed amounts exactly.
    const again = rebaseAll(records, "JPY", lookup({ ...TABLE, JPY: 170 }));
    again.slice(10).forEach((r, i) => expect(r.amount).toBe(3000 + i));
  });

  it("keeps a manual rate through TWD → USD → TWD", () => {
    const record: Rec = {
      type: "expense",
      date: "2026-09-30",
      ...buildMoneyFields({
        inputAmount: 3000,
        inputCurrency: "JPY",
        targetCurrency: "TWD",
        rate: 0.2173,
        rateDate: "2026-09-30",
        rateSource: "manual",
      }),
    };
    const usd = rebaseRecord(record, "USD", lookup())!;
    expect(usd.amount).toBe(20); // 3000 JPY at the API rate
    const back = rebaseRecord(usd, "TWD", lookup({ ...TABLE, TWD: 40 }))!;
    expect(back.amount).toBe(652);
    expect(back.fx).toEqual({
      rate: 0.2173,
      rateDate: "2026-09-30",
      source: "manual",
    });
  });

  it("does not drift when switching back and forth many times", () => {
    let r: Rec = twdRecord(333);
    for (let i = 0; i < 20; i++) {
      r = rebaseRecord(r, i % 2 === 0 ? "VND" : "TWD", lookup())!;
    }
    expect(r.amountCurrency).toBe("TWD");
    expect(r.amount).toBe(333);
  });

  it("returns null (left pending) when a needed rate is missing", () => {
    expect(rebaseRecord(twdRecord(150), "JPY", noRates)).toBeNull();
    // ...but reaching an anchor currency needs no rate at all.
    const jpy = rebaseRecord(twdRecord(150), "JPY", lookup())!;
    expect(rebaseRecord(jpy, "TWD", noRates)?.amount).toBe(150);
  });

  it("is a no-op when already in the target currency", () => {
    const r = twdRecord(150);
    expect(rebaseRecord(r, "TWD", noRates)).toBe(r);
  });
});

describe("sumInCurrency", () => {
  it("skips records still in another currency", () => {
    const records = [
      { type: "expense", amount: 100, amountCurrency: "TWD" as const },
      { type: "expense", amount: 3000, amountCurrency: "JPY" as const },
      { type: "expense", amount: 50 }, // legacy TWD
      { type: "income", amount: 999 },
    ];
    expect(sumInCurrency(records, "expense", "TWD")).toBe(150);
  });
});
