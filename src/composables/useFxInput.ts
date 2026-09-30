import { computed, ref, watch, type Ref } from "vue";
import type { CurrencyCode, FxInfo } from "../stores/types";
import { buildMoneyFields, convertAmount } from "../utils/currency";
import { getRate } from "../utils/fxRates";

/**
 * State for the "amount in currency X, booked in currency Y" part of a record
 * form. `target` is where the record's `amount` lives (base currency for
 * personal records, the book currency for book records).
 *
 * The rate is refetched whenever the input currency, target or date changes,
 * except for a rate the user typed or one loaded from the record being edited
 * — those stay put until the currency or date actually changes.
 */
export function useFxInput(options: {
  target: Ref<CurrencyCode>;
  date: Ref<string>;
  amount: Ref<number>;
}) {
  const { target, date, amount } = options;

  const currency = ref<CurrencyCode>(target.value);
  const rate = ref<number | null>(1);
  const rateDate = ref(date.value);
  const source = ref<FxInfo["source"]>("identity");
  const loading = ref(false);

  // A rate the user typed or that came with an edited record, pinned to the
  // currency/date/target it was valid for.
  let pinnedKey: string | null = null;
  const keyNow = () => `${currency.value}|${target.value}|${date.value}`;
  let request = 0;

  const isForeign = computed(() => currency.value !== target.value);

  const refresh = async () => {
    const id = ++request;
    if (!isForeign.value) {
      pinnedKey = null;
      rate.value = 1;
      source.value = "identity";
      rateDate.value = date.value;
      loading.value = false;
      return;
    }
    if (pinnedKey === keyNow()) return;
    pinnedKey = null;
    loading.value = true;
    const fx = await getRate(currency.value, target.value, date.value);
    if (id !== request) return; // superseded by a newer change
    loading.value = false;
    if (fx) {
      rate.value = fx.rate;
      source.value = fx.source;
      rateDate.value = fx.rateDate;
    } else {
      rate.value = null;
      source.value = "manual";
      rateDate.value = date.value;
    }
  };

  watch([currency, target, date], refresh);

  const setManualRate = (value: number) => {
    request++; // drop any fetch still in flight
    loading.value = false;
    rate.value = value > 0 ? value : null;
    source.value = "manual";
    rateDate.value = date.value;
    pinnedKey = keyNow();
  };

  /** Resets to "typed in the target currency" (new record). */
  const reset = (initial?: CurrencyCode) => {
    request++;
    pinnedKey = null;
    currency.value = initial ?? target.value;
    loading.value = false;
    rate.value = 1;
    source.value = "identity";
    rateDate.value = date.value;
    if (isForeign.value) refresh();
  };

  /** Restores an edited record's input currency and confirmed rate. */
  const load = (input: {
    currency: CurrencyCode;
    rate: number;
    rateDate: string;
    source: FxInfo["source"];
  }) => {
    request++;
    loading.value = false;
    currency.value = input.currency;
    rate.value = input.rate;
    rateDate.value = input.rateDate;
    source.value = input.source;
    pinnedKey = input.currency === target.value ? null : keyNow();
  };

  const ready = computed(
    () =>
      !isForeign.value || (!loading.value && !!rate.value && rate.value > 0),
  );

  /** The amount converted into the target currency (0 until a rate exists). */
  const converted = computed(() =>
    isForeign.value
      ? rate.value
        ? convertAmount(amount.value || 0, rate.value, target.value)
        : 0
      : amount.value || 0,
  );

  const build = (inputAmount: number) =>
    buildMoneyFields({
      inputAmount,
      inputCurrency: currency.value,
      targetCurrency: target.value,
      rate: rate.value ?? 1,
      rateDate: rateDate.value,
      rateSource: source.value,
    });

  return {
    currency,
    rate,
    rateDate,
    source,
    loading,
    isForeign,
    ready,
    converted,
    setManualRate,
    reset,
    load,
    build,
  };
}
