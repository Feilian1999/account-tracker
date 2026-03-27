<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed bottom-20 left-1/2 z-[999] flex -translate-x-1/2 flex-col items-center gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup name="toast">
        <button
          v-for="toast in toasts"
          :key="toast.id"
          type="button"
          :class="[
            'pointer-events-auto flex max-w-xs items-center gap-2.5 rounded-2xl px-5 py-3 shadow-2xl backdrop-blur-lg transition-all',
            typeClasses[toast.type],
          ]"
          :aria-label="toast.message"
          @click="dismiss(toast.id)"
        >
          <span class="material-symbols-outlined shrink-0 text-lg" aria-hidden="true">{{ typeIcon[toast.type] }}</span>
          <span class="text-sm font-medium leading-snug">{{ toast.message }}</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from "../composables/useToast";

const { toasts, dismiss } = useToast();

const typeClasses: Record<string, string> = {
  success: "bg-green-600/90 text-white",
  error: "bg-red-600/90 text-white",
  info: "bg-gray-800/90 text-white dark:bg-gray-200/90 dark:text-gray-900",
  warning: "bg-amber-500/90 text-white",
};

const typeIcon: Record<string, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning",
};
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.21, 1.02, 0.73, 1);
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
</style>
