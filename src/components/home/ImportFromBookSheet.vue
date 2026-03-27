<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="$t('home.importTitle')"
    :subtitle="$t('home.importSubtitle')"
    contentClass="pb-12 px-6"
  >
    <div v-if="store.books.length === 0" class="empty-state py-8 text-sm">
      <div class="mb-3 text-4xl">📭</div>
      {{ $t("home.noBooksForImport") }}
    </div>

    <div v-else class="max-h-[50vh] space-y-3 pr-1">
      <div
        v-for="book in store.books"
        :key="book.id"
        class="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
      >
        <p class="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
          <span class="text-lg">📒</span> {{ book.name }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="member in book.members"
            :key="member.id"
            @click="handleImport(book.id, member.id, member.name, book.name)"
            class="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:bg-violet-50 active:scale-95 dark:border-violet-700 dark:bg-gray-800 dark:text-violet-400"
          >
            <span class="text-xs font-normal text-gray-400 dark:text-gray-500">{{ $t("home.iAm") }}</span>
            {{ member.name }}
          </button>
        </div>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { useTrackerStore } from "../../stores/tracker";
import { useI18n } from "vue-i18n";
import BaseBottomSheet from "../BaseBottomSheet.vue";

defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
}>();

const store = useTrackerStore();
const { t } = useI18n();

const handleImport = (
  bookId: string,
  memberId: string,
  memberName: string,
  bookName: string,
) => {
  const prev = store.currentBookId;
  store.selectBook(bookId);
  const stat = store.memberStats.find((s) => s.member.id === memberId);

  if (!stat || stat.owed <= 0) {
    alert(t("home.importNoExpense", { member: memberName, book: bookName }));
    if (prev) store.selectBook(prev);
    return;
  }

  if (
    confirm(
      t("home.importConfirm", { member: memberName, book: bookName, amount: stat.owed.toLocaleString() }),
    )
  ) {
    store.importMyShareFromBook(memberId);
  }
  if (prev) store.selectBook(prev);
  emit("update:modelValue", false);
};
</script>
