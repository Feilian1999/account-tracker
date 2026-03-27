<template>
  <button
    type="button"
    :aria-label="label"
    class="rounded-full bg-gray-100 p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-700 dark:text-gray-500 dark:hover:bg-gray-600 dark:hover:text-gray-300"
    @click="$emit('click')"
  >
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
  }>(),
  {
    label: "Close",
  },
);

defineEmits(["click"]);
</script>
