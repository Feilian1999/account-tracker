<template>
  <main class="page-container">
    <BookList
      v-if="!selectedBookId"
      @select="openBook"
      @add="openNewBook"
      @join="showJoinModal = true"
    />
    <BookDetail
      v-else
      :bookId="selectedBookId"
      @back="selectedBookId = null"
      @edit="openEditBook"
      @settle="showSettlementSheet = true"
      @add-record="openNewRecord"
      @edit-record="openEditRecord"
      :sharing="sharing"
      @share="handleShareBook"
    />

    <CreateBookModal
      v-model="showCreateModal"
      :editBookId="editBookId"
      @created="(id) => (selectedBookId = id)"
    />
    <BookAddRecordSheet
      v-if="currentBook"
      v-model="showAddRecordSheet"
      :bookName="currentBook.name"
      :members="sheetMembers"
      :currency="currencyOf(currentBook.currency)"
      :editRecordId="editRecordId"
    />
    <BookSettlementSheet
      v-model="showSettlementSheet"
      :bookName="currentBook?.name ?? ''"
      :memberStats="store.memberStats"
      :settlements="store.settlements"
      :currency="store.currentBookCurrency"
    />
    <JoinBookModal
      v-model="showJoinModal"
      @joined="openBook"
    />
    <ShareBookModal
      v-model="showShareModal"
      :shareCode="currentShareCode"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import BookAddRecordSheet from "../components/books/BookAddRecordSheet.vue";
import BookDetail from "../components/books/BookDetail.vue";
import BookList from "../components/books/BookList.vue";
import BookSettlementSheet from "../components/books/BookSettlementSheet.vue";
import CreateBookModal from "../components/books/CreateBookModal.vue";
import JoinBookModal from "../components/books/JoinBookModal.vue";
import ShareBookModal from "../components/books/ShareBookModal.vue";
import { useToast } from "../composables/useToast";
import { useTrackerStore } from "../stores/tracker";
import { useEscapeKey } from "../composables/useEscapeKey";
import { usePrimaryAction } from "../composables/usePrimaryAction";
import { currencyOf } from "../utils/currency";

const store = useTrackerStore();
const toast = useToast();
const { t } = useI18n();

const selectedBookId = ref<string | null>(null);
const showCreateModal = ref(false);
const showAddRecordSheet = ref(false);
const showSettlementSheet = ref(false);
const showJoinModal = ref(false);
const showShareModal = ref(false);
const currentShareCode = ref("");
const editRecordId = ref<string | undefined>(undefined);
const editBookId = ref<string | undefined>(undefined);
const pageActive = ref(true);

const currentBook = computed(
  () => store.books.find((book) => book.id === selectedBookId.value) ?? null,
);

// Archived members aren't offered for new records — but a record being edited
// keeps its own (possibly archived) payer and split members, or saving it
// would silently move them onto someone else.
const sheetMembers = computed(() => {
  const members = currentBook.value?.members ?? [];
  const record = editRecordId.value
    ? store.records.find((r) => r.id === editRecordId.value)
    : undefined;
  const involved = new Set([
    record?.paidById,
    ...(record?.splitAmongIds ?? []),
    ...Object.keys(record?.splitCustomAmounts ?? {}),
  ]);
  return members.filter((m) => !m.archived || involved.has(m.id));
});

usePrimaryAction(pageActive, () => {
  if (selectedBookId.value) openNewRecord();
  else openNewBook();
});
useEscapeKey(computed(() => selectedBookId.value !== null), () => {
  selectedBookId.value = null;
});

const openBook = async (id: string) => {
  selectedBookId.value = id;
  await store.selectBook(id);
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

const sharing = ref(false);
const handleShareBook = async () => {
  if (!selectedBookId.value || sharing.value) return;
  sharing.value = true;
  try {
    const code = await store.publishBook(selectedBookId.value);
    if (code) {
      currentShareCode.value = code;
      showShareModal.value = true;
    }
  } catch {
    toast.error(t("books.share.failed"));
  } finally {
    sharing.value = false;
  }
};
</script>
