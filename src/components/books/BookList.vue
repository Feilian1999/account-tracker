<template>
  <div>
    <div
      class="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pb-6 pt-10 shadow-lg"
    >
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-white">{{ $t("books.title") }}</h1>
        <button @click="$emit('join')" class="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/30">
          <span class="material-symbols-outlined text-sm">cloud_download</span>
          <span>加入共用</span>
        </button>
      </div>
      <p class="mt-1 text-sm text-blue-200">{{ $t("books.subtitle") }}</p>
    </div>

    <div class="mt-4 px-4">
      <div v-if="store.books.length > 0" class="mb-4 space-y-3">
        <div
          v-for="book in store.books"
          :key="book.id"
          @click="$emit('select', book.id)"
          class="flex cursor-pointer items-center rounded-2xl border-2 border-transparent bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700"
        >
          <div
            class="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-900/30"
          >
            📒
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="section-title truncate">{{ book.name }}</p>
              <span v-if="book.shareCode" class="material-symbols-outlined shrink-0 text-sm text-blue-500" title="共用帳本">cloud_done</span>
            </div>
            <p class="hint-text mt-0.5">
              {{ book.members.map((m) => m.name).join("・") }}
            </p>
          </div>
          <svg
            class="ml-2 h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="mb-3 text-5xl opacity-80">📭</div>
        <p class="font-bold">{{ $t("books.noBooks") }}</p>
        <p class="mt-1 text-sm">{{ $t("books.createBookHint") }}</p>
      </div>
    </div>

    <DraggableFab color="blue" @click="$emit('add')" />
  </div>
</template>

<script setup lang="ts">
import { useTrackerStore } from "../../stores/tracker";
import DraggableFab from "../DraggableFab.vue";

const store = useTrackerStore();

defineEmits<{
  (e: "select", id: string): void;
  (e: "add"): void;
  (e: "join"): void;
}>();
</script>
