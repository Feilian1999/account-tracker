<template>
  <main class="page-container min-h-screen bg-gray-50 transition-colors dark:bg-gray-900">
    <header class="rounded-b-3xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pb-8 pt-10 text-white shadow-lg">
      <div class="mb-4">
        <p class="text-xs font-medium uppercase tracking-wider text-emerald-200">
          {{ $t("statistics.subtitle") }}
        </p>
        <h1 class="mt-0.5 text-xl font-bold text-white">
          {{ $t("statistics.title") }}
        </h1>
      </div>

      <SummaryBar
        :totalExpense="filteredExpense"
        :totalIncome="filteredIncome"
        :balance="filteredBalance"
        labelClass="text-emerald-200"
        valueClass="text-lg"
      />
    </header>

    <div class="mt-5 space-y-5 px-4 pb-24">
      <section v-if="store.personalRecords.length > 0" aria-label="Date filters">
        <DateFilterBar
          :dates="recordDates"
          initialMode="year"
          hideDateMode
          @change="onFilterChange"
        />
      </section>

      <section v-if="filteredRecords.length === 0" class="empty-state py-16" aria-live="polite">
        <div class="mb-3 text-5xl" aria-hidden="true">📊</div>
        <p class="font-bold">{{ $t("statistics.noData") }}</p>
      </section>

      <template v-else>
        <section aria-labelledby="statistics-type-heading">
          <div class="mb-4 flex justify-end">
            <h2 id="statistics-type-heading" class="sr-only">{{ $t("statistics.categoryBreakdown") }}</h2>
            <div class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="tablist" aria-label="Record type">
              <button
                type="button"
                role="tab"
                :aria-selected="categoryTab === 'expense'"
                :tabindex="categoryTab === 'expense' ? 0 : -1"
                :class="[
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                  categoryTab === 'expense'
                    ? 'bg-white text-red-600 shadow-sm dark:bg-gray-700 dark:text-red-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                ]"
                @click="categoryTab = 'expense'"
              >
                {{ $t("common.expense") }}
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="categoryTab === 'income'"
                :tabindex="categoryTab === 'income' ? 0 : -1"
                :class="[
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                  categoryTab === 'income'
                    ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                ]"
                @click="categoryTab = 'income'"
              >
                {{ $t("common.income") }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="dateFilter.mode !== 'date'" aria-labelledby="statistics-trend-heading">
          <h2 id="statistics-trend-heading" class="sr-only">{{ trendTitle }}</h2>
          <TrendChart
            :title="trendTitle"
            :data="trendData"
            :maxVal="trendMaxVal"
            :activeTab="categoryTab"
          />
        </section>

        <section aria-labelledby="statistics-breakdown-heading">
          <h2 id="statistics-breakdown-heading" class="sr-only">{{ $t("statistics.categoryBreakdown") }}</h2>
          <CategoryBreakdown
            :data="categoryBreakdown"
            :total="categoryTotal"
            :activeTab="categoryTab"
          />
        </section>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import CategoryBreakdown from "../components/statistics/CategoryBreakdown.vue";
import TrendChart from "../components/statistics/TrendChart.vue";
import DateFilterBar from "../components/DateFilterBar.vue";
import SummaryBar from "../components/SummaryBar.vue";
import type { DateFilter } from "../components/DateFilterBar.vue";
import { useTrackerStore } from "../stores/tracker";
import { colorMap } from "../utils/category";

const store = useTrackerStore();
const { te, t } = useI18n();

const today = new Date().toISOString().split("T")[0];
const currentYear = today.slice(0, 4);
const currentMonth = today.slice(5, 7);

const dateFilter = ref<DateFilter>({ mode: "year", year: currentYear, month: currentMonth, date: today });
const onFilterChange = (f: DateFilter) => {
  dateFilter.value = f;
};
const recordDates = computed(() => store.personalRecords.map((r) => r.date));

const filteredRecords = computed(() => {
  const records = store.personalRecords;
  const { mode, year, month, date } = dateFilter.value;
  if (mode === "all") return records;
  if (mode === "year") return records.filter((r) => r.date.startsWith(year));
  if (mode === "month") return records.filter((r) => r.date.startsWith(`${year}-${month}`));
  if (mode === "date") return records.filter((r) => r.date === date);
  return records;
});

const filteredExpense = computed(() =>
  filteredRecords.value.filter((r) => r.type === "expense").reduce((sum, record) => sum + record.amount, 0),
);
const filteredIncome = computed(() =>
  filteredRecords.value.filter((r) => r.type === "income").reduce((sum, record) => sum + record.amount, 0),
);
const filteredBalance = computed(() => filteredIncome.value - filteredExpense.value);

const categoryTab = ref<"expense" | "income">("expense");

const categoryMap = computed(() => new Map(store.allCategories.map((category) => [category.name, category])));

const getCategoryStyle = (categoryName: string) => {
  const category = categoryMap.value.get(categoryName);
  const color = category?.color ?? "gray";
  return {
    icon: category?.icon ?? "more_horiz",
    ...(colorMap[color] ?? colorMap.gray),
  };
};

const getLocalizedCategoryName = (categoryName: string) => {
  const category = categoryMap.value.get(categoryName);
  if (category && te(`categories.${category.id}`)) return t(`categories.${category.id}`);
  return categoryName;
};

const categoryTotal = computed(() =>
  filteredRecords.value
    .filter((record) => record.type === categoryTab.value)
    .reduce((sum, record) => sum + record.amount, 0),
);

const categoryBreakdown = computed(() => {
  const typeRecords = filteredRecords.value.filter((record) => record.type === categoryTab.value);
  const total = typeRecords.reduce((sum, record) => sum + record.amount, 0);
  if (total === 0) return [];

  const map = new Map<string, { total: number; count: number }>();
  for (const record of typeRecords) {
    const entry = map.get(record.category) ?? { total: 0, count: 0 };
    entry.total += record.amount;
    entry.count += 1;
    map.set(record.category, entry);
  }

  return [...map.entries()]
    .map(([categoryName, data]) => ({
      categoryName,
      localizedName: getLocalizedCategoryName(categoryName),
      total: Math.round(data.total),
      count: data.count,
      percentage: Math.round((data.total / total) * 100),
      style: getCategoryStyle(categoryName),
    }))
    .sort((a, b) => b.total - a.total);
});

const trendTitle = computed(() => {
  const mode = dateFilter.value.mode;
  if (mode === "all") return t("statistics.yearlyTrend");
  if (mode === "year") return t("statistics.monthlyTrend");
  if (mode === "month") return t("statistics.dailyTrend");
  return "";
});

const trendMaxValRaw = ref(0);
const trendMaxVal = computed(() => trendMaxValRaw.value);

const trendData = computed(() => {
  const records = filteredRecords.value;
  const mode = dateFilter.value.mode;
  const type = categoryTab.value;
  if (records.length === 0 || mode === "date") return [];

  const typeRecords = records.filter((record) => record.type === type);

  const getKey = (dateStr: string): string => {
    if (mode === "all") return dateStr.slice(0, 4);
    if (mode === "year") return dateStr.slice(0, 7);
    if (mode === "month") return dateStr;
    return dateStr;
  };

  const map = new Map<string, number>();

  if (mode === "year") {
    const year = dateFilter.value.year;
    for (let month = 1; month <= 12; month += 1) {
      const paddedMonth = month.toString().padStart(2, "0");
      map.set(`${year}-${paddedMonth}`, 0);
    }
  } else if (mode === "month") {
    const year = parseInt(dateFilter.value.year, 10);
    const month = parseInt(dateFilter.value.month, 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const prefix = `${dateFilter.value.year}-${dateFilter.value.month}`;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const paddedDay = day.toString().padStart(2, "0");
      map.set(`${prefix}-${paddedDay}`, 0);
    }
  }

  for (const record of typeRecords) {
    const key = getKey(record.date);
    if (mode === "all" || map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + record.amount);
    }
  }

  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxVal = entries.reduce((max, [, value]) => Math.max(max, value), 0);
  trendMaxValRaw.value = maxVal;
  if (maxVal === 0) return [];

  return entries.map(([key, value]) => {
    let shortLabel = key;
    if (mode === "year") shortLabel = String(parseInt(key.slice(5, 7), 10));
    if (mode === "month") shortLabel = String(parseInt(key.slice(8, 10), 10));

    return {
      key,
      shortLabel,
      value: Math.round(value),
      percent: Math.max(Math.round((value / maxVal) * 100), value > 0 ? 2 : 0),
    };
  });
});
</script>
