<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
        <section
          class="animate-slide-up w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl transition-colors dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
        >
          <div class="mb-4 flex justify-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <span class="material-symbols-outlined text-3xl text-blue-500" aria-hidden="true">cloud_upload</span>
            </div>
          </div>

          <h2 :id="titleId" class="mb-2 text-xl font-black dark:text-white">{{ $t("books.share.title") }}</h2>

          <p :id="descriptionId" class="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {{ $t("books.share.description") }}
          </p>

          <div class="mb-8 rounded-xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
            <p class="select-all font-mono text-4xl font-bold tracking-[0.2em] text-gray-900 dark:text-gray-100">
              {{ shareCode }}
            </p>
          </div>

          <button
            type="button"
            @click="copyCode"
            class="mb-3 flex w-full items-center justify-center gap-2 btn-primary"
          >
            <span class="material-symbols-outlined text-sm" aria-hidden="true">{{ copied ? "check" : "content_copy" }}</span>
            {{ copied ? $t("books.share.copied") : $t("books.share.copyCode") }}
          </button>

          <button
            type="button"
            @click="close"
            class="w-full btn-ghost"
          >
            {{ $t("books.share.close") }}
          </button>

          <p class="sr-only" aria-live="polite">
            {{ copied ? $t("books.share.copied") : "" }}
          </p>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, useId, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  shareCode: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
}>();

const copied = ref(false);
const baseId = useId();
const titleId = `${baseId}-title`;
const descriptionId = `${baseId}-description`;

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      copied.value = false;
    }
  },
);

const close = () => {
  emit("update:modelValue", false);
};

const copyCode = async () => {
  if (!props.shareCode) return;
  try {
    await navigator.clipboard.writeText(props.shareCode);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
    prompt("Copy the code manually:", props.shareCode);
  }
};
</script>
