<template>
  <div
    class="rounded-xl bg-violet-50/60 px-3 py-2 text-xs dark:bg-violet-900/20"
    aria-live="polite"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="font-bold text-violet-700 dark:text-violet-300">
        <template v-if="loading">{{ $t("currency.loadingRate") }}</template>
        <template v-else-if="rate"
          >≈ {{ formatMoney(converted, target, locale) }}</template
        >
        <template v-else>{{ $t("currency.rateUnavailable") }}</template>
      </span>
      <button
        v-if="!loading && rate && !editing"
        type="button"
        class="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-gray-500 transition-colors hover:bg-white/70 dark:text-gray-400 dark:hover:bg-gray-800"
        :aria-label="$t('currency.editRate')"
        @click="startEdit"
      >
        <span class="tabular-nums">{{ rateLine }}</span>
        <span class="material-symbols-outlined" style="font-size: 14px" aria-hidden="true"
          >edit</span
        >
      </button>
    </div>

    <div
      v-if="editing || (!loading && !rate)"
      class="mt-2 flex items-center gap-2"
    >
      <label
        :for="inputId"
        class="shrink-0 font-semibold text-gray-500 dark:text-gray-400"
      >
        1 {{ currency }} =
      </label>
      <input
        :id="inputId"
        ref="rateInput"
        v-model="draft"
        type="text"
        inputmode="decimal"
        class="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-right font-bold text-gray-800 outline-none focus:border-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        @keydown.enter.prevent="commit"
        @blur="commit"
      />
      <span class="shrink-0 font-semibold text-gray-500 dark:text-gray-400">{{
        target
      }}</span>
    </div>

    <p
      v-if="!loading && rate && sourceLabel"
      class="mt-1 text-[10px] text-gray-400 dark:text-gray-500"
    >
      {{ sourceLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from "vue";
import { useI18n } from "vue-i18n";
import type { CurrencyCode, FxInfo } from "../stores/types";
import { formatMoney, formatRate } from "../utils/currency";

const props = defineProps<{
  currency: CurrencyCode;
  target: CurrencyCode;
  rate: number | null;
  rateDate: string;
  source: FxInfo["source"];
  loading: boolean;
  converted: number;
}>();

const emit = defineEmits<{ "update:rate": [value: number] }>();

const { t, locale } = useI18n();
const inputId = useId();
const editing = ref(false);
const draft = ref("");
const rateInput = ref<HTMLInputElement>();

const rateLine = computed(() =>
  props.rate
    ? t("currency.rateLine", {
        from: props.currency,
        rate: formatRate(props.rate, locale.value),
        to: props.target,
      })
    : "",
);

const sourceLabel = computed(() => {
  if (props.source === "manual") return t("currency.source.manual");
  if (props.source === "cached")
    return t("currency.source.cached", { date: props.rateDate });
  if (props.source === "auto")
    return t("currency.source.auto", { date: props.rateDate });
  return "";
});

const startEdit = async () => {
  draft.value = props.rate ? String(props.rate) : "";
  editing.value = true;
  await nextTick();
  rateInput.value?.focus();
  rateInput.value?.select();
};

const commit = () => {
  const value = Number(draft.value.replace(/,/g, "").trim());
  if (Number.isFinite(value) && value > 0) emit("update:rate", value);
  editing.value = false;
};
</script>
