<template>
  <div>
    <div class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
      <button
        v-for="m in MODES"
        :key="m"
        type="button"
        @click="setMode(m)"
        :class="[
          'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
          mode === m
            ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
        ]"
      >
        {{ $t(`filter.${m}`) }}
      </button>
    </div>

    <div v-if="mode !== 'all'" class="mt-2 flex gap-2">
      <select
        v-if="mode === 'year' || mode === 'month'"
        v-model="year"
        class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
      </select>

      <select
        v-if="mode === 'month'"
        v-model="month"
        class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <option v-for="mo in availableMonthsForYear" :key="mo" :value="mo">
          {{ formatMonth(mo) }}
        </option>
      </select>

      <input
        v-if="mode === 'date'"
        v-model="date"
        type="date"
        class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

export type FilterMode = "all" | "year" | "month" | "date";

export interface DateFilter {
  mode: FilterMode;
  year: string;
  month: string;
  date: string;
}

const props = defineProps<{ dates: string[]; initialMode?: FilterMode; hideDateMode?: boolean }>();
const emit = defineEmits<{ (e: "change", filter: DateFilter): void }>();

const { locale } = useI18n();
const MODES = computed<FilterMode[]>(() => {
  const base: FilterMode[] = ["all", "year", "month"];
  if (!props.hideDateMode) base.push("date");
  return base;
});

const today = new Date().toISOString().split("T")[0];
const currentYear = today.slice(0, 4);
const currentMonth = today.slice(5, 7);

const mode = ref<FilterMode>(props.initialMode ?? "all");
const year = ref(currentYear);
const month = ref(currentMonth);
const date = ref(today);

const availableYears = computed(() => {
  const years = [...new Set(props.dates.map((d) => d.slice(0, 4)))].sort((a, b) =>
    b.localeCompare(a),
  );
  return years.length > 0 ? years : [currentYear];
});

const availableMonthsForYear = computed(() =>
  [...new Set(props.dates.filter((d) => d.startsWith(year.value)).map((d) => d.slice(5, 7)))].sort(),
);

const formatMonth = (m: string): string =>
  new Intl.DateTimeFormat(locale.value, { month: "long" }).format(
    new Date(parseInt(year.value, 10), parseInt(m, 10) - 1),
  );

function emitFilter() {
  emit("change", { mode: mode.value, year: year.value, month: month.value, date: date.value });
}

watch(year, () => {
  const months = availableMonthsForYear.value;
  if (months.length > 0 && !months.includes(month.value)) {
    month.value = months[months.length - 1];
  }
});

watch([mode, year, month, date], emitFilter, { immediate: true });

function setMode(newMode: FilterMode) {
  mode.value = newMode;
  if ((newMode === "year" || newMode === "month") && !availableYears.value.includes(year.value)) {
    year.value = availableYears.value[0];
  }
  if (newMode === "month") {
    const months = availableMonthsForYear.value;
    if (months.length > 0 && !months.includes(month.value)) {
      month.value = months[months.length - 1];
    }
  }
}
</script>
