<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      @click.self="$emit('update:modelValue', false)"
    >
      <div
        class="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 pb-10 transition-colors dark:bg-gray-900"
      >
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200">
            {{ editBookId ? $t("books.editBook") : $t("books.createNewBook") }}
          </h2>
          <CloseButton @click="$emit('update:modelValue', false)" />
        </div>

        <div class="space-y-4">
          <div>
            <label class="label-text">{{ $t("books.bookName") }}</label>
            <input
              v-model="form.name"
              type="text"
              :placeholder="$t('books.bookNamePlaceholder')"
              class="input-field text-sm"
            />
          </div>
          <div>
            <label class="label-text">{{ $t("books.membersDetail") }}</label>
            <textarea
              v-model="form.membersText"
              rows="4"
              :placeholder="$t('books.membersPlaceholder')"
              class="input-field resize-none text-sm"
            ></textarea>
          </div>
          <BaseButton :disabled="!form.name.trim()" @click="handleCreate">
            {{ editBookId ? $t("common.save") : $t("books.createButton") }}
          </BaseButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useTrackerStore } from "../../stores/tracker";
import BaseButton from "../BaseButton.vue";
import CloseButton from "../CloseButton.vue";

const props = defineProps<{ 
  modelValue: boolean;
  editBookId?: string;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  created: [bookId: string];
}>();

const store = useTrackerStore();

const form = ref({ name: "", membersText: "" });

// Reset form when the modal opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.editBookId) {
        const book = store.books.find(b => b.id === props.editBookId);
        if (book) {
          form.value = {
            name: book.name,
            membersText: book.members.map(m => m.name).join("\n")
          };
          return;
        }
      }
      form.value = { name: "", membersText: "" };
    }
  },
);

const handleCreate = () => {
  if (!form.value.name.trim()) return;
  const memberNames = form.value.membersText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (props.editBookId) {
    const defaultMembers = memberNames.length > 0 ? memberNames : [store.userProfile.name || "我"];
    store.updateBook(props.editBookId, form.value.name.trim(), defaultMembers);
    emit("update:modelValue", false);
  } else {
    const book = store.createBook(
      form.value.name.trim(),
      memberNames.length > 0 ? memberNames : [store.userProfile.name || "我"],
    );
    if (!book) return; 
    emit("update:modelValue", false);
    emit("created", book.id);
  }
};
</script>
