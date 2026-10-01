<template>
  <!-- One row per total: label left, the full amount right (room for large
       numbers, which wrap rather than being cut off). -->
  <dl class="divide-y divide-white/15 overflow-hidden rounded-2xl bg-white/15">
    <div
      v-for="row in rows"
      :key="row.key"
      class="flex items-baseline justify-between gap-4 px-4 py-3"
    >
      <dt :class="['text-xs', labelClass]">{{ $t(row.label) }}</dt>
      <dd
        class="amount text-right font-bold tabular-nums"
        :class="[valueClass, row.tone ?? 'text-white']"
      >
        {{ fmt(row.value) }}
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CurrencyCode } from "../stores/types";
import { formatMoney } from "../utils/currency";

const props = defineProps<{
  currency: CurrencyCode;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  /** Tailwind class for the label (e.g. 'text-violet-200', 'text-blue-200') */
  labelClass?: string;
  /** Tailwind class for the value font size (e.g. 'text-lg', 'text-base') */
  valueClass?: string;
}>();

const rows = computed(() => [
  { key: "expense", label: "common.totalExpense", value: props.totalExpense },
  { key: "income", label: "common.totalIncome", value: props.totalIncome },
  {
    key: "net",
    label: "common.net",
    value: props.balance,
    tone: props.balance < 0 ? "text-red-300" : "text-green-300",
  },
]);

const { locale } = useI18n();
const fmt = (amount: number) =>
  formatMoney(amount, props.currency, locale.value);
</script>

<style scoped>
/* An amount wraps rather than being cut off. */
.amount {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
