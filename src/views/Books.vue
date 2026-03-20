<template>
  <div class="page-container">
    <!-- ========== BOOK LIST VIEW ========== -->
    <template v-if="!selectedBookId">
      <div
        class="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pb-6 pt-10 shadow-lg"
      >
        <h1 class="text-2xl font-bold text-white">{{ $t("books.title") }}</h1>
        <p class="mt-1 text-sm text-blue-200">{{ $t("books.subtitle") }}</p>
      </div>

      <div class="mt-4 px-4">
        <div v-if="store.books.length > 0" class="mb-4 space-y-3">
          <div
            v-for="book in store.books"
            :key="book.id"
            @click="openBook(book.id)"
            class="flex cursor-pointer items-center rounded-2xl border-2 border-transparent bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700"
          >
            <div
              class="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-900/30"
            >
              📒
            </div>
            <div class="min-w-0 flex-1">
              <p class="section-title truncate">{{ book.name }}</p>
              <p class="hint-text mt-0.5">
                {{ book.members.map((m) => m.name).join("・") }}
              </p>
            </div>
            <svg
              class="ml-2 h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="mb-3 text-5xl opacity-80">📭</div>
          <p class="font-bold">{{ $t("books.noBooks") }}</p>
          <p class="mt-1 text-sm">{{ $t("books.createBookHint") }}</p>
        </div>
      </div>

      <DraggableFab color="blue" @click="openNewBook" />
    </template>

    <!-- ========== BOOK DETAIL VIEW ========== -->
    <template v-else>
      <!-- Header -->
      <div
        class="rounded-b-3xl bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-6"
      >
        <div class="mb-3 flex items-center gap-3">
          <button @click="selectedBookId = null" class="btn-ghost-white">
            <svg
              class="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <p class="text-xs font-medium text-blue-200">{{ $t("books.currentBook") }}</p>
            <h1 class="text-lg font-bold text-white">
              {{ currentBook?.name }}
            </h1>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <button
              @click="showSettlementSheet = true"
              class="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/30"
            >
              <CategoryIcon name="receipt_long" class="-mt-0.5 h-4 w-4" />
              <span>{{ $t("books.settle") }}</span>
            </button>
            <button
              @click="openEditBook"
              class="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/30"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="confirmDeleteBook"
              class="btn-ghost-white hover:!bg-red-400/50"
            >
              <svg
                class="h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Member chips -->
        <div class="flex flex-wrap gap-2">
          <span
            v-for="m in currentBook?.members"
            :key="m.id"
            class="header-chip"
          >
            {{ m.name }}
          </span>
        </div>

        <!-- Book Summary -->
        <div class="mt-4">
          <SummaryBar
            :totalExpense="filteredBookExpense"
            :totalIncome="filteredBookIncome"
            :balance="filteredBookBalance"
            labelClass="text-blue-200"
            valueClass="text-base"
          />
        </div>
      </div>

      <!-- Records -->
      <div class="mt-5 px-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="section-title">{{ $t("books.records") }}</h2>
          <span class="section-count">{{ $t("books.recordsCount", { count: filteredBookRecords.length }) }}</span>
        </div>

        <div
          v-if="store.currentBookRecords.length === 0"
          class="empty-state py-16"
        >
          <div
            class="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl dark:bg-gray-800"
          >
            <CategoryIcon name="receipt_long" class="text-gray-400" />
          </div>
          <p class="text-sm font-bold">{{ $t("books.noRecords") }}</p>
        </div>

        <template v-else>
          <DateFilterBar :dates="bookRecordDates" @change="onBookFilterChange" class="mb-3" />

          <div v-if="filteredBookRecords.length === 0" class="empty-state py-10">
            <div class="mb-2 text-3xl">🔍</div>
            <p class="text-sm font-bold">{{ $t("filter.noRecords") }}</p>
          </div>

          <div v-else class="space-y-3 pb-24">
          <div
            v-for="record in filteredBookRecords"
            :key="record.id"
            @click="openEditRecord(record.id)"
            class="record-card cursor-pointer"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'record-icon',
                    getCategoryBg(record.category).bg,
                    getCategoryBg(record.category).text,
                  ]"
                >
                  <CategoryIcon :name="getCategoryIcon(record.category)" />
                </div>
                <div class="flex-1">
                  <p class="section-title text-sm">{{ getLocalizedCategoryName(record.category) }}</p>
                  <p class="hint-text mt-0.5">{{ formatDate(record.date) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <p
                  :class="[
                    'max-w-[120px] truncate text-right text-lg font-bold',
                    record.type === 'expense'
                      ? 'text-gray-800 dark:text-gray-100'
                      : 'text-green-600 dark:text-green-400',
                  ]"
                  :title="(record.type === 'expense' ? '-' : '+') + record.amount.toLocaleString()"
                >
                  {{ record.type === "expense" ? "-" : "+"
                  }}{{ record.amount.toLocaleString() }}
                </p>
                <button
                  @click.stop="store.deleteRecord(record.id)"
                  class="btn-delete ml-1 shrink-0"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Split Info (Expense only) -->
            <div
              v-if="record.type === 'expense'"
              class="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-gray-700/50"
            >
              <div class="flex items-center gap-2">
                <span class="tag-pill">{{ $t("books.paidFirst", { name: getMemberName(record.paidById) }) }}</span>
                <span class="hint-text text-[10px]">{{ record.splitAmongIds.includes("all") ? $t("books.splitAmontAll") : $t("books.splitAmongNum", { count: record.splitAmongIds.length }) }}</span>
              </div>
            </div>
            <p v-if="record.note" class="hint-text mt-1.5">{{ record.note }}</p>
          </div>
          </div>
        </template>
      </div>

      <DraggableFab color="blue" @click="openNewRecord" />
    </template>

    <!-- ===== Modals & Sheets ===== -->
    <CreateBookModal
      v-model="showCreateModal"
      :editBookId="editBookId"
      @created="(id) => (selectedBookId = id)"
    />
    <BookAddRecordSheet
      v-if="currentBook"
      v-model="showAddRecordSheet"
      :bookName="currentBook.name"
      :members="currentBook.members"
      :editRecordId="editRecordId"
    />
    <BookSettlementSheet
      v-model="showSettlementSheet"
      :bookName="currentBook?.name ?? ''"
      :memberStats="store.memberStats"
      :settlements="store.settlements"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useTrackerStore } from "../stores/tracker";
import { getCategoryIcon, getCategoryBg, formatDate } from "../utils/category";
import DraggableFab from "../components/DraggableFab.vue";
import CategoryIcon from "../components/CategoryIcon.vue";
import SummaryBar from "../components/SummaryBar.vue";
import DateFilterBar from "../components/DateFilterBar.vue";
import type { DateFilter } from "../components/DateFilterBar.vue";
import CreateBookModal from "../components/books/CreateBookModal.vue";
import BookAddRecordSheet from "../components/books/BookAddRecordSheet.vue";
import BookSettlementSheet from "../components/books/BookSettlementSheet.vue";
import { useI18n } from "vue-i18n";

const store = useTrackerStore();
const { t, te } = useI18n();

const getLocalizedCategoryName = (categoryName: string) => {
  const catId = store.allCategories.find((c) => c.name === categoryName)?.id;
  if (catId && te(`categories.${catId}`)) {
    return t(`categories.${catId}`);
  }
  return categoryName;
};

const selectedBookId = ref<string | null>(null);
const showCreateModal = ref(false);
const showAddRecordSheet = ref(false);
const showSettlementSheet = ref(false);
const editRecordId = ref<string | undefined>(undefined);
const editBookId = ref<string | undefined>(undefined);

// ---- Date Filter ----
const bookDateFilter = ref<DateFilter>({ mode: "all", year: "", month: "", date: "" });
const onBookFilterChange = (f: DateFilter) => { bookDateFilter.value = f; };
const bookRecordDates = computed(() => store.currentBookRecords.map((r) => r.date));

const filteredBookRecords = computed(() => {
  const records = store.currentBookRecords;
  const { mode, year, month, date } = bookDateFilter.value;
  let result;
  if (mode === "all") result = records;
  else if (mode === "year") result = records.filter((r) => r.date.startsWith(year));
  else if (mode === "month") result = records.filter((r) => r.date.startsWith(`${year}-${month}`));
  else if (mode === "date") result = records.filter((r) => r.date === date);
  else result = records;
  return [...result].sort((a, b) => b.date.localeCompare(a.date));
});

const filteredBookExpense = computed(() =>
  filteredBookRecords.value.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0),
);
const filteredBookIncome = computed(() =>
  filteredBookRecords.value.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0),
);
const filteredBookBalance = computed(() => filteredBookIncome.value - filteredBookExpense.value);

const currentBook = computed(
  () => store.books.find((b) => b.id === selectedBookId.value) ?? null,
);

const getMemberName = (id: string) =>
  currentBook.value?.members.find((m) => m.id === id)?.name ?? "未知";

const openBook = (id: string) => {
  selectedBookId.value = id;
  store.selectBook(id);
  bookDateFilter.value = { mode: "all", year: "", month: "", date: "" };
};

const openNewBook = () => {
  editBookId.value = undefined;
  showCreateModal.value = true;
};

const openEditBook = () => {
  editBookId.value = selectedBookId.value ?? undefined;
  showCreateModal.value = true;
};

const openNewRecord = () => {
  editRecordId.value = undefined;
  showAddRecordSheet.value = true;
};

const openEditRecord = (id: string) => {
  editRecordId.value = id;
  showAddRecordSheet.value = true;
};

const confirmDeleteBook = () => {
  if (!currentBook.value) return;
  if (window.confirm(t("books.deleteConfirm", { name: currentBook.value.name }))) {
    store.deleteBook(currentBook.value.id);
    selectedBookId.value = null;
  }
};
</script>
