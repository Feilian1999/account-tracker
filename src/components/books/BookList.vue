<template>
  <section aria-labelledby="books-list-heading">
    <header class="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pb-6 pt-10 shadow-lg">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 id="books-list-heading" class="text-2xl font-bold text-white">{{ $t("books.title") }}</h1>
          <p class="mt-1 text-sm text-blue-200">{{ $t("books.subtitle") }}</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-white/30"
          @click="$emit('join')"
        >
          <span class="material-symbols-outlined text-sm" aria-hidden="true">cloud_download</span>
          <span>{{ $t("books.join.title") }}</span>
        </button>
      </div>
    </header>

    <div class="mt-4 px-4 pb-24">
      <ul v-if="store.books.length > 0" class="mb-4 space-y-3" aria-label="Books">
        <li v-for="book in store.books" :key="book.id">
          <button
            type="button"
            class="flex w-full items-center rounded-2xl border-2 border-transparent bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-700"
            @click="$emit('select', book.id)"
          >
            <div
              class="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl dark:bg-blue-900/30"
              aria-hidden="true"
            >
              📒
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <p class="section-title truncate">{{ book.name }}</p>
                <span
                  v-if="book.shareCode"
                  class="material-symbols-outlined shrink-0 text-sm text-blue-500"
                  :title="$t('books.share.title')"
                  aria-hidden="true"
                >
                  cloud_done
                </span>
              </div>
              <p class="hint-text mt-0.5">
                {{ book.members.map((member) => member.name).join(" · ") }}
              </p>
            </div>
            <svg
              class="ml-2 h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </li>
      </ul>

      <div v-else class="empty-state" aria-live="polite">
        <div class="mb-3 text-5xl opacity-80" aria-hidden="true">📭</div>
        <p class="font-bold">{{ $t("books.noBooks") }}</p>
        <p class="mt-1 text-sm">{{ $t("books.createBookHint") }}</p>
      </div>
    </div>

    <DraggableFab color="blue" @click="$emit('add')" />
  </section>
</template>

<script setup lang="ts">
import DraggableFab from "../DraggableFab.vue";
import { useTrackerStore } from "../../stores/tracker";

const store = useTrackerStore();

defineEmits<{
  (e: "select", id: string): void;
  (e: "add"): void;
  (e: "join"): void;
}>();
</script>
