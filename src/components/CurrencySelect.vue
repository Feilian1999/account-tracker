<template>
  <label class="relative inline-flex shrink-0 items-center">
    <span class="sr-only">{{ label || $t("currency.label") }}</span>
    <select
      :value="modelValue"
      :disabled="disabled"
      class="cursor-pointer appearance-none rounded-lg bg-gray-100 py-1 pr-6 pl-2 text-sm font-bold text-gray-600 transition-colors outline-none hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      @change="
        $emit(
          'update:modelValue',
          ($event.target as HTMLSelectElement).value as CurrencyCode,
        )
      "
    >
      <option v-for="code in CURRENCY_CODES" :key="code" :value="code">
        {{ compact ? code : `${code} · ${$t(`currency.names.${code}`)}` }}
      </option>
    </select>
    <span
      class="material-symbols-outlined pointer-events-none absolute right-1 text-gray-400"
      style="font-size: 16px"
      aria-hidden="true"
      >expand_more</span
    >
  </label>
</template>

<script setup lang="ts">
import type { CurrencyCode } from "../stores/types";
import { CURRENCY_CODES } from "../utils/currency";

defineProps<{
  modelValue: CurrencyCode;
  /** Show only the code in the options (for inline use next to an amount). */
  compact?: boolean;
  disabled?: boolean;
  label?: string;
}>();

defineEmits<{ "update:modelValue": [value: CurrencyCode] }>();
</script>
