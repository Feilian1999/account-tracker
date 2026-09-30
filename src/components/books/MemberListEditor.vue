<template>
  <section :aria-labelledby="headingId">
    <div class="mb-2 flex items-center justify-between">
      <h3 :id="headingId" class="label-text !mb-0">
        {{ $t("members.title") }}
      </h3>
      <span class="text-xs font-semibold text-gray-400 dark:text-gray-500">
        {{ $t("members.count", { count: modelValue.length }) }}
      </span>
    </div>

    <ul
      v-if="modelValue.length"
      class="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-800/60"
    >
      <li
        v-for="(member, index) in modelValue"
        :key="member.id"
        class="flex items-center gap-3 px-3 py-2.5"
      >
        <MemberAvatar :name="member.name || '?'" :seed="member.id" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <input
              :value="member.name"
              type="text"
              maxlength="30"
              autocomplete="off"
              :aria-label="$t('members.nameLabel', { index: index + 1 })"
              :aria-invalid="!!errorOf(member.id)"
              class="min-w-0 flex-1 border-b border-transparent bg-transparent py-0.5 text-sm font-bold text-gray-800 transition-colors outline-none focus:border-violet-400 dark:text-gray-100"
              :class="{ '!border-red-400': errorOf(member.id) }"
              @input="
                rename(member.id, ($event.target as HTMLInputElement).value)
              "
            />
            <span
              v-if="isSelf(member, store.userProfile)"
              class="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
            >
              {{ $t("members.me") }}
            </span>
            <span
              v-else-if="member.userId"
              class="flex shrink-0 items-center gap-0.5 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
              :title="$t('members.joinedHint')"
            >
              <span
                class="material-symbols-outlined"
                style="font-size: 12px"
                aria-hidden="true"
                >link</span
              >
              {{ $t("members.joined") }}
            </span>
            <button
              v-else-if="!hasSelf && store.userProfile.memberId"
              type="button"
              class="shrink-0 rounded-full border border-dashed border-violet-300 px-2 py-0.5 text-[10px] font-bold text-violet-700 transition-colors hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
              @click="claim(member.id)"
            >
              {{ $t("members.thisIsMe") }}
            </button>
          </div>
          <p
            v-if="errorOf(member.id)"
            class="mt-0.5 text-[11px] font-medium text-red-500"
            role="alert"
          >
            {{ errorOf(member.id) }}
          </p>
          <p
            v-else-if="recordCount(member.id) > 0"
            class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500"
          >
            {{ $t("members.recordCount", { count: recordCount(member.id) }) }}
          </p>
        </div>
        <button
          v-if="!isSelf(member, store.userProfile)"
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:hover:bg-red-900/20"
          :disabled="recordCount(member.id) > 0 || modelValue.length <= 1"
          :aria-label="$t('members.remove', { name: member.name })"
          @click="remove(member.id)"
        >
          <span
            class="material-symbols-outlined"
            style="font-size: 20px"
            aria-hidden="true"
            >person_remove</span
          >
        </button>
      </li>
    </ul>

    <div class="mt-2 flex items-center gap-2">
      <label :for="addInputId" class="sr-only">{{
        $t("members.addLabel")
      }}</label>
      <input
        :id="addInputId"
        ref="addInput"
        v-model="newName"
        type="text"
        maxlength="30"
        autocomplete="off"
        :placeholder="$t('members.addPlaceholder')"
        :aria-invalid="!!addError"
        :aria-describedby="addError ? addErrorId : undefined"
        class="input-field flex-1 !py-2.5 text-sm"
        @keydown.enter="onAddEnter"
        @input="addError = ''"
      />
      <button
        type="button"
        class="flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
        :disabled="!newName.trim()"
        @click="add"
      >
        <span
          class="material-symbols-outlined"
          style="font-size: 18px"
          aria-hidden="true"
          >person_add</span
        >
        {{ $t("members.add") }}
      </button>
    </div>
    <p
      v-if="addError"
      :id="addErrorId"
      class="mt-1 text-xs font-medium text-red-500"
      role="alert"
    >
      {{ addError }}
    </p>
    <p
      v-if="hasLocked"
      class="mt-2 text-[11px] text-gray-400 dark:text-gray-500"
    >
      {{ $t("members.lockedHint") }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../../stores/tracker";
import MemberAvatar from "../MemberAvatar.vue";
import {
  hasDuplicateName,
  isSelf,
  memberRecordCount,
  validateMembers,
  type MemberDraft,
} from "../../utils/member";

const props = defineProps<{
  modelValue: MemberDraft[];
  /** Book being edited; its records decide which members can be removed. */
  bookId?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: MemberDraft[]] }>();

const { t } = useI18n();
const store = useTrackerStore();
const headingId = useId();
const addInputId = useId();
const addErrorId = useId();
const addInput = ref<HTMLInputElement>();
const newName = ref("");
const addError = ref("");

const issues = computed(() => validateMembers(props.modelValue));
const errorOf = (id: string) =>
  issues.value.empty.has(id)
    ? t("members.errorEmpty")
    : issues.value.duplicate.has(id)
      ? t("members.errorDuplicate")
      : "";

// Only members already saved in the book can have records. Checked explicitly:
// memberRecordCount counts legacy "all" splits for ANY id, which would lock a
// row the user just added (and not yet saved) in such a book.
const savedIds = computed(
  () =>
    new Set(
      store.books
        .find((b) => b.id === props.bookId)
        ?.members.map((m) => m.id) ?? [],
    ),
);
const recordCount = (id: string) =>
  !savedIds.value.has(id)
    ? 0
    : props.bookId
      ? memberRecordCount(store.records, props.bookId, id)
      : 0;
const hasSelf = computed(() =>
  props.modelValue.some((m) => isSelf(m, store.userProfile)),
);

/** Links an unlinked member to this user (joined without picking one, or a legacy book). */
const claim = (id: string) =>
  emit(
    "update:modelValue",
    props.modelValue.map((m) =>
      m.id === id ? { ...m, userId: store.userProfile.memberId } : m,
    ),
  );

const hasLocked = computed(() =>
  props.modelValue.some((m) => recordCount(m.id) > 0),
);

const rename = (id: string, name: string) =>
  emit(
    "update:modelValue",
    props.modelValue.map((m) => (m.id === id ? { ...m, name } : m)),
  );

const remove = (id: string) =>
  emit(
    "update:modelValue",
    props.modelValue.filter((m) => m.id !== id),
  );

const add = () => {
  const name = newName.value.trim();
  if (!name) return;
  if (hasDuplicateName(props.modelValue, name)) {
    addError.value = t("members.errorDuplicate");
    return;
  }
  emit("update:modelValue", [
    ...props.modelValue,
    { id: crypto.randomUUID(), name },
  ]);
  newName.value = "";
  addInput.value?.focus();
};

/**
 * Adds a name left in the "add" field (the user typed it and hit Save without
 * pressing Add). Returns false if it can't be added (duplicate), so the caller
 * doesn't save and the error stays visible.
 */
const flushPending = (): boolean => {
  if (!newName.value.trim()) return true;
  add();
  return !newName.value.trim();
};

defineExpose({ flushPending });

const onAddEnter = (event: KeyboardEvent) => {
  // Enter that commits IME composition (Chinese/Japanese input) is not "add".
  if (event.isComposing || event.keyCode === 229) return;
  // Ctrl/⌘+Enter is the global "save" shortcut; let it through.
  if (event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  add();
};
</script>
