<template>
  <div class="page-container">
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
      @share="handleShareBook"
    />

    <!-- ===== Modals & Sheets (Shared) ===== -->
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
    <JoinBookModal
      v-model="showJoinModal"
      @joined="openBook"
    />
    <ShareBookModal
      v-model="showShareModal"
      :shareCode="currentShareCode"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useTrackerStore } from "../stores/tracker";
import { useToast } from "../composables/useToast";
import BookList from "../components/books/BookList.vue";
import BookDetail from "../components/books/BookDetail.vue";
import CreateBookModal from "../components/books/CreateBookModal.vue";
import BookAddRecordSheet from "../components/books/BookAddRecordSheet.vue";
import BookSettlementSheet from "../components/books/BookSettlementSheet.vue";
import JoinBookModal from "../components/books/JoinBookModal.vue";
import ShareBookModal from "../components/books/ShareBookModal.vue";

const store = useTrackerStore();
const toast = useToast();

const selectedBookId = ref<string | null>(null);
const showCreateModal = ref(false);
const showAddRecordSheet = ref(false);
const showSettlementSheet = ref(false);
const showJoinModal = ref(false);
const showShareModal = ref(false);
const currentShareCode = ref("");
const editRecordId = ref<string | undefined>(undefined);
const editBookId = ref<string | undefined>(undefined);

const currentBook = computed(
  () => store.books.find((b) => b.id === selectedBookId.value) ?? null,
);

const openBook = (id: string) => {
  selectedBookId.value = id;
  store.selectBook(id);
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

const handleShareBook = async () => {
  if (!selectedBookId.value) return;
  try {
    const code = await store.publishBook(selectedBookId.value);
    if (code) {
      currentShareCode.value = code;
      showShareModal.value = true;
    }
  } catch (err) {
    toast.error("分享帳本失敗，請稍後再試。");
  }
};
</script>
