<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
        <section
          class="animate-slide-up w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl transition-colors dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
        >
          <div class="mb-4 flex items-center justify-between">
            <h2 :id="titleId" class="text-xl font-bold dark:text-white">{{ $t("books.join.title") }}</h2>
            <button type="button" @click="close" class="btn-ghost" :disabled="loading" :aria-label="$t('books.share.close')">
              <span class="material-symbols-outlined shrink-0 text-xl" aria-hidden="true">close</span>
            </button>
          </div>

          <p :id="descriptionId" class="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {{ $t("books.join.description") }}
          </p>

          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label :for="codeInputId" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t("books.join.codeLabel") }}</label>
              <input
                :id="codeInputId"
                v-model="code"
                type="text"
                required
                class="input-field text-center font-mono text-xl tracking-widest uppercase"
                :placeholder="$t('books.join.codePlaceholder')"
                maxlength="6"
                :disabled="loading"
                autocomplete="off"
              />
            </div>

            <p v-if="errorMsg" class="text-sm font-medium text-red-500" aria-live="polite">{{ errorMsg }}</p>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                @click="close"
                class="btn-secondary"
                :disabled="loading"
              >
                {{ $t("common.cancel") }}
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="!isValid || loading"
              >
                <span v-if="loading" class="material-symbols-outlined mr-1 animate-spin text-sm" aria-hidden="true">progress_activity</span>
                {{ $t("books.join.joinBtn") }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useTrackerStore } from "../../stores/tracker";

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

const isValid = computed(() => code.value.trim().length === 6);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      code.value = "";
      errorMsg.value = "";
      loading.value = false;
    }
  },
);

const close = () => {
  if (loading.value) return;
  emit("update:modelValue", false);
};

const submit = async () => {
  if (!isValid.value || loading.value) return;

  loading.value = true;
  errorMsg.value = "";

  try {
    const uppercaseCode = code.value.trim().toUpperCase();
    const newBook = await store.joinBookByCode(uppercaseCode);
    if (newBook) {
      emit("joined", newBook.id);
      close();
    }
  } catch (err: any) {
    if (err.response?.status === 404) {
      errorMsg.value = t("books.join.notFound");
    } else {
      errorMsg.value = t("books.join.error");
    }
  } finally {
    loading.value = false;
  }
};
</script>
