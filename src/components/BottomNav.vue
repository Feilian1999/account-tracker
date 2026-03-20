<template>
  <div
    class="fixed bottom-0 left-0 z-50 h-16 w-full border-t border-gray-100 bg-white shadow-lg transition-colors dark:border-gray-800 dark:bg-gray-900"
  >
    <div class="mx-auto grid h-full max-w-md grid-cols-4">
      <!-- Home (Personal Details) -->
      <router-link
        to="/"
        class="group flex flex-col items-center justify-center gap-0.5"
      >
        <svg
          :class="navIconClass('/')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span :class="navLabelClass('/')">{{ $t("nav.home") }}</span>
      </router-link>

      <!-- Books -->
      <router-link
        to="/books"
        class="group flex flex-col items-center justify-center gap-0.5"
      >
        <svg
          :class="navIconClass('/books')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <span :class="navLabelClass('/books')">{{ $t("nav.books") }}</span>
      </router-link>

      <!-- Statistics -->
      <router-link
        to="/statistics"
        class="group flex flex-col items-center justify-center gap-0.5"
      >
        <svg
          :class="navIconClass('/statistics')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span :class="navLabelClass('/statistics')">{{ $t("nav.statistics") }}</span>
      </router-link>

      <!-- Profile (Me) -->
      <router-link
        to="/profile"
        class="group flex flex-col items-center justify-center gap-0.5"
      >
        <svg
          :class="navIconClass('/profile')"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span :class="navLabelClass('/profile')">{{ $t("nav.profile") }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

const navIconClass = (path: string) => [
  "h-6 w-6 mb-1 transition-all duration-300",
  route.path === path
    ? "text-indigo-600 dark:text-indigo-400 scale-110"
    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300",
];

const navLabelClass = (path: string) => [
  "text-[10px] font-medium transition-colors",
  route.path === path
    ? "text-indigo-600 dark:text-indigo-400 font-bold"
    : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300",
];
</script>
