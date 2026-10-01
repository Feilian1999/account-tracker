<template>
  <Teleport to="body">
    <transition :name="store.userProfile.animations ? 'fade' : ''">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
        <section
          class="animate-slide-up flex max-h-[90vh] w-full max-w-sm flex-col rounded-2xl bg-white p-6 shadow-xl transition-colors dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 :id="titleId" class="text-xl font-bold dark:text-white">
              {{ preview ? $t("members.whoAreYou") : $t("books.join.title") }}
            </h2>
            <button type="button" @click="close" class="btn-ghost" :disabled="loading" :aria-label="$t('books.share.close')">
              <span class="material-symbols-outlined shrink-0 text-xl" aria-hidden="true">close</span>
            </button>
          </div>

          <!-- Step 1: code -->
          <template v-if="!preview">
            <p :id="descriptionId" class="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {{ $t("books.join.description") }}
            </p>

            <form @submit.prevent="submitCode" class="space-y-4">
              <div>
                <label :for="codeInputId" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t("books.join.codeLabel") }}</label>
                <input
                  :id="codeInputId"
                  v-model="code"
                  type="text"
                  required
                  class="input-field text-center font-mono text-xl tracking-widest uppercase"
                  :placeholder="$t('books.join.codePlaceholder')"
                  maxlength="8"
                  :disabled="loading"
                  autocomplete="off"
                />
              </div>

              <p v-if="errorMsg" class="text-sm font-medium text-red-500" aria-live="polite">{{ errorMsg }}</p>

              <div class="flex justify-end gap-2 pt-2">
                <button type="button" @click="close" class="btn-secondary" :disabled="loading">
                  {{ $t("common.cancel") }}
                </button>
                <button type="submit" class="btn-primary" :disabled="!isValid || loading">
                  <span v-if="loading" class="material-symbols-outlined mr-1 animate-spin text-sm" aria-hidden="true">progress_activity</span>
                  {{ $t("books.join.joinBtn") }}
                </button>
              </div>
            </form>
          </template>

          <!-- Step 2: pick which existing member you are (joining never adds one) -->
          <template v-else>
            <p :id="descriptionId" class="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {{ $t("members.whoAreYouHint", { name: preview.book.name }) }}
            </p>

            <div
              class="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 py-1"
              role="radiogroup"
              :aria-label="$t('members.whoAreYou')"
            >
              <button
                v-for="member in activeMembers(preview.book.members)"
                :key="member.id"
                type="button"
                role="radio"
                :aria-checked="selectedId === member.id"
                :disabled="!!member.userId || loading"
                class="flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                :class="
                  selectedId === member.id
                    ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-900/20'
                    : 'border-gray-100 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700'
                "
                @click="selectedId = member.id"
              >
                <MemberAvatar :name="member.name" :seed="member.id" />
                <span class="min-w-0 flex-1 truncate font-bold text-gray-800 dark:text-gray-100">{{ member.name }}</span>
                <span
                  v-if="member.userId"
                  class="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                >
                  {{ $t("members.joined") }}
                </span>
                <span
                  v-else-if="selectedId === member.id"
                  class="material-symbols-outlined shrink-0 text-violet-600 dark:text-violet-400"
                  style="font-size: 22px"
                  aria-hidden="true"
                  >check_circle</span
                >
              </button>
            </div>

            <p v-if="errorMsg" class="mt-3 text-sm font-medium text-red-500" aria-live="polite">{{ errorMsg }}</p>

            <div class="mt-4 space-y-2">
              <button
                type="button"
                class="btn-primary flex w-full items-center justify-center"
                :disabled="!selectedId || loading"
                @click="join(selectedId)"
              >
                <span v-if="loading" class="material-symbols-outlined mr-1 animate-spin text-sm" aria-hidden="true">progress_activity</span>
                {{ selectedMember ? $t("members.joinAs", { name: selectedMember.name }) : $t("members.pickYourself") }}
              </button>
              <button type="button" class="w-full py-2 text-sm font-semibold text-gray-500 dark:text-gray-400" :disabled="loading" @click="join(null)">
                {{ $t("members.notInList") }}
              </button>
              <button type="button" class="w-full text-xs font-medium text-gray-400 dark:text-gray-500" :disabled="loading" @click="backToCode">
                {{ $t("members.reenterCode") }}
              </button>
            </div>
          </template>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../../stores/tracker";
import type { SharedBookPreview } from "../../stores/books";
import { activeMembers } from "../../utils/member";
import { useEscapeKey } from "../../composables/useEscapeKey";
import MemberAvatar from "../MemberAvatar.vue";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "joined", bookId: string): void;
}>();

const { t } = useI18n();
const store = useTrackerStore();
const baseId = useId();
const titleId = `${baseId}-title`;
const descriptionId = `${baseId}-description`;
const codeInputId = `${baseId}-code`;
const code = ref("");
const loading = ref(false);
const errorMsg = ref("");
const preview = ref<SharedBookPreview | null>(null);
const selectedId = ref<string | null>(null);

const isValid = computed(() => {
  const len = code.value.trim().length;
  return len >= 6 && len <= 8;
});

const selectedMember = computed(
  () => preview.value?.book.members.find((m) => m.id === selectedId.value) ?? null,
);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      code.value = "";
      errorMsg.value = "";
      loading.value = false;
      preview.value = null;
      selectedId.value = null;
    }
  },
);

const close = () => {
  if (loading.value) return;
  emit("update:modelValue", false);
};

useEscapeKey(toRef(props, "modelValue"), close);

const join = async (claimMemberId: string | null) => {
  if (!preview.value || loading.value) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    const newBook = await store.joinSharedBook(
      code.value.trim().toUpperCase(),
      preview.value,
      claimMemberId,
    );
    if (newBook) {
      loading.value = false;
      close();
      emit("joined", newBook.id);
    }
  } catch {
    errorMsg.value = t("books.join.error");
  } finally {
    loading.value = false;
  }
};

const submitCode = async () => {
  if (!isValid.value || loading.value) return;
  loading.value = true;
  errorMsg.value = "";
  try {
    const data = await store.previewSharedBook(code.value.trim().toUpperCase());
    // Already a member on this device (rejoining) — nothing to choose.
    if (store.findSelfMember(data.book)) {
      preview.value = data;
      loading.value = false;
      await join(null);
      return;
    }
    preview.value = data;
    // Suggest (never auto-claim) the unlinked member with the user's name.
    const myName = store.userProfile.name.trim().toLowerCase();
    selectedId.value =
      activeMembers(data.book.members).find(
        (m) => !m.userId && m.name.trim().toLowerCase() === myName,
      )?.id ??
      null;
  } catch (err: any) {
    errorMsg.value =
      err?.response?.status === 404 ? t("books.join.notFound") : t("books.join.error");
  } finally {
    loading.value = false;
  }
};

const backToCode = () => {
  preview.value = null;
  selectedId.value = null;
  errorMsg.value = "";
};
</script>
