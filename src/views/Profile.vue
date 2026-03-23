```html
<template>
  <div class="page-container">
    <!-- Header -->
    <div
      class="rounded-b-3xl bg-gradient-to-br from-indigo-500 to-purple-600 px-6 pb-8 pt-10 text-white shadow-lg"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold backdrop-blur-sm"
        >
          {{ store.userProfile.name.charAt(0) }}
        </div>
        <div>
          <h1 class="text-2xl font-bold">{{ store.userProfile.name }}</h1>
          <p class="text-indigo-200">{{ $t("profile.settingsTitle") }}</p>
        </div>
      </div>
    </div>

    <div class="mt-6 space-y-4 px-4">
      <div
        class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all dark:border-gray-800 dark:bg-gray-800"
      >
        <!-- Theme Setting -->
        <div
          class="flex items-center justify-between border-b border-gray-50 p-4 transition-colors dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-900/30"
            >
              <CategoryIcon name="routine" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.themeSet") }}</span>
          </div>

          <button
            type="button"
            @click="toggleTheme"
            :class="[
              isDark ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600',
              'relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none',
            ]"
          >
            <span class="sr-only">切換主題</span>
            <span
              :class="[
                isDark ? 'translate-x-[26px]' : 'translate-x-[2px]',
                'pointer-events-none flex h-[24px] w-[24px] transform items-center justify-center rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out',
              ]"
            >
              <CategoryIcon
                :name="isDark ? 'dark_mode' : 'light_mode'"
                :class="[
                  isDark ? 'text-indigo-500' : 'text-orange-500',
                  'flex items-center justify-center text-[15px] leading-none',
                ]"
              />
            </span>
          </button>
        </div>

        <!-- Category Setting -->
        <button
          @click="showCategorySettings = true"
          class="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/30"
            >
              <CategoryIcon name="category" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.categorySet") }}</span>
          </div>
          <svg
            class="h-5 w-5 text-gray-300 dark:text-gray-600"
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
        </button>

        <!-- Template Setting -->
        <button
          @click="showTemplateSettings = true"
          class="flex w-full items-center justify-between border-t border-gray-50 p-4 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-900/30"
            >
              <CategoryIcon name="receipt_long" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.templateSet") }}</span>
          </div>
          <svg
            class="h-5 w-5 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <!-- Language Setting -->
        <button @click="showLangSheet = true" class="flex w-full cursor-pointer items-center justify-between border-t border-gray-50 p-4 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700/50 dark:active:bg-gray-700">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-900/30">
              <CategoryIcon name="language" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.languageSet") }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-gray-500 dark:text-gray-400">
              {{ langNameMap[$i18n.locale as keyof typeof langNameMap] || 'English' }}
            </span>
            <svg
              class="h-5 w-5 text-gray-300 dark:text-gray-600"
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
        </button>

        <!-- Login Setting -->
        <button @click="router.push('/login')" class="flex w-full cursor-pointer items-center justify-between border-t border-gray-50 p-4 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700/50 dark:active:bg-gray-700">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30">
              <CategoryIcon name="login" class="h-5 w-5" />
            </div>
            <span class="font-bold text-gray-700 dark:text-gray-200">{{ $t("profile.login") }}</span>
          </div>
          <svg class="h-5 w-5 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Category Settings Modal -->
    <CategorySettingsModal
      v-if="showCategorySettings"
      @close="showCategorySettings = false"
    />

    <!-- Template Settings Modal -->
    <TemplateSettingsModal v-model="showTemplateSettings" />

    <!-- Language Selection Sheet -->
    <Teleport to="body">
      <div v-if="showLangSheet" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" @click.self="showLangSheet = false">
        <div class="animate-slide-up w-full max-w-md rounded-t-3xl bg-white p-6 pb-10 shadow-2xl transition-colors dark:bg-gray-900">
          <div class="mb-5 flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200">{{ $t("profile.languageSet") }}</h2>
            <CloseButton @click="showLangSheet = false" />
          </div>
          <div class="space-y-2">
            <button
              v-for="(name, code) in langNameMap"
              :key="code"
              @click="setLanguage(code)"
              :class="[
                'flex w-full items-center justify-between rounded-2xl p-4 font-bold transition-all',
                $i18n.locale === code
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80',
              ]"
            >
              <span>{{ name }}</span>
              <svg v-if="$i18n.locale === code" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useTrackerStore } from "../stores/tracker";
import CategorySettingsModal from "../components/CategorySettingsModal.vue";
import TemplateSettingsModal from "../components/TemplateSettingsModal.vue";
import CategoryIcon from "../components/CategoryIcon.vue";
import CloseButton from "../components/CloseButton.vue";

const { locale } = useI18n();
const router = useRouter();
const store = useTrackerStore();
const showCategorySettings = ref(false);
const showTemplateSettings = ref(false);
const showLangSheet = ref(false);

const langNameMap = {
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
};

const isDark = computed(() => {
  const theme = store.userProfile.theme || "system";
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const toggleTheme = () => {
  store.setTheme(isDark.value ? "light" : "dark");
};

const setLanguage = (code: string | number | symbol) => {
  locale.value = code as string;
  localStorage.setItem("account-tracker-lang", code as string);
  showLangSheet.value = false;
};
</script>
```
