<template>
  <button
    type="button"
    class="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
    :class="{ 'border-t border-gray-50 dark:border-gray-700': !isFirst }"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-3">
      <div :class="['flex h-10 w-10 items-center justify-center rounded-xl', colorClasses]">
        <CategoryIcon :name="iconName" class="h-5 w-5" />
      </div>
      <span class="font-bold text-gray-700 dark:text-gray-200">{{ title }}</span>
    </div>
    <div class="flex items-center gap-2">
      <slot name="right"></slot>
      <svg class="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </button>
</template>

<script setup lang="ts">
import CategoryIcon from "./CategoryIcon.vue";

defineProps<{
  title: string;
  iconName: string;
  colorClasses: string;
  isFirst?: boolean;
}>();

defineEmits<{
  (e: "click"): void;
}>();
</script>
