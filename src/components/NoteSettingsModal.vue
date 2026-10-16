<template>
  <BaseBottomSheet
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    :title="$t('notes.title')"
    maxHeight="h-[85vh]"
    roundedClass="rounded-t-[2rem]"
    contentClass="flex-1 overflow-y-auto"
  >
    <div class="space-y-4 px-4 py-6">
      <div
        class="flex rounded-xl bg-gray-200/60 p-1 transition-colors dark:bg-gray-800"
        role="tablist"
      >
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          role="tab"
          :aria-selected="type === tab"
          :class="[
            'flex-1 rounded-lg py-2 text-sm font-bold transition-all',
            type === tab
              ? tab === 'expense'
                ? 'bg-white text-red-600 shadow dark:bg-gray-700 dark:text-red-400'
                : 'bg-white text-green-600 shadow dark:bg-gray-700 dark:text-green-400'
              : 'text-gray-500 dark:text-gray-400',
          ]"
          @click="type = tab"
        >
          {{ $t(`common.${tab}`) }}
        </button>
      </div>

      <p class="hint-text px-1">{{ $t("notes.hint") }}</p>

      <p v-if="!notes.length" class="empty-state py-10 text-center text-sm">
        {{ $t("notes.empty") }}
      </p>

      <ul v-else class="space-y-2">
        <li
          v-for="note in notes"
          :key="note.id"
          class="flex items-center gap-1 rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 flex-col items-start px-4 py-3 text-left active:opacity-60"
            :aria-label="$t('notes.edit') + ': ' + note.text"
            @click="rename(note)"
          >
            <span
              class="w-full truncate text-sm font-bold text-gray-800 dark:text-gray-100"
              >{{ note.text }}</span
            >
            <span class="text-xs text-gray-400 dark:text-gray-500">{{
              $t("notes.used", { count: note.count })
            }}</span>
          </button>
          <button
            type="button"
            class="shrink-0 rounded-xl p-2 transition-colors"
            :class="
              note.pinned
                ? 'text-amber-500 dark:text-amber-400'
                : 'text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400'
            "
            :aria-pressed="note.pinned"
            :aria-label="note.pinned ? $t('notes.unpin') : $t('notes.pin')"
            :title="note.pinned ? $t('notes.unpin') : $t('notes.pin')"
            @click="store.setNotePinned(note.id, !note.pinned)"
          >
            <span
              class="material-symbols-outlined text-xl"
              :style="{
                fontVariationSettings: note.pinned ? `'FILL' 1` : `'FILL' 0`,
              }"
              aria-hidden="true"
              >push_pin</span
            >
          </button>
          <button
            type="button"
            class="btn-delete mr-2 shrink-0 p-2"
            :aria-label="$t('common.delete')"
            :title="$t('common.delete')"
            @click="remove(note)"
          >
            <span class="material-symbols-outlined text-xl" aria-hidden="true"
              >delete</span
            >
          </button>
        </li>
      </ul>
    </div>

    <template #footer>
      <BaseButton class="w-full shadow-lg shadow-blue-500/30" @click="add">
        <span class="mr-1 text-lg">+</span> {{ $t("notes.add") }}
      </BaseButton>
    </template>
  </BaseBottomSheet>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../stores/tracker";
import type { SavedNote } from "../stores/types";
import { confirmDialog, promptDialog } from "../composables/useDialog";
import { useToast } from "../composables/useToast";
import BaseBottomSheet from "./BaseBottomSheet.vue";
import BaseButton from "./BaseButton.vue";

defineProps<{ modelValue: boolean }>();
defineEmits<{ (e: "update:modelValue", v: boolean): void }>();

const store = useTrackerStore();
const { t } = useI18n();
const toast = useToast();

const tabs = ["expense", "income"] as const;
const type = ref<SavedNote["type"]>("expense");

/** Pinned first, then most used, then most recently used. */
const notes = computed(() =>
  store.savedNotes
    .filter((n) => n.type === type.value)
    .slice()
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.count - a.count ||
        b.lastUsed.localeCompare(a.lastUsed),
    ),
);

const sameText = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

const add = async () => {
  const text = await promptDialog({
    title: t("notes.add"),
    message: t("notes.addPrompt"),
    confirmText: t("common.save"),
  });
  if (!text?.trim()) return;
  if (!(await store.addSavedNote(type.value, text))) {
    toast.info(t("notes.exists", { text: text.trim() }));
  }
};

const rename = async (note: SavedNote) => {
  const text = await promptDialog({
    title: t("notes.edit"),
    message: t("notes.editPrompt"),
    defaultValue: note.text,
    confirmText: t("common.save"),
  });
  if (!text?.trim() || text.trim() === note.text) return;
  const other = store.savedNotes.find(
    (n) => n.id !== note.id && n.type === note.type && sameText(n.text, text),
  );
  if (
    other &&
    !(await confirmDialog({
      message: t("notes.mergeConfirm", { text: text.trim() }),
    }))
  ) {
    return;
  }
  await store.renameSavedNote(note.id, text);
};

const remove = async (note: SavedNote) => {
  const ok = await confirmDialog({
    message: t("notes.deleteConfirm", { text: note.text }),
    danger: true,
  });
  if (ok) await store.deleteSavedNote(note.id);
};
</script>
