import type { CurrencyCode, FxInfo } from "../stores/types";
import {
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from "../stores/storage";
import { CURRENCY_CODES } from "./currency";
import { getLocalDateString } from "./date";

/**
 * Daily exchange rates from @fawazahmed0/currency-api (free, no key, CORS-enabled,
 * one file per date containing every currency). ECB-based sources are not usable
 * here: they have neither TWD nor VND.
 *
 * Each fetched day is cached in IndexedDB as "units per 1 USD" for the supported
 * currencies, so any pair can be derived offline later — in particular when the
 * user changes their base currency and old records need that day's cross rate.
 */

/** Earliest date the API has a file for; older records use this day's rates. */
export const FIRST_RATE_DATE = "2024-03-02";

const FETCH_TIMEOUT = 10000;

type RateTable = Record<CurrencyCode, number>; // units per 1 USD
type RateCache = Record<string, RateTable>; // date -> table

const sources = (version: string) => {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/usd.json`,
  ];
  if (version !== "latest") {
    urls.push(
      `https://${version}.currency-api.pages.dev/v1/currencies/usd.json`,
    );
  }
  return urls;
};

let cache: RateCache | null = null;
let cacheLoad: Promise<RateCache> | null = null;
const inflight = new Map<string, Promise<boolean>>();

async function loadCache(): Promise<RateCache> {
  if (cache) return cache;
  if (!cacheLoad) {
    cacheLoad = loadFromStorage<RateCache>(STORAGE_KEYS.FX_RATES, {}).then(
      (c) => {
        cache = c && typeof c === "object" ? c : {};
        return cache;
      },
    );
  }
  return cacheLoad;
}

function parseTable(json: unknown): { date: string; table: RateTable } | null {
  const data = json as { date?: unknown; usd?: Record<string, unknown> };
  if (!data || typeof data.date !== "string" || !data.usd) return null;
  const table = {} as RateTable;
  for (const code of CURRENCY_CODES) {
    const value = code === "USD" ? 1 : data.usd[code.toLowerCase()];
    if (typeof value !== "number" || !(value > 0)) return null;
    table[code] = value;
  }
  return { date: data.date, table };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches and caches the table for `date`. Resolves true when that date is now cached. */
function fetchDay(date: string): Promise<boolean> {
  const existing = inflight.get(date);
  if (existing) return existing;

  const run = (async () => {
    const c = await loadCache();
    // Today's file may not be published yet; fall back to the newest one.
    const versions = date >= getLocalDateString() ? [date, "latest"] : [date];
    for (const version of versions) {
      for (const url of sources(version)) {
        try {
          const parsed = parseTable(await fetchJson(url));
          if (!parsed) continue;
          c[parsed.date] = parsed.table;
          // "latest" answers today's request with yesterday's rates; remember
          // that under today too so the form doesn't refetch on every keystroke.
          if (parsed.date !== date) c[date] = parsed.table;
          await saveToStorage(STORAGE_KEYS.FX_RATES, c);
          return true;
        } catch {
          // try the next source
        }
      }
    }
    return false;
  })().finally(() => inflight.delete(date));

  inflight.set(date, run);
  return run;
}

const effectiveDate = (date: string) =>
  date < FIRST_RATE_DATE ? FIRST_RATE_DATE : date;

function crossRate(table: RateTable, from: CurrencyCode, to: CurrencyCode) {
  return table[to] / table[from];
}

/** Nearest cached date to `date`, preferring earlier days. */
function nearestCachedDate(c: RateCache, date: string): string | null {
  const dates = Object.keys(c).sort();
  if (dates.length === 0) return null;
  const earlier = dates.filter((d) => d <= date);
  return earlier.length ? earlier[earlier.length - 1] : dates[0];
}

/**
 * Cache-only lookup of the rate on exactly `date` (after FIRST_RATE_DATE
 * clamping). Used after prefetchRates so a batch conversion is deterministic.
 */
export function getCachedRate(
  from: CurrencyCode,
  to: CurrencyCode,
  date: string,
): FxInfo | null {
  if (from === to) return { rate: 1, rateDate: date, source: "identity" };
  const day = effectiveDate(date);
  const table = cache?.[day];
  if (!table) return null;
  return { rate: crossRate(table, from, to), rateDate: day, source: "auto" };
}

/**
 * Rate for converting 1 `from` into `to` on `date`: cached day → fetched day →
 * (offline) nearest cached day, marked "cached". Null when nothing is available.
 */
export async function getRate(
  from: CurrencyCode,
  to: CurrencyCode,
  date: string,
): Promise<FxInfo | null> {
  if (from === to) return { rate: 1, rateDate: date, source: "identity" };
  const c = await loadCache();
  const day = effectiveDate(date);
  if (!c[day]) await fetchDay(day);
  const exact = getCachedRate(from, to, date);
  if (exact) return exact;

  const nearest = nearestCachedDate(c, day);
  if (!nearest) return null;
  return {
    rate: crossRate(c[nearest], from, to),
    rateDate: nearest,
    source: "cached",
  };
}

/**
 * Makes sure every date in `dates` is cached (fetching up to 4 at a time).
 * Returns the dates that could not be fetched.
 */
export async function prefetchRates(dates: string[]): Promise<string[]> {
  const c = await loadCache();
  const missing = [...new Set(dates.map(effectiveDate))].filter((d) => !c[d]);
  const failed: string[] = [];
  const queue = [...missing];
  const worker = async () => {
    while (queue.length) {
      const d = queue.shift()!;
      if (!(await fetchDay(d))) failed.push(d);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
  return failed;
}

/** Test hook: drop the in-memory cache so the next call reloads from storage. */
export function _resetFxCache() {
  cache = null;
  cacheLoad = null;
  inflight.clear();
}
