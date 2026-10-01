<template>
  <div>
    <dl class="grid grid-cols-2 gap-4">
      <div class="min-w-0">
        <dt class="flex items-center gap-1.5 text-xs" :class="labelClass">
          <span
            class="h-2 w-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          ></span>
          {{ $t("common.totalIncome") }}
        </dt>
        <dd ref="incomeEl" class="amount font-bold text-white tabular-nums">
          {{ fmt(totalIncome) }}
        </dd>
      </div>
      <div class="min-w-0 text-right">
        <dt
          class="flex items-center justify-end gap-1.5 text-xs"
          :class="labelClass"
        >
          {{ $t("common.totalExpense") }}
          <span
            class="h-2 w-2 rounded-full bg-red-500"
            aria-hidden="true"
          ></span>
        </dt>
        <dd ref="expenseEl" class="amount font-bold text-white tabular-nums">
          {{ fmt(totalExpense) }}
        </dd>
      </div>
    </dl>

    <WaterBar
      class="mt-4"
      :share="share"
      :animate="animate"
      :label="barLabel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { CurrencyCode } from "../../stores/types";
import { formatMoney } from "../../utils/currency";
import { incomeShare } from "../../utils/waterBar";
import WaterBar from "./WaterBar.vue";
import { useFitText } from "../../composables/useFitText";
import { useTrackerStore } from "../../stores/tracker";

const props = withDefaults(
  defineProps<{
    currency: CurrencyCode;
    totalIncome: number;
    totalExpense: number;
    labelClass?: string;
  }>(),
  { labelClass: "text-white/70" },
);

const { t, locale } = useI18n();
const store = useTrackerStore();
const animate = computed(() => store.userProfile.animations);

const share = computed(() =>
  incomeShare(props.totalIncome, props.totalExpense),
);

const fmt = (amount: number) =>
  formatMoney(amount, props.currency, locale.value);

// Large totals shrink to stay on one line (and only wrap as a last resort).
const incomeEl = ref<HTMLElement>();
const expenseEl = ref<HTMLElement>();
useFitText(incomeEl, () => fmt(props.totalIncome));
useFitText(expenseEl, () => fmt(props.totalExpense));

const barLabel = computed(() => {
  if (share.value === null) return t("home.shareEmpty");
  const income = Math.round(share.value * 100);
  return t("home.shareLabel", { income, expense: 100 - income });
});
</script>

<style scoped>
/* Sized by useFitText (24px down to 14px); if even that doesn't fit, it wraps
   anywhere rather than being cut off. */
.amount {
  font-size: 24px;
  overflow-wrap: anywhere;
  line-height: 1.15;
}
</style>
