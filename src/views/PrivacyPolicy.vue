<template>
  <div class="page-container bg-white dark:bg-gray-950">
    <header class="header-nav sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      <button
        type="button"
        class="mr-3 rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Go back"
        @click="router.back()"
      >
        <CategoryIcon name="arrow_back" class="text-2xl" />
      </button>
      <h1 class="text-lg font-black tracking-tight text-gray-900 dark:text-white">
        {{ $t("privacy.title") }}
      </h1>
    </header>

    <main class="px-6 py-8">
      <div class="mb-8">
        <p class="text-sm font-medium text-gray-400 dark:text-gray-500">
          {{ $t("privacy.lastUpdated") }}
        </p>
        <p class="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {{ $t("privacy.intro") }}
        </p>
      </div>

      <article class="space-y-8">
        <section>
          <h2 class="mb-3 text-base font-black text-gray-900 dark:text-white">
            {{ $t("privacy.dataCollection.title") }}
          </h2>
          <ul class="space-y-3">
            <li class="flex gap-3">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true"></span>
              <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {{ $t("privacy.dataCollection.google") }}
              </p>
            </li>
            <li class="flex gap-3">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true"></span>
              <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {{ $t("privacy.dataCollection.records") }}
              </p>
            </li>
          </ul>
        </section>

        <section>
          <h2 class="mb-3 text-base font-black text-gray-900 dark:text-white">
            {{ $t("privacy.localStorage.title") }}
          </h2>
          <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {{ $t("privacy.localStorage.content") }}
          </p>
        </section>

        <section>
          <h2 class="mb-3 text-base font-black text-gray-900 dark:text-white">
            {{ $t("privacy.dataSecurity.title") }}
          </h2>
          <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {{ $t("privacy.dataSecurity.content") }}
          </p>
        </section>

        <section>
          <h2 class="mb-3 text-base font-black text-gray-900 dark:text-white">
            {{ $t("privacy.userRights.title") }}
          </h2>
          <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {{ $t("privacy.userRights.content") }}
          </p>
        </section>

        <section>
          <h2 class="mb-3 text-base font-black text-gray-900 dark:text-white">
            {{ $t("privacy.contact.title") }}
          </h2>
          <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {{ $t("privacy.contact.content") }}
          </p>
        </section>
      </article>

      <div class="mt-12 pb-8">
        <button
          type="button"
          class="w-full rounded-2xl border border-gray-200 py-4 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
          @click="router.back()"
        >
          {{ $t("privacy.back") }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import CategoryIcon from "../components/CategoryIcon.vue";

const router = useRouter();
</script>
