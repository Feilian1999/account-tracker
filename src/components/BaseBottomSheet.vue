<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex flex-col justify-end"
      @click.self="close"
    >
      <div
        class="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]"
        aria-hidden="true"
        @click="close"
      ></div>

      <section
        class="animate-slide-up relative flex max-w-full flex-col overflow-hidden bg-white shadow-2xl transition-colors dark:bg-gray-900"
        :class="[maxHeight, roundedClass]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="subtitle ? subtitleId : undefined"
        @keydown.esc="close"
      >
        <div class="z-10 flex shrink-0 items-center justify-between border-b border-gray-50 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-800">
          <div class="min-w-0 flex-1">
            <h2 :id="titleId" class="truncate text-xl font-bold text-gray-800 dark:text-gray-100">{{ title }}</h2>
            <p v-if="subtitle" :id="subtitleId" class="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{{ subtitle }}</p>
          </div>
          <CloseButton label="Close sheet" @click="close" class="ml-4 shrink-0" />
        </div>

        <div class="custom-scrollbar min-h-0 flex-1 overflow-y-auto" :class="contentClass">
          <slot></slot>
        </div>

        <div v-if="$slots.footer" class="z-10 shrink-0 border-t border-gray-100 bg-white p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:border-gray-700 dark:bg-gray-800">
          <slot name="footer"></slot>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useId } from "vue";
import CloseButton from "./CloseButton.vue";

interface Props {
  modelValue: boolean;
  title: string;
  subtitle?: string;
  maxHeight?: string;
  roundedClass?: string;
  contentClass?: string;
}

withDefaults(defineProps<Props>(), {
  maxHeight: "max-h-[90vh]",
  roundedClass: "rounded-t-3xl",
  contentClass: "px-4 py-6",
});

const emit = defineEmits(["update:modelValue", "close"]);
const baseId = useId();
const titleId = `${baseId}-title`;
const subtitleId = `${baseId}-subtitle`;

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};
</script>

<style scoped>
.pb-safe {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}
</style>
