<template>
  <nav
    class="fixed bottom-0 left-0 z-50 w-full border-t border-gray-100 bg-white shadow-lg transition-colors dark:border-gray-800 dark:bg-gray-900"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Primary navigation"
  >
    <ul class="mx-auto grid h-16 max-w-md grid-cols-4">
      <li class="flex">
        <router-link
          to="/dashboard"
          class="group flex w-full flex-col items-center justify-center gap-0.5"
          :aria-current="route.path === '/dashboard' ? 'page' : undefined"
        >
          <span :class="navIconClass('/dashboard')" class="material-symbols-outlined">account_balance_wallet</span>
          <span :class="navLabelClass('/dashboard')">{{ $t("nav.home") }}</span>
        </router-link>
      </li>

      <li class="flex">
        <router-link
          to="/books"
          class="group flex w-full flex-col items-center justify-center gap-0.5"
          :aria-current="route.path === '/books' ? 'page' : undefined"
        >
          <span :class="navIconClass('/books')" class="material-symbols-outlined">menu_book</span>
          <span :class="navLabelClass('/books')">{{ $t("nav.books") }}</span>
        </router-link>
      </li>

      <li class="flex">
        <router-link
          to="/statistics"
          class="group flex w-full flex-col items-center justify-center gap-0.5"
          :aria-current="route.path === '/statistics' ? 'page' : undefined"
        >
          <span :class="navIconClass('/statistics')" class="material-symbols-outlined">leaderboard</span>
          <span :class="navLabelClass('/statistics')">{{ $t("nav.statistics") }}</span>
        </router-link>
      </li>

      <li class="flex">
        <router-link
          to="/profile"
          class="group flex w-full flex-col items-center justify-center gap-0.5"
          :aria-current="route.path === '/profile' ? 'page' : undefined"
        >
          <span :class="navIconClass('/profile')" class="material-symbols-outlined">settings_account_box</span>
          <span :class="navLabelClass('/profile')">{{ $t("nav.profile") }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

const navIconClass = (path: string) => [
  "mb-1 text-2xl transition-all duration-300",
  route.path === path
    ? "scale-110 text-indigo-600 dark:text-indigo-400"
    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300",
];

const navLabelClass = (path: string) => [
  "text-[10px] font-medium transition-colors",
  route.path === path
    ? "font-bold text-indigo-600 dark:text-indigo-400"
    : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300",
];
</script>
