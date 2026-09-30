import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stored: Record<string, unknown> = {};
vi.mock("../src/stores/storage", () => ({
  STORAGE_KEYS: { FX_RATES: "fx" },
  loadFromStorage: vi.fn(
    async (key: string, fallback: unknown) => stored[key] ?? fallback,
  ),
  saveToStorage: vi.fn(async (key: string, data: unknown) => {
    stored[key] = JSON.parse(JSON.stringify(data));
    return true;
  }),
}));

import {
  _resetFxCache,
  FIRST_RATE_DATE,
  getCachedRate,
  getRate,
  prefetchRates,
} from "../src/utils/fxRates";
import { getLocalDateString } from "../src/utils/date";

const payload = (date: string, twd = 32, jpy = 150) => ({
  date,
  usd: { twd, jpy, thb: 34, vnd: 25000, cny: 7, eur: 0.9, krw: 1350, gbp: 0.8 },
});

const fetchMock = vi.fn();

beforeEach(() => {
  for (const k of Object.keys(stored)) delete stored[k];
  _resetFxCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const respond = (body: unknown, ok = true) =>
  Promise.resolve({ ok, status: ok ? 200 : 404, json: async () => body });

describe("fxRates", () => {
  it("derives a cross rate from the USD table and caches the day", async () => {
    fetchMock.mockImplementation(() => respond(payload("2025-05-01")));

    const fx = await getRate("JPY", "TWD", "2025-05-01");
    expect(fx).toEqual({
      rate: 32 / 150,
      rateDate: "2025-05-01",
      source: "auto",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain("@2025-05-01/");

    // Second lookup (any pair, same day) is served from the cache.
    expect(await getRate("TWD", "VND", "2025-05-01")).toMatchObject({
      source: "auto",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("is identity for the same currency without fetching", async () => {
    expect(await getRate("TWD", "TWD", "2025-05-01")).toMatchObject({
      rate: 1,
      source: "identity",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the nearest cached day when offline, marked as cached", async () => {
    fetchMock.mockImplementationOnce(() => respond(payload("2025-05-01")));
    await getRate("JPY", "TWD", "2025-05-01");

    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));
    const fx = await getRate("JPY", "TWD", "2025-05-03");
    expect(fx).toEqual({
      rate: 32 / 150,
      rateDate: "2025-05-01",
      source: "cached",
    });
    // Cache-only lookup for the exact day stays null (not silently substituted).
    expect(getCachedRate("JPY", "TWD", "2025-05-03")).toBeNull();
  });

  it("returns null with nothing cached and no network", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));
    expect(await getRate("JPY", "TWD", "2025-05-01")).toBeNull();
  });

  it("uses the newest file for today when today's is not published yet", async () => {
    const today = getLocalDateString();
    fetchMock.mockImplementation((url: string) =>
      url.includes("@latest")
        ? respond(payload("2020-01-01"))
        : respond({}, false),
    );
    const fx = await getRate("USD", "TWD", today);
    expect(fx).toMatchObject({ rate: 32, source: "auto" });
    // Remembered under today, so the next lookup doesn't refetch.
    fetchMock.mockClear();
    expect(getCachedRate("USD", "TWD", today)).toMatchObject({ rate: 32 });
  });

  it("clamps dates before the API's first day", async () => {
    fetchMock.mockImplementation(() => respond(payload(FIRST_RATE_DATE)));
    const fx = await getRate("USD", "JPY", "2021-06-01");
    expect(fx).toMatchObject({ rateDate: FIRST_RATE_DATE, source: "auto" });
    expect(fetchMock.mock.calls[0][0]).toContain(`@${FIRST_RATE_DATE}/`);
  });

  it("prefetches missing days and reports the ones that failed", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes("2025-05-02")
        ? Promise.reject(new Error("x"))
        : respond(payload(url.match(/@([\d-]+)/)![1])),
    );
    const failed = await prefetchRates([
      "2025-05-01",
      "2025-05-02",
      "2025-05-01",
    ]);
    expect(failed).toEqual(["2025-05-02"]);
    expect(getCachedRate("JPY", "TWD", "2025-05-01")).not.toBeNull();
  });

  it("rejects a payload missing a supported currency", async () => {
    fetchMock.mockImplementation(() =>
      respond({ date: "2025-05-01", usd: { twd: 32 } }),
    );
    expect(await getRate("JPY", "TWD", "2025-05-01")).toBeNull();
  });
});
