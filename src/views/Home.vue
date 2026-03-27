<template>
  <main class="page-container min-h-screen bg-gray-50 transition-colors dark:bg-gray-900">
    <header class="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 pb-8 pt-10 text-white shadow-lg">
      <h1 class="sr-only">{{ $t("home.personalRecords") }}</h1>
      <SummaryBar
        :totalExpense="filteredExpense"
        :totalIncome="filteredIncome"
        :balance="filteredBalance"
        labelClass="text-violet-200"
        valueClass="text-lg"
      />
    </header>

    <section class="mt-3 px-4" aria-labelledby="personal-records-title">
      <header class="mb-3 flex items-center justify-between">
        <h2 id="personal-records-title" class="section-title">{{ $t("home.personalRecords") }}</h2>
        <p class="section-count">{{ $t("home.totalRecords", { count: filteredPersonalRecords.length }) }}</p>
      </header>

      <div class="relative mb-3 mt-1 flex items-center gap-2">
        <button
          v-if="showFilterMenu || showImportMenu"
          type="button"
          class="fixed inset-0 z-10"
          aria-label="Close open menus"
          @click="showFilterMenu = false; showImportMenu = false"
        ></button>

        <MonthSelector
          v-model="selectedMonth"
          :mode="filterMode"
          class="flex-1"
          :class="{ 'pointer-events-none opacity-50': filterMode === 'all' }"
        />

        <div class="relative">
          <button
            type="button"
            class="relative z-20 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            :aria-controls="filterMenuId"
            :aria-expanded="showFilterMenu"
            aria-haspopup="menu"
            aria-label="Open record filters"
            @click="showFilterMenu = !showFilterMenu; showImportMenu = false"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>

          <transition name="slide-up">
            <ul
              v-if="showFilterMenu"
              :id="filterMenuId"
              class="absolute right-0 top-12 z-20 w-36 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
              role="menu"
            >
              <li>
                <button
                  type="button"
                  role="menuitemradio"
                  :aria-checked="filterMode === 'all'"
                  :class="['w-full px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700', filterMode === 'all' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200']"
                  @click="setFilterMode('all')"
                >
                  {{ $t("filter.all") }}
                </button>
              </li>
              <li class="h-px bg-gray-100 dark:bg-gray-700/50"></li>
              <li>
                <button
                  type="button"
                  role="menuitemradio"
                  :aria-checked="filterMode === 'year'"
                  :class="['w-full px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700', filterMode === 'year' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200']"
                  @click="setFilterMode('year')"
                >
                  {{ $t("filter.year") }}
                </button>
              </li>
              <li class="h-px bg-gray-100 dark:bg-gray-700/50"></li>
              <li>
                <button
                  type="button"
                  role="menuitemradio"
                  :aria-checked="filterMode === 'month'"
                  :class="['w-full px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700', filterMode === 'month' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200']"
                  @click="setFilterMode('month')"
                >
                  {{ $t("filter.month") }}
                </button>
              </li>
            </ul>
          </transition>
        </div>

        <div class="relative">
          <button
            type="button"
            class="relative z-20 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-violet-50 text-violet-600 shadow-sm transition-colors hover:bg-violet-100 active:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
            :aria-controls="importMenuId"
            :aria-expanded="showImportMenu"
            aria-haspopup="menu"
            aria-label="Open import and template actions"
            @click="showImportMenu = !showImportMenu; showFilterMenu = false"
          >
            <CategoryIcon name="system_update_alt" class="text-[22px]" />
          </button>

          <transition name="slide-up">
            <ul
              v-if="showImportMenu"
              :id="importMenuId"
              class="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
              role="menu"
            >
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  role="menuitem"
                  @click="showImportSheet = true; showImportMenu = false"
                >
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                    <CategoryIcon name="import_export" class="text-base" />
                  </span>
                  {{ $t("home.importFromBook") }}
                </button>
              </li>
              <li class="h-px bg-gray-100 dark:bg-gray-700/50"></li>
              <li v-for="tpl in store.recordTemplates" :key="tpl.id">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  role="menuitem"
                  @click="openNewRecordFromTemplate(tpl.id); showImportMenu = false"
                >
                  <span
                    :class="[
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                      getTemplateCategoryStyle(tpl.category).bg,
                      getTemplateCategoryStyle(tpl.category).text,
                    ]"
                  >
                    <CategoryIcon :name="getTemplateCategoryStyle(tpl.category).icon" style="transform: scale(0.65);" />
                  </span>
                  <span class="truncate">{{ tpl.name }}</span>
                </button>
              </li>
              <li class="h-px bg-gray-100 dark:bg-gray-700/50"></li>
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                  role="menuitem"
                  @click="showTemplateManager = true; showImportMenu = false"
                >
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <CategoryIcon name="settings" class="text-base" />
                  </span>
                  {{ $t("templates.manage") }}
                </button>
              </li>
            </ul>
          </transition>
        </div>
      </div>

      <section v-if="filteredPersonalRecords.length === 0" class="empty-state py-10 text-sm" aria-live="polite">
        <div class="mb-2 text-3xl" aria-hidden="true">📝</div>
        {{ $t("home.noRecords") }}
      </section>

      <div v-else class="space-y-6">
        <DailyRecordGroup
          v-for="[dateGroup, records] in groupedRecords"
          :key="dateGroup"
          :dateGroup="dateGroup"
          :records="records"
          @edit="openEditRecord"
          @delete="store.deletePersonalRecord"
        />
      </div>
    </section>

    <DraggableFab aria-label="Add personal record" @click="openNewRecord" />

    <AddPersonalRecordSheet v-model="showForm" :editRecordId="editRecordId" :initialTemplateId="useTemplateId" />
    <ImportFromBookSheet v-model="showImportSheet" />
    <TemplateSettingsModal v-model="showTemplateManager" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import CategoryIcon from "../components/CategoryIcon.vue";
import DraggableFab from "../components/DraggableFab.vue";
import MonthSelector from "../components/MonthSelector.vue";
import SummaryBar from "../components/SummaryBar.vue";
import TemplateSettingsModal from "../components/TemplateSettingsModal.vue";
import AddPersonalRecordSheet from "../components/home/AddPersonalRecordSheet.vue";
import DailyRecordGroup from "../components/home/DailyRecordGroup.vue";
import ImportFromBookSheet from "../components/home/ImportFromBookSheet.vue";
import { useTrackerStore } from "../stores/tracker";
import { colorMap } from "../utils/category";

const store = useTrackerStore();
const showForm = ref(false);
const showImportSheet = ref(false);
const showImportMenu = ref(false);
const showTemplateManager = ref(false);
const editRecordId = ref<string | undefined>(undefined);
const useTemplateId = ref<string | undefined>(undefined);
const selectedMonth = ref<string>(new Date().toISOString().slice(0, 7));
const filterMode = ref<"all" | "year" | "month">("month");
const showFilterMenu = ref(false);
const filterMenuId = "home-filter-menu";
const importMenuId = "home-import-menu";

const setFilterMode = (mode: "all" | "year" | "month") => {
  filterMode.value = mode;
  showFilterMenu.value = false;
};

const filteredPersonalRecords = computed(() =>
  store.personalRecords
    .filter((r) => {
      if (filterMode.value === "all") return true;
      if (filterMode.value === "year") return r.date.startsWith(selectedMonth.value.split("-")[0]);
      if (filterMode.value === "month") return r.date.startsWith(selectedMonth.value);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date)),
);

const groupedRecords = computed(() => {
  const groups = new Map<string, typeof store.personalRecords>();
  filteredPersonalRecords.value.forEach((record) => {
    if (!groups.has(record.date)) groups.set(record.date, []);
    groups.get(record.date)!.push(record);
  });
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
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
  const tpl = store.recordTemplates.find((t) => t.id === templateId);
  if (tpl && tpl.amount !== null) {
    const catName = store.allCategories.find((c) => c.id === tpl.category)?.name ?? tpl.category;
    store.addPersonalRecord({
      type: tpl.type,
      amount: tpl.amount,
      category: catName,
      date: new Date().toISOString().split("T")[0],
      note: tpl.note,
    });
    return;
  }

  editRecordId.value = undefined;
  useTemplateId.value = templateId;
  showForm.value = true;
};

const getTemplateCategoryStyle = (categoryId: string) => {
  const cat = store.allCategories.find((c) => c.id === categoryId);
  const color = cat?.color ?? "gray";
  return {
    icon: cat?.icon ?? "more_horiz",
    ...(colorMap[color] ?? colorMap.gray),
  };
};
</script>
