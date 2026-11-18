<template>
  <main
    class="page-container min-h-screen bg-gray-50 transition-colors dark:bg-gray-900"
  >
    <header
      class="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 pt-10 pb-8 text-white shadow-lg"
    >
      <h1 class="sr-only">{{ $t("home.personalRecords") }}</h1>
      <IncomeExpenseSummary
        :currency="store.baseCurrency"
        :totalIncome="filteredIncome"
        :totalExpense="filteredExpense"
        labelClass="text-violet-200"
      />
    </header>

    <section class="mt-3 px-4" aria-labelledby="personal-records-title">
      <header class="mb-3 flex items-center justify-between">
        <h2 id="personal-records-title" class="section-title">
          {{ $t("home.personalRecords") }}
        </h2>
        <p class="section-count">
          {{
            $t("home.totalRecords", { count: filteredPersonalRecords.length })
          }}
        </p>
      </header>

      <div class="relative mt-1 mb-3 flex items-center gap-2">
        <button
          v-if="showFilterMenu || showImportMenu"
          type="button"
          class="fixed inset-0 z-10"
          aria-label="Close open menus"
          @click="
            showFilterMenu = false;
            showImportMenu = false;
          "
        ></button>

        <MonthSelector
          v-if="showMonthSelector"
          v-model="selectedMonth"
          :mode="filterMode"
          class="flex-1"
        />
        <div
          v-else
          class="flex h-10 flex-1 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200"
        >
          {{ $t("filter.all") }}
        </div>

        <button
          type="button"
          class="relative z-20 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-sm transition-colors"
          :class="
            searchOpen
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500'
              : 'bg-white text-gray-600 hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          "
          :aria-label="$t('home.search')"
          :aria-expanded="searchOpen"
          aria-controls="home-search"
          data-testid="search-toggle"
          @click="toggleSearch"
        >
          <span class="material-symbols-outlined text-[22px]" aria-hidden="true"
            >search</span
          >
        </button>

        <div class="relative">
          <button
            type="button"
            class="relative z-20 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            :aria-controls="filterMenuId"
            :aria-expanded="showFilterMenu"
            aria-haspopup="menu"
            aria-label="Open record filters"
            @click="
              showFilterMenu = !showFilterMenu;
              showImportMenu = false;
            "
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>

          <transition name="slide-up">
            <ul
              v-if="showFilterMenu"
              :id="filterMenuId"
              class="absolute top-12 right-0 z-20 w-36 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
              role="menu"
            >
              <li>
                <button
                  type="button"
                  role="menuitemradio"
                  :aria-checked="filterMode === 'all'"
                  :class="[
                    'w-full px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                    filterMode === 'all'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-200',
                  ]"
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
                  :class="[
                    'w-full px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                    filterMode === 'year'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-200',
                  ]"
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
                  :class="[
                    'w-full px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                    filterMode === 'month'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-200',
                  ]"
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
            @click="
              showImportMenu = !showImportMenu;
              showFilterMenu = false;
            "
          >
            <CategoryIcon name="system_update_alt" class="text-[22px]" />
          </button>

          <transition name="slide-up">
            <ul
              v-if="showImportMenu"
              :id="importMenuId"
              class="absolute top-12 right-0 z-20 w-48 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
              role="menu"
            >
              <li>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  role="menuitem"
                  @click="
                    showImportSheet = true;
                    showImportMenu = false;
                  "
                >
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                  >
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
                  @click="
                    openNewRecordFromTemplate(tpl.id);
                    showImportMenu = false;
                  "
                >
                  <span
                    :class="[
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs',
                      getTemplateCategoryStyle(tpl.category).bg,
                      getTemplateCategoryStyle(tpl.category).text,
                    ]"
                  >
                    <CategoryIcon
                      :name="getTemplateCategoryStyle(tpl.category).icon"
                      style="transform: scale(0.65)"
                    />
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
                  @click="
                    showTemplateManager = true;
                    showImportMenu = false;
                  "
                >
                  <span
                    class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    <CategoryIcon name="settings" class="text-base" />
                  </span>
                  {{ $t("templates.manage") }}
                </button>
              </li>
            </ul>
          </transition>
        </div>
      </div>

      <div
        v-if="searchOpen"
        id="home-search"
        role="search"
        class="mb-3 flex h-10 items-center gap-2 rounded-2xl bg-white px-3 shadow-sm dark:bg-gray-800"
      >
        <span
          class="material-symbols-outlined text-xl text-gray-400"
          aria-hidden="true"
          >search</span
        >
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="search"
          enterkeyhint="search"
          :placeholder="$t('home.searchPlaceholder')"
          :aria-label="$t('home.search')"
          class="min-w-0 flex-1 bg-transparent text-base font-medium text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 [&::-webkit-search-cancel-button]:hidden"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
          :aria-label="$t('home.clearSearch')"
          @click="clearSearch"
        >
          <span class="material-symbols-outlined text-base" aria-hidden="true"
            >close</span
          >
        </button>
      </div>

      <div
        v-if="store.pendingConversionCount > 0"
        class="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20"
        role="status"
      >
        <p class="text-xs font-bold text-amber-700 dark:text-amber-400">
          {{
            $t("currency.pendingBanner", {
              count: store.pendingConversionCount,
              currency: store.baseCurrency,
            })
          }}
        </p>
        <button
          type="button"
          class="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm disabled:opacity-50 dark:bg-gray-800 dark:text-amber-400"
          :disabled="retrying"
          @click="retryConversion"
        >
          {{ retrying ? $t("baseCurrency.converting") : $t("currency.retry") }}
        </button>
      </div>

      <section
        v-if="filteredPersonalRecords.length === 0"
        class="empty-state py-10 text-sm"
        aria-live="polite"
      >
        <template v-if="searching">
          <div class="mb-2 text-3xl" aria-hidden="true">🔍</div>
          {{ $t("home.noSearchResults", { query: searchQuery.trim() }) }}
        </template>
        <template v-else>
          <div class="mb-2 text-3xl" aria-hidden="true">📝</div>
          {{ $t("home.noRecords") }}
        </template>
      </section>

      <div v-else class="space-y-6">
        <DailyRecordGroup
          v-for="[dateGroup, records] in groupedRecords"
          :key="dateGroup"
          :dateGroup="dateGroup"
          :records="records"
          @edit="openEditRecord"
          @delete="handleDeletePersonalRecord"
        />
      </div>
    </section>

    <DraggableFab aria-label="Add personal record" @click="openNewRecord" />

    <AddPersonalRecordSheet
      v-model="showForm"
      :editRecordId="editRecordId"
      :initialTemplateId="useTemplateId"
    />
    <ImportFromBookSheet v-model="showImportSheet" />
    <TemplateSettingsModal v-model="showTemplateManager" />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import CategoryIcon from "../components/CategoryIcon.vue";
import DraggableFab from "../components/DraggableFab.vue";
import MonthSelector from "../components/MonthSelector.vue";
import IncomeExpenseSummary from "../components/home/IncomeExpenseSummary.vue";
import TemplateSettingsModal from "../components/TemplateSettingsModal.vue";
import AddPersonalRecordSheet from "../components/home/AddPersonalRecordSheet.vue";
import DailyRecordGroup from "../components/home/DailyRecordGroup.vue";
import ImportFromBookSheet from "../components/home/ImportFromBookSheet.vue";
import { useTrackerStore } from "../stores/tracker";
import { colorMap } from "../utils/category";
import {
  categoryLabel,
  findCategoryByName,
  storedCategoryName,
} from "../utils/categoryLookup";
import { recordMatchesQuery } from "../utils/recordSearch";
import { getLocalDateString, getLocalYearMonthString } from "../utils/date";
import { useEscapeKey } from "../composables/useEscapeKey";
import { confirmDialog } from "../composables/useDialog";
import { usePrimaryAction } from "../composables/usePrimaryAction";
import { useToast } from "../composables/useToast";
import { useI18n } from "vue-i18n";
import { currencyOf, sumInCurrency } from "../utils/currency";

const store = useTrackerStore();
const showForm = ref(false);
const showImportSheet = ref(false);
const showImportMenu = ref(false);
const showTemplateManager = ref(false);
const editRecordId = ref<string | undefined>(undefined);
const useTemplateId = ref<string | undefined>(undefined);
const selectedMonth = ref<string>(getLocalYearMonthString());
const filterMode = ref<"all" | "year" | "month">("month");
const showFilterMenu = ref(false);
const filterMenuId = "home-filter-menu";
const importMenuId = "home-import-menu";
const showMonthSelector = computed(() => filterMode.value !== "all");
const pageActive = ref(true);
const menuOpen = computed(() => showFilterMenu.value || showImportMenu.value);

usePrimaryAction(pageActive, () => openNewRecord());
useEscapeKey(menuOpen, () => {
  showFilterMenu.value = false;
  showImportMenu.value = false;
});

// ---- Search: narrows the records of the chosen period ----
const searchOpen = ref(false);
const searchQuery = ref("");
const searchInput = ref<HTMLInputElement>();
const searching = computed(() => searchQuery.value.trim() !== "");
const openSearch = async () => {
  showFilterMenu.value = false;
  showImportMenu.value = false;
  searchOpen.value = true;
  await nextTick();
  searchInput.value?.focus();
};
const closeSearch = () => {
  searchOpen.value = false;
  searchQuery.value = "";
};
const toggleSearch = () => (searchOpen.value ? closeSearch() : openSearch());
const clearSearch = () => {
  searchQuery.value = "";
  searchInput.value?.focus();
};
// Escape (or Back) closes the search and shows every record again.
useEscapeKey(searchOpen, closeSearch);

const setFilterMode = (mode: "all" | "year" | "month") => {
  filterMode.value = mode;
  showFilterMenu.value = false;
};

const toast = useToast();
const { t, te } = useI18n();

/** The category as the list shows it (translated defaults), for search. */
const shownCategory = (record: {
  category: string;
  type: "expense" | "income";
}) => {
  const category = findCategoryByName(
    store.allCategories,
    record.category,
    record.type,
  );
  return category ? categoryLabel(category, t, te) : record.category;
};

const filteredPersonalRecords = computed(() =>
  store.personalRecords
    .filter((r) => {
      if (filterMode.value === "all") return true;
      if (filterMode.value === "year")
        return r.date.startsWith(selectedMonth.value.split("-")[0]);
      if (filterMode.value === "month")
        return r.date.startsWith(selectedMonth.value);
      return true;
    })
    .filter(
      (r) =>
        !searching.value ||
        recordMatchesQuery(r, searchQuery.value, shownCategory(r)),
    )
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

// Records still pending conversion to the base currency are left out.
const filteredExpense = computed(() =>
  sumInCurrency(filteredPersonalRecords.value, "expense", store.baseCurrency),
);
const filteredIncome = computed(() =>
  sumInCurrency(filteredPersonalRecords.value, "income", store.baseCurrency),
);

const retrying = ref(false);
const retryConversion = async () => {
  if (retrying.value) return;
  retrying.value = true;
  try {
    const { converted, pending } = await store.convertPendingRecords();
    if (pending > 0)
      toast.warning(t("currency.retryFailed", { count: pending }));
    else toast.success(t("currency.retryDone", { count: converted }));
  } finally {
    retrying.value = false;
  }
};

const openNewRecord = () => {
  showFilterMenu.value = false;
  showImportMenu.value = false;
  editRecordId.value = undefined;
  useTemplateId.value = undefined;
  showForm.value = true;
};

const openEditRecord = (id: string) => {
  editRecordId.value = id;
  useTemplateId.value = undefined;
  showForm.value = true;
};

const openNewRecordFromTemplate = async (templateId: string) => {
  const tpl = store.recordTemplates.find((t) => t.id === templateId);
  // One tap only when no conversion is needed; otherwise the form fetches a rate.
  if (
    tpl &&
    tpl.amount !== null &&
    currencyOf(tpl.currency) === store.baseCurrency
  ) {
    const cat = store.allCategories.find((c) => c.id === tpl.category);
    const catName = cat ? storedCategoryName(cat) : tpl.category;
    await store.addPersonalRecord({
      type: tpl.type,
      amount: tpl.amount,
      amountCurrency: store.baseCurrency,
      category: catName,
      date: getLocalDateString(),
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

const handleDeletePersonalRecord = async (id: string) => {
  const ok = await confirmDialog({
    title: t("common.deleteRecordTitle"),
    message: t("common.deleteRecordConfirm"),
    danger: true,
  });
  if (ok) await store.deletePersonalRecord(id);
};
</script>
