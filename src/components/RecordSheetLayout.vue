<template>
  <Teleport to="body">
    <transition :name="store.userProfile.animations ? 'fade' : ''">
      <div
        v-if="modelValue"
      class="fixed inset-0 z-50 flex flex-col justify-end"
      @click.self="close"
    >
      <!-- 1. Background (Top Area): dim, tap to dismiss.
           This used to host the category grid, but the sheet below can grow to
           90vh and leave it a sliver, so the grid was hard to hit and a mis-tap
           dismissed the sheet. Category selection moved to CategoryPickerSheet. -->
      <div
        class="flex-1 w-full bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        @click="close"
      ></div>

      <!-- 2. Foreground (Bottom Sheet): Form Panel -->
      <div
        class="animate-slide-up relative w-full bg-white pb-safe transition-colors dark:bg-gray-900 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
        :style="{ maxHeight: maxHeight }"
      >
        <div class="mx-auto w-full max-w-md flex flex-col h-full px-6 py-5">
          <!-- Handle -->
          <div class="absolute -top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/50 backdrop-blur-md dark:bg-gray-600/50"></div>

          <!-- Header -->
          <div class="mb-5 flex items-center justify-between gap-4 shrink-0 overflow-hidden">
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-bold truncate text-gray-800 dark:text-gray-200">{{ title }}</h2>
              <p v-if="subtitle" class="text-[11px] font-medium truncate text-gray-500 mt-0.5">{{ subtitle }}</p>
            </div>
            <slot name="header-actions" />
          </div>

          <!-- Scrollable Body  -->
          <div class="overflow-y-auto no-scrollbar flex-1 -mx-2 px-2 pb-2">
            <slot />
          </div>
        </div>
      </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useTrackerStore } from "../stores/tracker";
import { useEscapeKey } from "../composables/useEscapeKey";

interface Props {
  modelValue: boolean;
  title: string;
  subtitle?: string;
  maxHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: "90vh",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const store = useTrackerStore();

const close = () => emit("update:modelValue", false);

useEscapeKey(toRef(props, "modelValue"), close);
</script>

<style scoped>
.pb-safe {
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
}
</style>
