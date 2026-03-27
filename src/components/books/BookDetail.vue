<template>
  <div v-if="book">
    <header class="rounded-b-3xl bg-gradient-to-br from-blue-600 to-indigo-700 px-4 py-6">
      <div class="mb-3 flex items-center gap-3">
        <button type="button" class="btn-ghost-white" :aria-label="$t('common.cancel')" @click="$emit('back')">
          <svg
            class="h-5 w-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
            <span v-if="isPulling" class="material-symbols-outlined animate-spin text-xs text-white/50" aria-hidden="true">sync</span>
          </div>
          <h1 class="flex items-center gap-2 text-lg font-bold text-white">
            {{ book.name }}
            <span v-if="book.shareCode" class="material-symbols-outlined text-sm opacity-60" :title="$t('books.share.title')" aria-hidden="true">cloud_done</span>
          </h1>
        </div>
        <div class="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition-colors hover:bg-white/30"
            :aria-label="$t('books.share.title')"
            @click="$emit('share')"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">cloud_upload</span>
          </button>
          <button
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-full bg-white/20 px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/30"
            @click="$emit('settle')"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">receipt_long</span>
            <span class="hidden sm:inline">{{ $t("books.settle") }}</span>
          </button>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition-colors hover:bg-white/30"
            :aria-label="$t('books.editBook')"
            @click="$emit('edit')"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
          </button>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-red-400/50 hover:text-white"
            :aria-label="$t('common.delete')"
            @click="confirmDelete"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
          </button>
        </div>
      </div>

      <ul class="flex flex-wrap gap-2" aria-label="Book members">
        <li v-for="member in book.members" :key="member.id" class="header-chip">
          {{ member.name }}
        </li>
      </ul>

      <div class="mt-4">
        <SummaryBar
          :totalExpense="filteredBookExpense"
          :totalIncome="filteredBookIncome"
          :balance="filteredBookBalance"
          labelClass="text-blue-200"
          valueClass="text-base"
        />
      </div>
    </header>

    <main class="mt-5 px-4 pb-24">
      <section aria-labelledby="book-records-heading">
        <div class="mb-3 flex items-center justify-between">
          <h2 id="book-records-heading" class="section-title">{{ $t("books.records") }}</h2>
          <span class="section-count">{{ $t("books.recordsCount", { count: filteredBookRecords.length }) }}</span>
        </div>

        <div
          v-if="store.currentBookRecords.length === 0"
          class="empty-state py-16"
          aria-live="polite"
        >
          <div
            class="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl dark:bg-gray-800"
            aria-hidden="true"
          >
            <CategoryIcon name="receipt_long" class="text-gray-400" />
          </div>
          <p class="text-sm font-bold">{{ $t("books.noRecords") }}</p>
        </div>

        <template v-else>
          <DateFilterBar :dates="bookRecordDates" class="mb-3" @change="onBookFilterChange" />

          <div v-if="filteredBookRecords.length === 0" class="empty-state py-10" aria-live="polite">
            <div class="mb-2 text-3xl" aria-hidden="true">🔍</div>
            <p class="text-sm font-bold">{{ $t("filter.noRecords") }}</p>
          </div>

          <ul v-else class="space-y-3">
            <li v-for="record in filteredBookRecords" :key="record.id">
              <article class="record-card">
                <div class="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-3 text-left"
                    @click="$emit('edit-record', record.id)"
                  >
                    <div
                      :class="[
                        'record-icon',
                        getCategoryBg(record.category).bg,
                        getCategoryBg(record.category).text,
                      ]"
                      aria-hidden="true"
                    >
                      <CategoryIcon :name="getCategoryIcon(record.category)" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex min-w-0 items-center gap-2">
                        <p class="section-title shrink-0 whitespace-nowrap text-sm">
                          {{ getLocalizedCategoryName(record.category) }}
                        </p>
                        <span v-if="record.note" class="hint-text min-w-0 truncate text-xs before:mr-0.5 before:content-['•']">
                          {{ record.note }}
                        </span>
                      </div>
                      <p class="hint-text mt-0.5">{{ formatDate(record.date) }}</p>
                    </div>
                  </button>

                  <div class="flex items-center gap-2">
                    <p
                      :class="[
                        'max-w-[120px] truncate text-right text-lg font-bold',
                        record.type === 'expense'
                          ? 'text-gray-800 dark:text-gray-100'
                          : 'text-green-600 dark:text-green-400',
                      ]"
                    >
                      {{ record.type === "expense" ? "-" : "+" }}{{ record.amount.toLocaleString() }}
                    </p>
                    <button
                      type="button"
                      class="btn-delete ml-1 shrink-0"
                      :aria-label="$t('common.delete')"
                      @click.stop="store.deleteRecord(record.id)"
                    >
                      <svg
                        class="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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

                <div
                  v-if="record.type === 'expense'"
                  class="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-gray-700/50"
                >
                  <div class="flex items-center gap-2">
                    <span class="tag-pill">{{ $t("books.paidFirst", { name: getMemberName(record.paidById) }) }}</span>
                    <span class="hint-text text-[10px]">
                      {{
                        record.splitAmongIds.includes("all")
                          ? $t("books.splitAmontAll")
                          : $t("books.splitAmongNum", { count: record.splitAmongIds.length })
                      }}
                    </span>
                  </div>
                </div>
              </article>
            </li>
          </ul>
        </template>
      </section>
    </main>

    <DraggableFab color="blue" @click="$emit('add-record')" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { DateFilter } from "../DateFilterBar.vue";
import CategoryIcon from "../CategoryIcon.vue";
import DateFilterBar from "../DateFilterBar.vue";
import DraggableFab from "../DraggableFab.vue";
import SummaryBar from "../SummaryBar.vue";
import { useTrackerStore } from "../../stores/tracker";
import { formatDate, getCategoryBg, getCategoryIcon } from "../../utils/category";

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

const book = computed(() => store.books.find((candidate) => candidate.id === props.bookId));

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
  const categoryId = store.allCategories.find((category) => category.name === categoryName)?.id;
  if (categoryId && te(`categories.${categoryId}`)) {
    return t(`categories.${categoryId}`);
  }
  return categoryName;
};

const bookDateFilter = ref<DateFilter>({ mode: "all", year: "", month: "", date: "" });
const onBookFilterChange = (filter: DateFilter) => {
  bookDateFilter.value = filter;
};
const bookRecordDates = computed(() => store.currentBookRecords.map((record) => record.date));

const filteredBookRecords = computed(() => {
  const records = store.currentBookRecords;
  const { mode, year, month, date } = bookDateFilter.value;
  let result = records;
  if (mode === "year") result = records.filter((record) => record.date.startsWith(year));
  else if (mode === "month") result = records.filter((record) => record.date.startsWith(`${year}-${month}`));
  else if (mode === "date") result = records.filter((record) => record.date === date);
  return [...result].sort((a, b) => b.date.localeCompare(a.date));
});

const filteredBookExpense = computed(() =>
  filteredBookRecords.value.filter((record) => record.type === "expense").reduce((sum, record) => sum + record.amount, 0),
);
const filteredBookIncome = computed(() =>
  filteredBookRecords.value.filter((record) => record.type === "income").reduce((sum, record) => sum + record.amount, 0),
);
const filteredBookBalance = computed(() => filteredBookIncome.value - filteredBookExpense.value);

const getMemberName = (id: string) =>
  book.value?.members.find((member) => member.id === id)?.name ?? t("books.unknown");

const confirmDelete = () => {
  if (!book.value) return;
  if (window.confirm(t("books.deleteConfirm", { name: book.value.name }))) {
    store.deleteBook(book.value.id);
    emit("back");
  }
};
</script>
