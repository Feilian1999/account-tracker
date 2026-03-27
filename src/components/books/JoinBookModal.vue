<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
        <div class="animate-slide-up w-full max-w-sm rounded-2xl bg-white p-6 transition-colors dark:bg-gray-900 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-xl font-bold dark:text-white">{{ $t("books.join.title") }}</h2>
            <button @click="close" class="btn-ghost" :disabled="loading">
              <span class="material-symbols-outlined shrink-0 text-xl">close</span>
            </button>
          </div>

          <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {{ $t("books.join.description") }}
          </p>

          <form @submit.prevent="submit" class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ $t("books.join.codeLabel") }}</label>
              <input
                v-model="code"
                type="text"
                required
                class="input-field uppercase text-center tracking-widest text-xl font-mono"
                :placeholder="$t('books.join.codePlaceholder')"
                maxlength="6"
                :disabled="loading"
              />
            </div>

            <p v-if="errorMsg" class="text-sm text-red-500 font-medium">{{ errorMsg }}</p>

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
                <span v-if="loading" class="material-symbols-outlined mr-1 animate-spin text-sm">progress_activity</span>
                {{ $t("books.join.joinBtn") }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
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
  }
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
