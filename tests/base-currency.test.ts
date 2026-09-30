import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type {
  CurrencyCode,
  PersonalRecord,
  UserProfile,
} from "../src/stores/types";

// Rates per 1 USD; `online` toggles whether prefetch can fill the cache.
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
const fx = vi.hoisted(() => ({ online: true, cached: new Set<string>() }));

vi.mock("../src/utils/fxRates", () => ({
  prefetchRates: vi.fn(async (dates: string[]) => {
    const failed: string[] = [];
    for (const d of new Set(dates)) {
      if (fx.online) fx.cached.add(d);
      else if (!fx.cached.has(d)) failed.push(d);
    }
    return failed;
  }),
  getCachedRate: (from: CurrencyCode, to: CurrencyCode, date: string) =>
    from === to
      ? { rate: 1, rateDate: date, source: "identity" }
      : fx.cached.has(date)
        ? { rate: TABLE[to] / TABLE[from], rateDate: date, source: "auto" }
        : null,
}));

import { setupBaseCurrencyActions } from "../src/stores/base-currency";

const makeStore = (records: PersonalRecord[]) => {
  const userProfile = ref<UserProfile>({
    id: "secret",
    memberId: "public",
    name: "Me",
    theme: "sheep",
    animations: false,
  });
  const personalRecords = ref(records);
  const save = vi.fn(async () => {});
  return {
    userProfile,
    personalRecords,
    save,
    ...setupBaseCurrencyActions(userProfile, personalRecords, save),
  };
};

const rec = (
  amount: number,
  date: string,
  extra: Partial<PersonalRecord> = {},
): PersonalRecord => ({
  id: crypto.randomUUID(),
  type: "expense",
  amount,
  category: "飲食",
  date,
  note: "",
  isSynced: true,
  ...extra,
});

beforeEach(() => {
  fx.online = true;
  fx.cached.clear();
});

describe("base currency", () => {
  it("defaults to TWD for existing profiles", () => {
    expect(makeStore([]).baseCurrency.value).toBe("TWD");
  });

  it("converts, marks records unsynced and restores exactly on the way back", async () => {
    const store = makeStore([rec(150, "2026-09-01"), rec(80, "2026-09-02")]);

    const toJpy = await store.changeBaseCurrency("JPY");
    expect(toJpy).toEqual({ converted: 2, pending: 0 });
    expect(store.userProfile.value.baseCurrency).toBe("JPY");
    expect(store.personalRecords.value.map((r) => r.amount)).toEqual([
      703, 375,
    ]);
    expect(store.personalRecords.value.every((r) => r.isSynced === false)).toBe(
      true,
    );
    expect(store.save).toHaveBeenCalledOnce();

    fx.online = false; // going back to an anchor currency needs no rates
    const back = await store.changeBaseCurrency("TWD");
    expect(back).toEqual({ converted: 2, pending: 0 });
    expect(store.personalRecords.value.map((r) => r.amount)).toEqual([150, 80]);
  });

  it("leaves records pending offline and converts them on retry", async () => {
    fx.online = false;
    const store = makeStore([rec(150, "2026-09-01"), rec(80, "2026-09-02")]);

    const result = await store.changeBaseCurrency("JPY");
    expect(result).toEqual({ converted: 0, pending: 2 });
    expect(store.pendingConversionCount.value).toBe(2);
    // Untouched: still TWD amounts, which totals now skip.
    expect(store.personalRecords.value.map((r) => r.amount)).toEqual([150, 80]);

    fx.online = true;
    expect(await store.convertPendingRecords()).toEqual({
      converted: 2,
      pending: 0,
    });
    expect(store.pendingConversionCount.value).toBe(0);
  });

  it("uses one rate date for everything in 'today' mode", async () => {
    const store = makeStore([rec(150, "2025-01-01"), rec(80, "2026-01-01")]);
    await store.changeBaseCurrency("USD", "today");
    const dates = new Set(
      store.personalRecords.value.map((r) => r.fx?.rateDate),
    );
    expect(dates.size).toBe(1);
  });

  it("maps the records present after the rate fetch, not a stale snapshot", async () => {
    const store = makeStore([rec(150, "2026-09-01")]);
    const pending = store.changeBaseCurrency("JPY");
    // A record typed while rates are being fetched (already in the new base).
    store.personalRecords.value.push(
      rec(3000, "2026-09-30", { amountCurrency: "JPY" }),
    );
    await pending;
    expect(store.personalRecords.value).toHaveLength(2);
    expect(store.personalRecords.value[1].amount).toBe(3000);
  });
});
