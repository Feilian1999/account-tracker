<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
        <div class="animate-slide-up w-full max-w-sm rounded-2xl bg-white p-6 text-center transition-colors dark:bg-gray-900 shadow-xl">
          <div class="mb-4 flex justify-center">
            <div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-3xl text-blue-500">cloud_upload</span>
            </div>
          </div>
          
          <h2 class="text-xl font-black dark:text-white mb-2">{{ $t("books.share.title") }}</h2>
          
          <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {{ $t("books.share.description") }}
          </p>

          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8 border border-gray-100 dark:border-gray-700">
            <p class="text-4xl font-mono font-bold tracking-[0.2em] text-gray-900 dark:text-gray-100 select-all">
              {{ shareCode }}
            </p>
          </div>

          <button
            @click="copyCode"
            class="w-full btn-primary mb-3 flex justify-center items-center gap-2"
          >
            <span class="material-symbols-outlined text-sm">{{ copied ? 'check' : 'content_copy' }}</span>
            {{ copied ? $t("books.share.copied") : $t("books.share.copyCode") }}
          </button>
          
          <button
            @click="close"
            class="w-full btn-ghost"
          >
            {{ $t("books.share.close") }}
          </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  shareCode: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
}>();

const copied = ref(false);

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      copied.value = false;
    }
  }
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
    prompt("請手動複製代碼:", props.shareCode);
  }
};
</script>
