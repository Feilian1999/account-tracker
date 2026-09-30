<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    :title="editBookId ? $t('books.editBook') : $t('books.createNewBook')"
    maxHeight="max-h-[90vh]"
    contentClass="px-5 py-5"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <form class="space-y-5" @submit.prevent="handleSave">
      <div>
        <label class="label-text" :for="nameInputId">{{ $t("books.bookName") }}</label>
        <input
          :id="nameInputId"
          ref="nameInput"
          v-model="form.name"
          type="text"
          maxlength="40"
          :placeholder="$t('books.bookNamePlaceholder')"
          class="input-field text-sm"
          autocomplete="off"
        />
      </div>

      <div>
        <label class="label-text" :for="currencyInputId">{{ $t("books.currency") }}</label>
        <select
          :id="currencyInputId"
          v-model="form.currency"
          :disabled="currencyLocked"
          class="input-field text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option v-for="code in CURRENCY_CODES" :key="code" :value="code">
            {{ code }} · {{ $t(`currency.names.${code}`) }}
          </option>
        </select>
        <p v-if="currencyLocked" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {{ $t("books.currencyLocked") }}
        </p>
      </div>

      <MemberListEditor ref="memberEditor" v-model="form.members" :bookId="editBookId" />
    </form>

    <template #footer>
      <BaseButton :disabled="!canSave" @click="handleSave">
        {{ editBookId ? $t("common.save") : $t("books.createButton") }}
      </BaseButton>
    </template>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { CurrencyCode } from "../../stores/types";
import { CURRENCY_CODES, currencyOf } from "../../utils/currency";
import { validateMembers, type MemberDraft } from "../../utils/member";
import { useTrackerStore } from "../../stores/tracker";
import BaseBottomSheet from "../BaseBottomSheet.vue";
import BaseButton from "../BaseButton.vue";
import MemberListEditor from "./MemberListEditor.vue";
import { usePrimaryAction } from "../../composables/usePrimaryAction";

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
const nameInputId = `${baseId}-name`;
const currencyInputId = `${baseId}-currency`;
const nameInput = ref<HTMLInputElement>();
const memberEditor = ref<InstanceType<typeof MemberListEditor>>();

const form = ref({
  name: "",
  currency: "TWD" as CurrencyCode,
  members: [] as MemberDraft[],
});

// A book's records are stored in its currency, so it is fixed once any exist.
const currencyLocked = computed(
  () => !!props.editBookId && store.records.some((r) => r.bookId === props.editBookId),
);
const submitting = ref(false);

const membersValid = computed(() => {
  const { empty, duplicate } = validateMembers(form.value.members);
  return form.value.members.length > 0 && empty.size === 0 && duplicate.size === 0;
});
const canSave = computed(
  () => !!form.value.name.trim() && membersValid.value && !submitting.value,
);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    const book = props.editBookId
      ? store.books.find((item) => item.id === props.editBookId)
      : undefined;
    if (book) {
      form.value = {
        name: book.name,
        currency: currencyOf(book.currency),
        members: book.members.map((m) => ({ id: m.id, name: m.name, userId: m.userId })),
      };
      return;
    }
    // A new book starts with the user themself, linked by their public memberId.
    form.value = {
      name: "",
      currency: store.baseCurrency,
      members: [
        {
          id: crypto.randomUUID(),
          name: store.userProfile.name || t("common.me"),
          userId: store.userProfile.memberId || undefined,
        },
      ],
    };
    nextTick(() => nameInput.value?.focus());
  },
);

const close = () => emit("update:modelValue", false);

usePrimaryAction(toRef(props, "modelValue"), () => handleSave(), 1);

const handleSave = async () => {
  // A name typed in the "add member" field but not added yet still counts.
  if (memberEditor.value && !memberEditor.value.flushPending()) return;
  if (!canSave.value) return;

  submitting.value = true;
  try {
    if (props.editBookId) {
      await store.updateBook(
        props.editBookId,
        form.value.name,
        form.value.members,
        currencyLocked.value ? undefined : form.value.currency,
      );
      close();
      return;
    }
    const book = await store.createBook(form.value.name, form.value.members, form.value.currency);
    if (!book) return;
    close();
    emit("created", book.id);
  } finally {
    submitting.value = false;
  }
};
</script>
