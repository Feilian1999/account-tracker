import type { Ref } from "vue";
import { computed } from "vue";
import type { CurrencyCode, PersonalRecord, UserProfile } from "./types";
import {
  amountCurrencyOf,
  bookedOf,
  currencyOf,
  originalOf,
  rebaseRecord,
} from "../utils/currency";
import { getCachedRate, prefetchRates } from "../utils/fxRates";
import { getLocalDateString } from "../utils/date";

export type RebaseMode = "historical" | "today";

export interface RebaseResult {
  converted: number;
  /** Records left in another currency because no rate was available. */
  pending: number;
}

/**
 * The user's base currency: the currency personal records are totalled in.
 *
 * Changing it re-expresses every personal record's `amount` via rebaseRecord
 * (anchored on `original`/`booked`, so switching back is exact). Records whose
 * rate cannot be fetched keep their old currency and count as pending; they are
 * excluded from totals until convertPendingRecords succeeds. Book records are
 * never touched — a book has its own currency.
 */
export function setupBaseCurrencyActions(
  userProfile: Ref<UserProfile>,
  personalRecords: Ref<PersonalRecord[]>,
  save: () => Promise<void>,
) {
  const baseCurrency = computed<CurrencyCode>(() =>
    currencyOf(userProfile.value.baseCurrency),
  );

  const pendingConversionCount = computed(
    () =>
      personalRecords.value.filter(
        (r) => amountCurrencyOf(r) !== baseCurrency.value,
      ).length,
  );

  /** Records that need a fetched rate (rebase case 3) to reach `target`. */
  const needsRate = (r: PersonalRecord, target: CurrencyCode) =>
    amountCurrencyOf(r) !== target &&
    originalOf(r).currency !== target &&
    bookedOf(r).currency !== target;

  const rebaseAll = async (target: CurrencyCode, mode: RebaseMode) => {
    const today = getLocalDateString();
    const dates = personalRecords.value
      .filter((r) => needsRate(r, target))
      .map((r) => (mode === "today" ? today : r.date));
    await prefetchRates(dates);

    // Map the CURRENT records after the (slow) prefetch, so a record added or
    // edited meanwhile is not overwritten by a stale snapshot.
    let converted = 0;
    personalRecords.value = personalRecords.value.map((r) => {
      const rebased = rebaseRecord(r, target, (from, to, date) =>
        getCachedRate(from, to, mode === "today" ? today : date),
      );
      if (!rebased || rebased === r) return r;
      converted++;
      return { ...rebased, isSynced: false };
    });
    return converted;
  };

  const result = (converted: number): RebaseResult => ({
    converted,
    pending: pendingConversionCount.value,
  });

  const changeBaseCurrency = async (
    target: CurrencyCode,
    mode: RebaseMode = "historical",
  ): Promise<RebaseResult> => {
    userProfile.value.baseCurrency = target;
    const converted = await rebaseAll(target, mode);
    await save();
    return result(converted);
  };

  /** Retries records left pending by an offline base-currency change. */
  const convertPendingRecords = async (): Promise<RebaseResult> => {
    const converted = await rebaseAll(baseCurrency.value, "historical");
    if (converted > 0) await save();
    return result(converted);
  };

  return {
    baseCurrency,
    pendingConversionCount,
    changeBaseCurrency,
    convertPendingRecords,
  };
}
