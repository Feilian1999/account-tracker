<template>
  <div class="page-container min-h-screen bg-gray-50 transition-colors dark:bg-gray-900">
    <!-- Header -->
    <div class="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 pb-8 pt-10 text-white shadow-lg">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-violet-200">
            {{ $t("home.personalAccount") }}
          </p>
          <h1 class="mt-0.5 text-xl font-bold text-white">
            {{ store.userProfile.name }}
          </h1>
        </div>
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
          {{ store.userProfile.name.charAt(0) }}
        </div>
      </div>

      <SummaryBar
        :totalExpense="filteredExpense"
        :totalIncome="filteredIncome"
        :balance="filteredBalance"
        labelClass="text-violet-200"
        valueClass="text-lg"
      />
    </div>

    <!-- Import from Book Button -->
    <div class="mt-5 px-4">
      <button
        @click="showImportSheet = true"
        class="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-50 bg-white p-4 font-bold text-gray-700 shadow-sm transition-all active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-lg text-violet-600">📥</div>
        {{ $t("home.importFromBook") }}
      </button>
    </div>

    <!-- Personal Records -->
    <div class="mt-5 px-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="section-title">{{ $t("home.personalRecords") }}</h2>
        <span class="section-count">{{ $t("home.totalRecords", { count: filteredPersonalRecords.length }) }}</span>
      </div>

      <div v-if="store.personalRecords.length === 0" class="empty-state py-10 text-sm">
        <div class="mb-2 text-3xl">📄</div>
        {{ $t("home.noRecords") }}
      </div>

      <template v-else>
        <DateFilterBar :dates="recordDates" @change="onFilterChange" class="mb-3" />

        <div v-if="filteredPersonalRecords.length === 0" class="empty-state py-8 text-sm">
          <div class="mb-2 text-3xl">🔍</div>
          {{ $t("filter.noRecords") }}
        </div>

        <div v-else class="space-y-2.5">
          <div
            v-for="record in filteredPersonalRecords"
          :key="record.id"
          @click="openEditRecord(record.id)"
          class="record-card cursor-pointer"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'record-icon',
                  getCategoryStyle(record.category).bg,
                  getCategoryStyle(record.category).text,
                ]"
              >
                <CategoryIcon :name="getCategoryStyle(record.category).icon" />
              </div>
              <div>
                <p class="section-title text-sm">
                  {{ getLocalizedCategoryName(record.category) }}
                </p>
                <p class="hint-text mt-0.5">{{ formatDate(record.date, locale) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <p
                :class="[
                  'max-w-[120px] truncate font-bold text-right',
                  record.type === 'expense' ? 'text-red-500' : 'text-green-500',
                ]"
                :title="(record.type === 'expense' ? '-' : '+') + record.amount.toLocaleString()"
              >
                {{ record.type === "expense" ? "-" : "+" }}{{ record.amount.toLocaleString() }}
              </p>
              <button
                @click.stop="store.deletePersonalRecord(record.id)"
                class="btn-delete shrink-0"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div v-if="record.note || record.sourceBookId" class="mt-2 flex items-center gap-2">
            <span v-if="record.note" class="hint-text truncate">{{ record.note }}</span>
            <span
              v-if="record.sourceBookId"
              class="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-500 dark:bg-violet-900/30 dark:text-violet-400"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              </svg>
              {{ $t("home.fromBook") }}
            </span>
          </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Draggable FAB -->
    <DraggableFab @click="openNewRecord" />

    <!-- Sheets (extracted components) -->
    <AddPersonalRecordSheet v-model="showForm" :editRecordId="editRecordId" />
    <ImportFromBookSheet v-model="showImportSheet" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../stores/tracker";
import { colorMap, formatDate } from "../utils/category";
import DraggableFab from "../components/DraggableFab.vue";
import CategoryIcon from "../components/CategoryIcon.vue";
import SummaryBar from "../components/SummaryBar.vue";
import DateFilterBar from "../components/DateFilterBar.vue";
import type { DateFilter } from "../components/DateFilterBar.vue";
import AddPersonalRecordSheet from "../components/home/AddPersonalRecordSheet.vue";
import ImportFromBookSheet from "../components/home/ImportFromBookSheet.vue";

const store = useTrackerStore();
const { locale, te, t } = useI18n();
const showForm = ref(false);
const showImportSheet = ref(false);
const editRecordId = ref<string | undefined>(undefined);

// ---- Date Filter ----
const dateFilter = ref<DateFilter>({ mode: "all", year: "", month: "", date: "" });
const onFilterChange = (f: DateFilter) => { dateFilter.value = f; };
const recordDates = computed(() => store.personalRecords.map((r) => r.date));

const filteredPersonalRecords = computed(() => {
  const records = store.personalRecords;
  const { mode, year, month, date } = dateFilter.value;
  let result;
  if (mode === "all") result = records;
  else if (mode === "year") result = records.filter((r) => r.date.startsWith(year));
  else if (mode === "month") result = records.filter((r) => r.date.startsWith(`${year}-${month}`));
  else if (mode === "date") result = records.filter((r) => r.date === date);
  else result = records;
  return [...result].sort((a, b) => b.date.localeCompare(a.date));
});

const filteredExpense = computed(() =>
  filteredPersonalRecords.value.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0),
);
const filteredIncome = computed(() =>
  filteredPersonalRecords.value.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0),
);
const filteredBalance = computed(() => filteredIncome.value - filteredExpense.value);

const openNewRecord = () => {
  editRecordId.value = undefined;
  showForm.value = true;
};

const openEditRecord = (id: string) => {
  editRecordId.value = id;
  showForm.value = true;
};

// Pre-built category lookup map to avoid repeated store.find() calls per render
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
</script>
