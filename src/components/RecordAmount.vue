<template>
  <div class="flex min-w-0 flex-col items-end">
    <p
      class="max-w-[140px] truncate text-right font-bold tabular-nums"
      :class="amountClass"
      :title="primary"
    >
      {{ primary }}
    </p>
    <span
      v-if="pending"
      class="mt-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
    >
      {{ $t("currency.pending") }}
    </span>
    <button
      v-else-if="foreign"
      type="button"
      class="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium text-gray-400 tabular-nums hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
      :aria-expanded="showRate"
      :aria-label="`${secondary}. ${$t('currency.showRate')}`"
      @click.stop="showRate = !showRate"
    >
      ≈ {{ secondary }}
      <span class="material-symbols-outlined" style="font-size: 13px" aria-hidden="true"
        >info</span
      >
    </button>
    <p
      v-if="showRate && rateInfo"
      class="mt-0.5 max-w-[180px] text-right text-[10px] leading-tight text-gray-400 dark:text-gray-500"
    >
      {{ rateInfo }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { CurrencyCode } from "../stores/types";
import {
  amountCurrencyOf,
  formatMoney,
  formatRate,
  originalOf,
  type MoneyFields,
} from "../utils/currency";

const props = defineProps<{
  record: MoneyFields & { type: "expense" | "income" };
  /**
   * The currency this record's amount should be in (base currency for personal
   * records, book currency for book records). A mismatch means the record is
   * still waiting to be converted.
   */
  expectedCurrency: CurrencyCode;
  amountClass?: string;
}>();

const { t, locale } = useI18n();
const showRate = ref(false);

const amountCurrency = computed(() =>
  amountCurrencyOf(props.record, props.expectedCurrency),
);
const original = computed(() =>
  originalOf(props.record, props.expectedCurrency),
);
const foreign = computed(
  () => original.value.currency !== amountCurrency.value,
);
const pending = computed(() => amountCurrency.value !== props.expectedCurrency);
const sign = computed(() => (props.record.type === "expense" ? -1 : 1));

const primary = computed(() =>
  formatMoney(
    sign.value * original.value.amount,
    original.value.currency,
    locale.value,
    {
      signed: true,
    },
  ),
);
const secondary = computed(() =>
  formatMoney(props.record.amount, amountCurrency.value, locale.value),
);

const rateInfo = computed(() => {
  const fx = props.record.fx;
  if (!fx) return "";
  return t("currency.convertedInfo", {
    date: fx.rateDate,
    from: original.value.currency,
    rate: formatRate(fx.rate, locale.value),
    to: amountCurrency.value,
  });
});
</script>
