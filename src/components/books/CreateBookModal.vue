<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      @click.self="close"
    >
      <section
        class="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 pb-10 transition-colors dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="mb-5 flex items-center justify-between">
          <h2 :id="titleId" class="text-lg font-bold text-gray-800 dark:text-gray-200">
            {{ editBookId ? $t("books.editBook") : $t("books.createNewBook") }}
          </h2>
          <CloseButton @click="close" />
        </div>

        <form class="space-y-4" @submit.prevent="handleCreate">
          <div>
            <label class="label-text" :for="nameInputId">{{ $t("books.bookName") }}</label>
            <input
              :id="nameInputId"
              v-model="form.name"
              type="text"
              :placeholder="$t('books.bookNamePlaceholder')"
              class="input-field text-sm"
              autocomplete="off"
            />
          </div>
          <div>
            <label class="label-text" :for="membersInputId">{{ $t("books.membersDetail") }}</label>
            <textarea
              :id="membersInputId"
              v-model="form.membersText"
              rows="4"
              :placeholder="$t('books.membersPlaceholder')"
              class="input-field resize-none text-sm"
            ></textarea>
          </div>
          <BaseButton type="submit" :disabled="!form.name.trim()">
            {{ editBookId ? $t("common.save") : $t("books.createButton") }}
          </BaseButton>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
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
const { t } = useI18n();
const baseId = useId();
const titleId = `${baseId}-title`;
const nameInputId = `${baseId}-name`;
const membersInputId = `${baseId}-members`;

const form = ref({ name: "", membersText: "" });

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    if (props.editBookId) {
      const book = store.books.find((item) => item.id === props.editBookId);
      if (book) {
        form.value = {
          name: book.name,
          membersText: book.members.map((member) => member.name).join("\n"),
        };
        return;
      }
    }
    form.value = {
      name: "",
      membersText: store.userProfile.name || t("common.me"),
    };
  },
);

const close = () => {
  emit("update:modelValue", false);
};

const handleCreate = () => {
  if (!form.value.name.trim()) return;
  const memberNames = form.value.membersText
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean);
  const defaultMembers = memberNames.length > 0 ? memberNames : [store.userProfile.name || t("common.me")];

  if (props.editBookId) {
    store.updateBook(props.editBookId, form.value.name.trim(), defaultMembers);
    close();
    return;
  }

  const book = store.createBook(form.value.name.trim(), defaultMembers);
  if (!book) return;
  close();
  emit("created", book.id);
};
</script>
