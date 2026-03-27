<template>
  <div v-if="book">
    <!-- Header -->
    <div
      class="rounded-b-3xl bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-6"
    >
      <div class="mb-3 flex items-center gap-3">
        <button @click="$emit('back')" class="btn-ghost-white">
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
          <div class="flex items-center gap-2">
            <p class="text-xs font-medium text-blue-200">{{ $t("books.currentBook") }}</p>
            <span v-if="isPulling" class="material-symbols-outlined animate-spin text-white/50 text-xs">sync</span>
          </div>
          <h1 class="text-lg font-bold text-white flex items-center gap-2">
            {{ book.name }}
            <span v-if="book.shareCode" class="material-symbols-outlined text-sm opacity-60" title="已開啟共用">cloud_done</span>
          </h1>
        </div>
        <div class="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            @click="$emit('share')"
            class="flex items-center justify-center rounded-full bg-white/20 w-8 h-8 text-white shadow-sm transition-colors hover:bg-white/30"
            title="分享與共用"
          >
            <span class="material-symbols-outlined text-[18px]">cloud_upload</span>
          </button>
          <button
            @click="$emit('settle')"
            class="flex items-center gap-1.5 rounded-full bg-white/20 px-3 h-8 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/30"
          >
            <span class="material-symbols-outlined text-[18px]">receipt_long</span>
            <span class="hidden sm:inline">{{ $t("books.settle") }}</span>
          </button>
          <button
            @click="$emit('edit')"
            class="flex items-center justify-center rounded-full bg-white/20 w-8 h-8 text-white shadow-sm transition-colors hover:bg-white/30"
            title="編輯帳本"
          >
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            @click="confirmDelete"
            class="flex items-center justify-center rounded-full w-8 h-8 text-white/70 transition-colors hover:text-white hover:bg-red-400/50"
            title="刪除帳本"
          >
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>

      <!-- Member chips -->
      <div class="flex flex-wrap gap-2">
        <span
          v-for="m in book.members"
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
    <div class="mt-5 px-4 pb-24">
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

        <div v-else class="space-y-3">
          <div
            v-for="record in filteredBookRecords"
            :key="record.id"
            @click="$emit('edit-record', record.id)"
            class="record-card cursor-pointer"
          >
            <div class="flex items-center justify-between">
              <div class="flex min-w-0 items-center gap-3">
                <div
                  :class="[
                    'record-icon',
                    getCategoryBg(record.category).bg,
                    getCategoryBg(record.category).text,
                  ]"
                >
                  <CategoryIcon :name="getCategoryIcon(record.category)" />
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
          </div>
        </div>
      </template>
    </div>

    <DraggableFab color="blue" @click="$emit('add-record')" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useTrackerStore } from "../../stores/tracker";
import { getCategoryIcon, getCategoryBg, formatDate } from "../../utils/category";
import CategoryIcon from "../CategoryIcon.vue";
import SummaryBar from "../SummaryBar.vue";
import DateFilterBar from "../DateFilterBar.vue";
import DraggableFab from "../DraggableFab.vue";
import type { DateFilter } from "../DateFilterBar.vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  bookId: string;
}>();

const emit = defineEmits<{
  (e: "back"): void;
  (e: "edit"): void;
  (e: "settle"): void;
  (e: "share"): void;
  (e: "edit-record", id: string): void;
  (e: "add-record"): void;
}>();

const store = useTrackerStore();
const { t, te } = useI18n();

const book = computed(() => store.books.find((b) => b.id === props.bookId));

// Auto-pull shared book data when opened
const isPulling = ref(false);
const initPull = async () => {
  if (book.value?.shareCode) {
    isPulling.value = true;
    await store.pullSharedBook(props.bookId);
    isPulling.value = false;
  }
};
initPull();

const getLocalizedCategoryName = (categoryName: string) => {
  const catId = store.allCategories.find((c) => c.name === categoryName)?.id;
  if (catId && te(`categories.${catId}`)) {
    return t(`categories.${catId}`);
  }
  return categoryName;
};

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

const getMemberName = (id: string) =>
  book.value?.members.find((m) => m.id === id)?.name ?? t("books.unknown");

const confirmDelete = () => {
  if (!book.value) return;
  if (window.confirm(t("books.deleteConfirm", { name: book.value.name }))) {
    store.deleteBook(book.value.id);
    emit("back");
  }
};
</script>
