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
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="text-xs font-medium text-blue-200">{{ $t("books.currentBook") }}</p>
            <span
              v-if="isPulling"
              class="material-symbols-outlined animate-spin text-xs text-white/50"
              style="animation-direction: reverse;"
              aria-hidden="true"
            >sync</span>
          </div>
          <h1 class="flex items-center gap-2 text-lg font-bold text-white">
            <span class="truncate">{{ book.name }}</span>
            <span class="shrink-0 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{{ bookCurrency }}</span>
            <span v-if="book.shareCode" class="material-symbols-outlined shrink-0 text-sm opacity-60" :title="$t('books.share.title')" aria-hidden="true">cloud_done</span>
          </h1>
        </div>
        <!-- One menu instead of four icons, so the title keeps the width. -->
        <div class="relative ml-auto shrink-0">
          <button
            ref="menuButton"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white shadow-sm transition-colors hover:bg-white/30"
            :aria-label="$t('books.actionsMenu')"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            :aria-controls="menuId"
            :aria-busy="sharing"
            @click="menuOpen ? closeMenu() : openMenu()"
          >
            <!-- Sharing runs after the menu closes: show it on the button. -->
            <span
              class="material-symbols-outlined"
              :class="{ 'animate-spin': sharing }"
              style="font-size: 22px"
              aria-hidden="true"
              >{{ sharing ? "progress_activity" : "more_horiz" }}</span
            >
          </button>

          <!-- Tap outside to close. -->
          <!-- Tap outside to close — above the add button (z-40) and the
               bottom nav (z-50), so tapping those closes the menu first. -->
          <div v-if="menuOpen" class="fixed inset-0 z-[55]" aria-hidden="true" @click="closeMenu()"></div>
          <ul
            v-if="menuOpen"
            :id="menuId"
            ref="menuList"
            role="menu"
            :aria-label="$t('books.actionsMenu')"
            class="absolute top-11 right-0 z-[56] w-48 overflow-hidden rounded-2xl bg-white py-1 text-gray-700 shadow-xl ring-1 ring-black/5 dark:bg-gray-800 dark:text-gray-200 dark:ring-white/10"
            @keydown="onMenuKeydown"
          >
            <li v-for="item in menuItems" :key="item.key" role="none">
              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                :class="item.danger ? 'text-red-600 dark:text-red-400' : ''"
                :disabled="item.busy"
                @click="choose(item.run)"
              >
                <span
                  class="material-symbols-outlined"
                  :class="{ 'animate-spin': item.busy }"
                  style="font-size: 20px"
                  aria-hidden="true"
                  >{{ item.busy ? "progress_activity" : item.icon }}</span
                >
                {{ item.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <ul class="flex flex-wrap gap-2" :aria-label="$t('members.title')">
        <li
          v-for="member in activeMembers(book.members)"
          :key="member.id"
          class="flex items-center gap-1.5 rounded-full bg-white/20 py-0.5 pr-2.5 pl-0.5 text-xs font-medium text-white"
        >
          <MemberAvatar :name="member.name" :seed="member.id" size="xs" />
          <span>{{ member.name }}</span>
          <span v-if="isSelf(member, store.userProfile)" class="text-[10px] font-bold opacity-80">
            ({{ $t("members.me") }})
          </span>
        </li>
      </ul>

      <!-- A shared book is about what the group spent: total expense only. -->
      <div class="mt-4 rounded-2xl bg-white/15 px-4 py-3">
        <p class="text-xs text-blue-200">{{ $t("common.totalExpense") }}</p>
        <p ref="expenseEl" class="expense-total font-bold text-white tabular-nums">
          {{ formatMoney(filteredBookExpense, bookCurrency, locale) }}
        </p>
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
                    <RecordAmount
                      :record="record"
                      :expectedCurrency="bookCurrency"
                      :legacyCurrency="bookCurrency"
                      :amountClass="[
                        'text-lg',
                        record.type === 'expense'
                          ? 'text-gray-800 dark:text-gray-100'
                          : 'text-green-600 dark:text-green-400',
                      ].join(' ')"
                    />
                    <button
                      type="button"
                      class="btn-delete ml-1 shrink-0"
                      :aria-label="$t('common.delete')"
                      @click.stop="handleDeleteRecord(record.id)"
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
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { DateFilter } from "../DateFilterBar.vue";
import CategoryIcon from "../CategoryIcon.vue";
import DateFilterBar from "../DateFilterBar.vue";
import DraggableFab from "../DraggableFab.vue";
import { useEscapeKey } from "../../composables/useEscapeKey";
import { useFitText } from "../../composables/useFitText";
import RecordAmount from "../RecordAmount.vue";
import MemberAvatar from "../MemberAvatar.vue";
import { activeMembers, isSelf } from "../../utils/member";
import { currencyOf, formatMoney } from "../../utils/currency";
import { useTrackerStore } from "../../stores/tracker";
import { formatDate, getCategoryBg, getCategoryIcon } from "../../utils/category";

const props = defineProps<{
  bookId: string;
  /** A share request for this book is in flight. */
  sharing?: boolean;
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
const { t, te, locale } = useI18n();

const book = computed(() => store.books.find((candidate) => candidate.id === props.bookId));
const bookCurrency = computed(() => currencyOf(book.value?.currency));

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

const getMemberName = (id: string) =>
  book.value?.members.find((member) => member.id === id)?.name ?? t("books.unknown");

// ---- Actions menu ----
const menuOpen = ref(false);
const menuId = `book-actions-${props.bookId}`;
const menuButton = ref<HTMLButtonElement>();
const menuList = ref<HTMLUListElement>();

const menuItems = computed(() => [
  {
    key: "share",
    icon: "cloud_upload",
    label: t("books.shareAction"),
    busy: !!props.sharing,
    run: () => emit("share"),
  },
  { key: "settle", icon: "receipt_long", label: t("books.settle"), run: () => emit("settle") },
  { key: "edit", icon: "edit", label: t("books.editBook"), run: () => emit("edit") },
  { key: "delete", icon: "delete", label: t("books.deleteBook"), danger: true, run: () => confirmDelete() },
]);

const menuButtons = () =>
  Array.from(menuList.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);

const enabledItems = () => menuButtons().filter((b) => !b.disabled);

const openMenu = async () => {
  menuOpen.value = true;
  await nextTick();
  // The first item (share) is disabled while sharing: focus the first usable one.
  enabledItems()[0]?.focus();
};
const closeMenu = (refocus = true) => {
  menuOpen.value = false;
  if (refocus) menuButton.value?.focus();
};
// Focus returns to the menu button; an action that opens a sheet or dialog
// takes it from there.
const choose = (run: () => void) => {
  closeMenu();
  run();
};
// Escape (and the Back button, via the same stack) closes the menu first.
useEscapeKey(menuOpen, () => closeMenu());

/** Up/Down/Home/End move between items, Tab closes the menu. */
const onMenuKeydown = (event: KeyboardEvent) => {
  const items = enabledItems();
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  const go = (n: number) => {
    event.preventDefault();
    items[(n + items.length) % items.length]?.focus();
  };
  if (event.key === "ArrowDown") go(i + 1);
  else if (event.key === "ArrowUp") go(i < 0 ? items.length - 1 : i - 1);
  else if (event.key === "Home") go(0);
  else if (event.key === "End") go(items.length - 1);
  else if (event.key === "Tab") {
    // Leaving the menu: close it and land back on its button, rather than on
    // an item that is about to be removed.
    event.preventDefault();
    closeMenu();
  }
};

// The total stays on one line, shrinking for large amounts.
const expenseEl = ref<HTMLElement>();
useFitText(
  expenseEl,
  () => formatMoney(filteredBookExpense.value, bookCurrency.value, locale.value),
  { max: 28, min: 16 },
);

const confirmDelete = async () => {
  if (!book.value) return;
  if (window.confirm(t("books.deleteConfirm", { name: book.value.name }))) {
    await store.deleteBook(book.value.id);
    emit("back");
  }
};

const handleDeleteRecord = async (id: string) => {
  await store.deleteRecord(id);
};
</script>

<style scoped>
/* Sized by useFitText (28px down to 16px); wraps only if even that overflows. */
.expense-total {
  font-size: 28px;
  overflow-wrap: anywhere;
  line-height: 1.15;
}
</style>
