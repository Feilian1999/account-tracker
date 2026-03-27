<template>
  <div class="flex min-h-screen flex-col bg-gray-50 pt-12 dark:bg-gray-900">
    <main class="flex flex-grow flex-col items-center px-6">
      <header class="mb-8 h-32 w-32 overflow-hidden rounded-3xl shadow-2xl shadow-violet-500/20 transition duration-300 hover:scale-105">
        <img src="/magic-sheep.png" alt="Account Tracker app icon" class="h-full w-full object-cover" />
      </header>

      <section class="mb-12 w-full max-w-md space-y-4 text-center" aria-labelledby="landing-title">
        <h1 id="landing-title" class="text-4xl font-black tracking-tight text-gray-900 dark:text-gray-100">
          {{ $t("landing.title") }}
        </h1>
        <h2 class="text-xl font-medium text-violet-600 dark:text-violet-400">
          {{ $t("landing.subtitle") }}
        </h2>
        <p class="mt-4 leading-relaxed text-gray-500 dark:text-gray-400">
          {{ $t("landing.description") }}
        </p>
      </section>

      <section class="mb-12 w-full max-w-md" aria-labelledby="landing-features-title">
        <h2 id="landing-features-title" class="sr-only">Features</h2>
        <ul class="space-y-4">
          <li class="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700/50 dark:bg-gray-800">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <span class="material-symbols-outlined text-blue-500 dark:text-blue-400" aria-hidden="true">person</span>
            </div>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ $t("landing.features.personal") }}</span>
          </li>
          <li class="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700/50 dark:bg-gray-800">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20">
              <span class="material-symbols-outlined text-green-500 dark:text-green-400" aria-hidden="true">group</span>
            </div>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ $t("landing.features.group") }}</span>
          </li>
          <li class="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700/50 dark:bg-gray-800">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <span class="material-symbols-outlined text-amber-500 dark:text-amber-400" aria-hidden="true">cloud_sync</span>
            </div>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ $t("landing.features.sync") }}</span>
          </li>
        </ul>
      </section>

      <section class="mb-10 mt-auto w-full max-w-md">
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 font-bold text-white shadow-lg shadow-violet-600/20 transition active:scale-95 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
          @click="goToLogin"
        >
          <span>{{ $t("landing.getStarted") }}</span>
          <span class="material-symbols-outlined text-xl" aria-hidden="true">arrow_forward</span>
        </button>
      </section>
    </main>

    <footer class="w-full border-t border-gray-200 bg-white/50 py-6 text-center backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/50">
      <nav class="flex items-center justify-center gap-6 text-sm" aria-label="Legal links">
        <router-link to="/privacy" class="font-medium text-gray-500 transition hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">
          {{ $t("privacy.title") }}
        </router-link>
        <span class="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden="true"></span>
        <router-link to="/terms" class="font-medium text-gray-500 transition hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400">
          {{ $t("terms.title") }}
        </router-link>
      </nav>
      <p class="mt-4 text-xs text-gray-400 dark:text-gray-500">
        &copy; {{ new Date().getFullYear() }} Account Tracker. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTrackerStore } from "../stores/tracker";

const router = useRouter();
const store = useTrackerStore();

onMounted(() => {
  if (store.userProfile.isLoggedIn && store.isProfileSet) {
    router.replace("/dashboard");
  }
});

const goToLogin = () => {
  router.push("/login");
};
</script>
