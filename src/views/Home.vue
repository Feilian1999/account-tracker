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

    <!-- Quick Actions (Import + Templates) -->
    <div class="mt-5 px-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="section-title">{{ $t("home.quickActions") }}</h2>
      </div>
      <div class="custom-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        <!-- Special: Import From Book Card -->
        <button
          @click="showImportSheet = true"
          class="flex shrink-0 items-center justify-start gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-2.5 pr-5 shadow-sm transition-all active:scale-95 dark:border-violet-900/30 dark:bg-violet-900/20"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-xl text-white shadow-sm shadow-violet-200 dark:shadow-none">
            📥
          </div>
          <div class="flex flex-col items-start gap-0.5 text-left">
            <span class="text-sm font-bold text-violet-700 dark:text-violet-300">{{ $t("home.importFromBook") }}</span>
            <span class="text-[10px] text-violet-500/80 dark:text-violet-400/60">{{ $t("home.quickImportHint") }}</span>
          </div>
        </button>

        <!-- User Templates -->
        <button
          v-for="tpl in store.recordTemplates"
          :key="tpl.id"
          @click="openNewRecordFromTemplate(tpl.id)"
          class="flex shrink-0 items-center justify-start gap-3 rounded-2xl border border-gray-100 bg-white p-2.5 pr-5 shadow-sm transition-all active:scale-95 dark:border-gray-700 dark:bg-gray-800"
        >
          <div
            :class="[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
              getTemplateCategoryStyle(tpl.category).bg,
              getTemplateCategoryStyle(tpl.category).text,
            ]"
          >
            <CategoryIcon :name="getTemplateCategoryStyle(tpl.category).icon" />
          </div>
          <div class="flex flex-col items-start gap-0.5 text-left max-w-[120px]">
            <span class="w-full truncate text-sm font-bold text-gray-700 dark:text-gray-200">{{ tpl.name }}</span>
            <span v-if="tpl.amount" class="w-full truncate text-[11px] font-bold tabular-nums" :class="tpl.type === 'expense' ? 'text-red-500' : 'text-green-500'">
              ${{ Math.round(tpl.amount).toLocaleString() }}
            </span>
          </div>
        </button>

        <!-- Add/Manage Shortcut -->
        <button
          @click="showTemplateManager = true"
          class="flex shrink-0 items-center justify-start gap-3 rounded-2xl border border-dashed border-gray-200 bg-transparent p-2.5 pr-5 transition-all active:scale-95 dark:border-gray-700"
        >
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl text-gray-500 dark:bg-gray-800">
            ⚙️
          </div>
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ $t("templates.manage") }}</span>
        </button>
      </div>
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
        <DateFilterBar :dates="recordDates" initialMode="month" @change="onFilterChange" class="mb-3" />

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
            <div class="flex min-w-0 items-center gap-3">
              <div
                :class="[
                  'record-icon',
                  getCategoryStyle(record.category).bg,
                  getCategoryStyle(record.category).text,
                ]"
              >
                <CategoryIcon :name="getCategoryStyle(record.category).icon" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-2">
                  <p class="section-title shrink-0 whitespace-nowrap text-sm">
                    {{ getLocalizedCategoryName(record.category) }}
                  </p>
                  <span v-if="record.note" class="hint-text truncate text-xs min-w-0 before:mr-0.5 before:content-['•']">
                    {{ record.note }}
                  </span>
                </div>
                <div class="mt-0.5 flex items-center gap-2">
                  <p class="hint-text shrink-0">{{ formatDate(record.date, locale) }}</p>
                  <span
                    v-if="record.sourceBookId"
                    class="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-500 dark:bg-violet-900/30 dark:text-violet-400"
                  >
                    <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                    </svg>
                    {{ $t("home.fromBook") }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <p
                :class="[
                  'max-w-[100px] truncate font-bold text-right tabular-nums',
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
          </div>
        </div>
      </template>
    </div>

    <!-- Draggable FAB -->
    <DraggableFab @click="openNewRecord" />

    <!-- Sheets (extracted components) -->
    <AddPersonalRecordSheet v-model="showForm" :editRecordId="editRecordId" :initialTemplateId="useTemplateId" />
    <ImportFromBookSheet v-model="showImportSheet" />
    <TemplateSettingsModal v-model="showTemplateManager" />
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
import TemplateSettingsModal from "../components/TemplateSettingsModal.vue";

const store = useTrackerStore();
const { locale, te, t } = useI18n();
const showForm = ref(false);
const showImportSheet = ref(false);
const showTemplateManager = ref(false);
const editRecordId = ref<string | undefined>(undefined);
const useTemplateId = ref<string | undefined>(undefined);

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
  useTemplateId.value = undefined;
  showForm.value = true;
};

const openEditRecord = (id: string) => {
  editRecordId.value = id;
  useTemplateId.value = undefined;
  showForm.value = true;
};

const openNewRecordFromTemplate = (templateId: string) => {
  const tpl = store.recordTemplates.find(t => t.id === templateId);
  if (tpl && tpl.amount !== null) {
    // Template stores category id, but records store category name. Resolve it:
    const catName = store.allCategories.find(c => c.id === tpl.category)?.name ?? tpl.category;
    store.addPersonalRecord({
      type: tpl.type,
      amount: tpl.amount,
      category: catName,
      date: new Date().toISOString().split("T")[0],
      note: tpl.note,
    });
    // Record is added, no need to open sheet
    return;
  }
  
  editRecordId.value = undefined;
  useTemplateId.value = templateId;
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

const getTemplateCategoryStyle = (categoryId: string) => {
  const cat = store.allCategories.find(c => c.id === categoryId);
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
