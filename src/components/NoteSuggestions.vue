<template>
  <div
    v-if="notes.length"
    role="group"
    :aria-label="$t('recordSheet.noteSuggestions')"
    class="-mt-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <button
      v-for="note in notes"
      :key="note"
      type="button"
      :title="note"
      class="max-w-[10rem] shrink-0 truncate rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600"
      @click="$emit('select', note)"
    >
      {{ note }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ notes: string[] }>();
defineEmits<{ (e: "select", note: string): void }>();
</script>
