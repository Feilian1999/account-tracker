import type {
  BookedAmount,
  CurrencyCode,
  FxInfo,
  OriginalAmount,
} from "../stores/types";

/**
 * Supported currencies. `decimals` is the precision amounts are rounded to when
 * entered or converted. TWD is 0 even though ISO 4217 says 2: nobody prices in
 * 角, and Intl would otherwise render every amount as "NT$150.00".
 *
 * Symbols are our own rather than Intl's, which disagree across locales (TWD is
 * "$" in zh-TW, CNY is "元" in ja, THB has no symbol at all).
 */
export const CURRENCIES = {
  TWD: { decimals: 0, symbol: "NT$" },
  JPY: { decimals: 0, symbol: "¥" },
  USD: { decimals: 2, symbol: "US$" },
  THB: { decimals: 2, symbol: "฿" },
  VND: { decimals: 0, symbol: "₫" },
  CNY: { decimals: 2, symbol: "CN¥" },
  EUR: { decimals: 2, symbol: "€" },
  KRW: { decimals: 0, symbol: "₩" },
  GBP: { decimals: 2, symbol: "£" },
} as const satisfies Record<CurrencyCode, { decimals: number; symbol: string }>;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/** Every record written before multi-currency support was in TWD. */
export const LEGACY_CURRENCY: CurrencyCode = "TWD";

export const isCurrencyCode = (value: unknown): value is CurrencyCode =>
  typeof value === "string" && value in CURRENCIES;

export const currencyOf = (value: unknown): CurrencyCode =>
  isCurrencyCode(value) ? value : LEGACY_CURRENCY;

export const decimalsOf = (currency: CurrencyCode) =>
  CURRENCIES[currency].decimals;

export const symbolOf = (currency: CurrencyCode) => CURRENCIES[currency].symbol;

export function roundTo(amount: number, currency: CurrencyCode): number {
  const factor = 10 ** decimalsOf(currency);
  return Math.round(amount * factor) / factor;
}

export function convertAmount(
  amount: number,
  rate: number,
  to: CurrencyCode,
): number {
  return roundTo(amount * rate, to);
}

/**
 * Formats an amount with its currency symbol. Zero-decimal currencies still show
 * up to 2 decimals when the value has them, so legacy TWD amounts like 10.99
 * (entered before TWD was rounded to whole units) are not silently displayed
 * as 11.
 */
export function formatMoney(
  amount: number,
  currency: CurrencyCode,
  locale?: string,
  options: { signed?: boolean } = {},
): string {
  const decimals = decimalsOf(currency);
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: Math.max(decimals, 2),
  }).format(Math.abs(amount));
  const sign = amount < 0 ? "-" : options.signed && amount > 0 ? "+" : "";
  return `${sign}${symbolOf(currency)}${number}`;
}

/** Formats a rate for display: enough significant digits for 1 VND = 0.00122 TWD. */
export function formatRate(rate: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(
    rate,
  );
}

// =====================
//  Record money fields
// =====================

/** The money fields shared by RecordItem and PersonalRecord. */
export interface MoneyFields {
  amount: number;
  amountCurrency?: CurrencyCode;
  original?: OriginalAmount | null;
  booked?: BookedAmount | null;
  fx?: FxInfo | null;
  date: string;
}

export const amountCurrencyOf = (
  record: Pick<MoneyFields, "amountCurrency">,
  fallback: CurrencyCode = LEGACY_CURRENCY,
): CurrencyCode =>
  isCurrencyCode(record.amountCurrency) ? record.amountCurrency : fallback;

/** What the user typed. Records without `original` were typed in their amount currency. */
export function originalOf(
  record: MoneyFields,
  fallback?: CurrencyCode,
): OriginalAmount {
  if (record.original && isCurrencyCode(record.original.currency)) {
    return record.original;
  }
  return {
    amount: record.amount,
    currency: amountCurrencyOf(record, fallback),
  };
}

/** The value the user confirmed at entry time. Defaults to the original, at rate 1. */
export function bookedOf(
  record: MoneyFields,
  fallback?: CurrencyCode,
): BookedAmount {
  if (record.booked && isCurrencyCode(record.booked.currency)) {
    return record.booked;
  }
  const original = originalOf(record, fallback);
  return {
    amount: original.amount,
    currency: original.currency,
    rate: 1,
    rateDate: record.date,
    rateSource: "identity",
  };
}

export const isForeign = (record: MoneyFields, fallback?: CurrencyCode) =>
  originalOf(record, fallback).currency !== amountCurrencyOf(record, fallback);

/**
 * Builds the money fields for a newly entered (or edited) record.
 * `rate` converts 1 unit of `inputCurrency` into `targetCurrency`.
 */
export function buildMoneyFields(input: {
  inputAmount: number;
  inputCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  rate: number;
  rateDate: string;
  rateSource: FxInfo["source"];
}): Pick<
  MoneyFields,
  "amount" | "amountCurrency" | "original" | "booked" | "fx"
> {
  const { inputAmount, inputCurrency, targetCurrency } = input;
  if (inputCurrency === targetCurrency) {
    return {
      amount: roundTo(inputAmount, targetCurrency),
      amountCurrency: targetCurrency,
      original: undefined,
      booked: undefined,
      fx: undefined,
    };
  }
  const amount = convertAmount(inputAmount, input.rate, targetCurrency);
  const fx: FxInfo = {
    rate: input.rate,
    rateDate: input.rateDate,
    source: input.rateSource,
  };
  return {
    amount,
    amountCurrency: targetCurrency,
    original: { amount: inputAmount, currency: inputCurrency },
    booked: {
      amount,
      currency: targetCurrency,
      rate: input.rate,
      rateDate: input.rateDate,
      rateSource: input.rateSource,
    },
    fx,
  };
}

export type RateLookup = (
  from: CurrencyCode,
  to: CurrencyCode,
  date: string,
) => FxInfo | null;

/**
 * Re-expresses a record's `amount` in `target`, always from its anchors so
 * repeated switching never accumulates rounding error:
 *
 * 1. target is the booked currency  → the booked amount (keeps a manual rate)
 * 2. target is the original currency → the original amount
 * 3. otherwise                       → original × rate on the record's date
 *
 * Returns null when case 3 has no rate; the caller leaves the record in its old
 * currency (it is then "pending" and excluded from totals).
 */
export function rebaseRecord<T extends MoneyFields>(
  record: T,
  target: CurrencyCode,
  lookup: RateLookup,
  fallback?: CurrencyCode,
): T | null {
  if (amountCurrencyOf(record, fallback) === target) return record;

  // Materialise the anchors before `amount` changes meaning.
  const original = originalOf(record, fallback);
  const booked = bookedOf(record, fallback);
  const anchored = { ...record, original, booked };

  if (booked.currency === target) {
    return {
      ...anchored,
      amount: booked.amount,
      amountCurrency: target,
      fx:
        booked.currency === original.currency
          ? undefined
          : {
              rate: booked.rate,
              rateDate: booked.rateDate,
              source: booked.rateSource,
            },
    };
  }
  if (original.currency === target) {
    return {
      ...anchored,
      amount: original.amount,
      amountCurrency: target,
      fx: undefined,
    };
  }
  const fx = lookup(original.currency, target, record.date);
  if (!fx) return null;
  return {
    ...anchored,
    amount: convertAmount(original.amount, fx.rate, target),
    amountCurrency: target,
    fx,
  };
}

/** Sums the amounts that are expressed in `currency`; records pending conversion are skipped. */
export function sumInCurrency(
  records: (Pick<MoneyFields, "amount" | "amountCurrency"> & {
    type: string;
  })[],
  type: "expense" | "income",
  currency: CurrencyCode,
): number {
  return records
    .filter((r) => r.type === type && amountCurrencyOf(r) === currency)
    .reduce((sum, r) => sum + r.amount, 0);
}

// =====================
//  Allocation (minor units)
// =====================

/**
 * Splits `total` into `n` shares that sum exactly to `total`, in steps of the
 * currency's minor unit; leftover units go to the first shares. Works in cents
 * internally so a legacy 2-decimal amount in a 0-decimal currency still sums
 * exactly (any sub-unit remainder goes to the first share).
 */
export function splitEvenly(
  total: number,
  n: number,
  currency: CurrencyCode,
): number[] {
  if (n <= 0) return [];
  const totalCents = Math.round(total * 100);
  const step = 10 ** (2 - Math.min(decimalsOf(currency), 2));
  const units = Math.floor(totalCents / step);
  const base = Math.floor(units / n);
  let extra = units - base * n;
  const shares = Array.from({ length: n }, () => {
    let c = base * step;
    if (extra > 0) {
      c += step;
      extra--;
    }
    return c;
  });
  shares[0] += totalCents - units * step;
  return shares.map((c) => c / 100);
}

/**
 * Distributes `total` proportionally to `weights` (largest remainder, in the
 * currency's minor unit) so the result sums exactly to `total`. Used to carry a
 * custom split entered in a foreign currency over to the book currency.
 */
export function allocateProportionally(
  total: number,
  weights: number[],
  currency: CurrencyCode,
): number[] {
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weights.length === 0) return [];
  if (weightSum <= 0) return weights.map(() => 0);
  const factor = 10 ** decimalsOf(currency);
  const totalUnits = Math.round(total * factor);
  const raw = weights.map((w) => (w / weightSum) * totalUnits);
  const floors = raw.map(Math.floor);
  let remaining = totalUnits - floors.reduce((s, u) => s + u, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining--;
  }
  return floors.map((u) => u / factor);
}
