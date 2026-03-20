<template>
  <div class="page-container min-h-screen bg-gray-50 transition-colors dark:bg-gray-900">
    <!-- Header -->
    <div class="rounded-b-3xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pb-8 pt-10 text-white shadow-lg">
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
    </div>

    <div class="mt-5 px-4">
      <!-- Date Filter -->
      <DateFilterBar
        v-if="store.personalRecords.length > 0"
        :dates="recordDates"
        @change="onFilterChange"
        class="mb-5"
      />

      <!-- Empty State -->
      <div v-if="filteredRecords.length === 0" class="empty-state py-16">
        <div class="mb-3 text-5xl">📊</div>
        <p class="font-bold">{{ $t("statistics.noData") }}</p>
      </div>

      <template v-else>
        <!-- ===== Category Breakdown ===== -->
        <div class="mb-6">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="section-title">{{ $t("statistics.categoryBreakdown") }}</h2>

            <!-- Toggle expense / income -->
            <div class="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                @click="categoryTab = 'expense'"
                :class="[
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                  categoryTab === 'expense'
                    ? 'bg-white text-red-600 shadow-sm dark:bg-gray-700 dark:text-red-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                ]"
              >
                {{ $t("common.expense") }}
              </button>
              <button
                @click="categoryTab = 'income'"
                :class="[
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                  categoryTab === 'income'
                    ? 'bg-white text-green-600 shadow-sm dark:bg-gray-700 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                ]"
              >
                {{ $t("common.income") }}
              </button>
            </div>
          </div>

          <!-- Category list or empty -->
          <div v-if="categoryBreakdown.length === 0" class="empty-state py-8 text-sm">
            <div class="mb-2 text-3xl">🔍</div>
            {{ $t("statistics.noData") }}
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in categoryBreakdown"
              :key="item.categoryName"
              class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'record-icon',
                      item.style.bg,
                      item.style.text,
                    ]"
                  >
                    <CategoryIcon :name="item.style.icon" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {{ item.localizedName }}
                    </p>
                    <p class="hint-text mt-0.5">
                      {{ item.count }} {{ $t("statistics.records") }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p
                    :class="[
                      'font-bold',
                      categoryTab === 'expense' ? 'text-red-500' : 'text-green-500',
                    ]"
                  >
                    {{ item.total.toLocaleString() }}
                  </p>
                  <p class="hint-text mt-0.5">{{ item.percentage }}%</p>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="categoryTab === 'expense' ? 'bg-red-400' : 'bg-green-400'"
                  :style="{ width: item.percentage + '%' }"
                ></div>
              </div>
            </div>

            <!-- Total row -->
            <div class="flex items-center justify-between rounded-2xl bg-gray-100 p-4 font-bold dark:bg-gray-800">
              <span class="text-gray-600 dark:text-gray-300">{{ $t("statistics.total") }}</span>
              <span :class="categoryTab === 'expense' ? 'text-red-500' : 'text-green-500'">
                {{ categoryTotal.toLocaleString() }}
              </span>
            </div>
          </div>
        </div>

        <!-- ===== Monthly Trend ===== -->
        <div class="mb-6">
          <h2 class="section-title mb-3">{{ $t("statistics.monthlyTrend") }}</h2>

          <div v-if="monthlyData.length === 0" class="empty-state py-8 text-sm">
            <div class="mb-2 text-3xl">📈</div>
            {{ $t("statistics.noData") }}
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="m in monthlyData"
              :key="m.month"
              class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ m.label }}</span>
                <div class="flex gap-4 text-xs">
                  <span class="text-red-500">-{{ m.expense.toLocaleString() }}</span>
                  <span class="text-green-500">+{{ m.income.toLocaleString() }}</span>
                </div>
              </div>

              <!-- Dual bar -->
              <div class="space-y-1.5">
                <div class="flex items-center gap-2">
                  <span class="w-8 text-right text-[10px] text-gray-400">{{ $t("common.expense") }}</span>
                  <div class="h-3 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      class="h-full rounded-full bg-red-400 transition-all duration-500"
                      :style="{ width: m.expensePercent + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-8 text-right text-[10px] text-gray-400">{{ $t("common.income") }}</span>
                  <div class="h-3 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      class="h-full rounded-full bg-green-400 transition-all duration-500"
                      :style="{ width: m.incomePercent + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../stores/tracker";
import { colorMap } from "../utils/category";
import SummaryBar from "../components/SummaryBar.vue";
import DateFilterBar from "../components/DateFilterBar.vue";
import CategoryIcon from "../components/CategoryIcon.vue";
import type { DateFilter } from "../components/DateFilterBar.vue";

const store = useTrackerStore();
const { locale, te, t } = useI18n();

// ---- Date Filter ----
const dateFilter = ref<DateFilter>({ mode: "all", year: "", month: "", date: "" });
const onFilterChange = (f: DateFilter) => { dateFilter.value = f; };
const recordDates = computed(() => store.personalRecords.map((r) => r.date));

const filteredRecords = computed(() => {
  const records = store.personalRecords;
  const { mode, year, month, date } = dateFilter.value;
  let result;
  if (mode === "all") result = records;
  else if (mode === "year") result = records.filter((r) => r.date.startsWith(year));
  else if (mode === "month") result = records.filter((r) => r.date.startsWith(`${year}-${month}`));
  else if (mode === "date") result = records.filter((r) => r.date === date);
  else result = records;
  return result;
});

const filteredExpense = computed(() =>
  filteredRecords.value.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0),
);
const filteredIncome = computed(() =>
  filteredRecords.value.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0),
);
const filteredBalance = computed(() => filteredIncome.value - filteredExpense.value);

// ---- Category Breakdown ----
const categoryTab = ref<"expense" | "income">("expense");

const categoryMap = computed(() =>
  new Map(store.allCategories.map((c) => [c.name, c])),
);

const getCategoryStyle = (categoryName: string) => {
  const cat = categoryMap.value.get(categoryName);
  const color = cat?.color ?? "gray";
  return {
    icon: cat?.icon ?? "more_horiz",
    ...(colorMap[color] ?? colorMap.gray),
  };
};

const getLocalizedCategoryName = (categoryName: string) => {
  const cat = categoryMap.value.get(categoryName);
  if (cat && te(`categories.${cat.id}`)) return t(`categories.${cat.id}`);
  return categoryName;
};

const categoryTotal = computed(() => {
  return filteredRecords.value
    .filter((r) => r.type === categoryTab.value)
    .reduce((s, r) => s + r.amount, 0);
});

const categoryBreakdown = computed(() => {
  const typeRecords = filteredRecords.value.filter((r) => r.type === categoryTab.value);
  const total = typeRecords.reduce((s, r) => s + r.amount, 0);
  if (total === 0) return [];

  // Aggregate by category name
  const map = new Map<string, { total: number; count: number }>();
  for (const r of typeRecords) {
    const entry = map.get(r.category) ?? { total: 0, count: 0 };
    entry.total += r.amount;
    entry.count += 1;
    map.set(r.category, entry);
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

// ---- Monthly Trend ----
const monthlyData = computed(() => {
  const records = filteredRecords.value;
  if (records.length === 0) return [];

  // Aggregate by YYYY-MM
  const map = new Map<string, { expense: number; income: number }>();
  for (const r of records) {
    const ym = r.date.slice(0, 7); // YYYY-MM
    const entry = map.get(ym) ?? { expense: 0, income: 0 };
    if (r.type === "expense") entry.expense += r.amount;
    else entry.income += r.amount;
    map.set(ym, entry);
  }

  const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Find max for bar percentage scaling
  const maxVal = entries.reduce(
    (m, [, v]) => Math.max(m, v.expense, v.income), 0,
  );
  if (maxVal === 0) return [];

  return entries.map(([ym, data]) => {
    const [y, m] = ym.split("-");
    const label = new Intl.DateTimeFormat(locale.value, {
      year: "numeric",
      month: "short",
    }).format(new Date(parseInt(y), parseInt(m, 10) - 1));

    return {
      month: ym,
      label,
      expense: Math.round(data.expense),
      income: Math.round(data.income),
      expensePercent: Math.round((data.expense / maxVal) * 100),
      incomePercent: Math.round((data.income / maxVal) * 100),
    };
  });
});
</script>
